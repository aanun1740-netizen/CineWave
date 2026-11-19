export type Film = {
  id: string;
  title_en?: string;
  title_ru?: string;
  title_hy?: string;
  overview_en?: string;
  overview_ru?: string;
  overview_hy?: string;
  genre_names?: string[];
  release_date?: string;
  media_type?: string;
};

const genres: Record<string, RegExp> = {
  comedy: /^(comedy|comedies|funny|hilarious|laugh$|humou?r|комед|юмор|смешн|вес[её]л|посмея|կատակերգ|ծիծաղ|խնդա[լց]|զվարճ|հումոր)/u,
  history: /^(histor(y|ic)|историчес|պատմական)/u,
  action: /^(action|боевик|экшен|մարտաֆիլմ)/u,
  drama: /^(drama|sad|cry$|tearjerker|драм|грустн|плакать|поплакать|դրամա|տխուր|լաց)/u,
  horror: /^(horror|scary|ужас|страшн|սարսափ)/u,
  romance: /^(romance|romantic|melodrama|романтич|мелодрам|սիրային|մելոդրամ)/u,
  "sci-fi": /^(scifi|science fiction|фантастик|գիտաֆանտաստիկ)/u,
  animation: /^(animat|cartoons?$|мульт|анимац|անիմացի|մուլտ)/u,
  thriller: /^(thriller|триллер|թրիլեր)/u,
  adventure: /^(adventure|приключен|արկածային)/u,
  family: /^(family|семейн|ընտանեկան)/u,
  documentary: /^(documentar|документал|վավերագր)/u,
  fantasy: /^(fantasy|фэнтези|ֆենթեզի)/u,
  crime: /^(crime|криминал|քրեական)/u,
  war: /^(war$|военн|պատերազմական)/u,
};

const lightMood = /^(funny|hilarious|laugh$|lighthearted|light$|feelgood|смешн|вес[её]л|посмея|л[её]гк|ծիծաղ|խնդա[լց]|զվարճ|թեթ[ևեւ])/u;
const heavyGenres = ["drama", "horror", "thriller", "war"];
const negators = new Set(["no", "not", "without", "avoid", "без", "не", "кроме", "առանց", "ոչ"]);
const modifiers = new Set(["too", "any", "very", "очень", "слишком", "շատ"]);
const requestWords = new Set(
  ("a an and something some good movie movies film films please me i want find show bring give recommend suggest to make laugh " +
    "и что нибудь мне я хочу кино фильм фильмы можно пожалуйста посоветуй предложи найди дай покажи " +
    "ու և մի միքիչ բան բեր ասա տուր առաջարկիր առաջարկի գտիր ուզում եմ լավ ֆիլմ կինո խնդրում քեզ համար որ էլի").split(" "),
);
const chooseAnother = /(?:\b(?:or|или)\b|(?:^|\s)կամ(?:\s|$))/u;
const informationalQuestion = /^(?:what is|what are|who |when |why |is |are |does |did |define |объясни |что такое|кто |когда |почему |ինչ է |ի՞նչ է |ով |ո՞վ |երբ |ե՞րբ |ինչու |ինչո՞ւ )/iu;

function words(text: string) {
  return text.normalize("NFC").toLowerCase().replace(/\bsci[\s-]+fi\b/g, "scifi")
    .replace(/\bfeel[\s-]+good\b/g, "feelgood")
    .match(/[\p{L}\p{N}]+/gu) || [];
}

export function searchable(text: string) {
  return words(text).join(" ");
}

export function filmTitles(film: Film) {
  return [film.title_en, film.title_ru, film.title_hy]
    .map(title => searchable(title || "")).filter(Boolean);
}

export function mentionsTitle(text: string, titles: string[]) {
  return titles.some(title => title.length > 2 && ` ${text} `.includes(` ${title} `));
}

function filmGenres(film: Film) {
  const tags = (film.genre_names || []).flatMap(tag => tag.split(/[/,;|•·]/u)).map(searchable);
  return new Set(tags.flatMap(tag => Object.entries(genres)
    .filter(([, pattern]) => pattern.test(tag) || tag.split(" ").some(token => pattern.test(token)))
    .map(([name]) => name)));
}

function preference(message: string) {
  const tokens = words(message);
  const include = new Set<string>();
  const exclude = new Set<string>();
  let light = false;
  let simple = true;

  tokens.forEach((token, index) => {
    const after = tokens.slice(index + 1, index + 3).join(" ");
    const previous = tokens[index - 1];
    const negated = negators.has(previous) ||
      (modifiers.has(previous) && negators.has(tokens[index - 2])) ||
      /^(?:չեմ ուզ|չուզ)/u.test(after);

    let recognized = false;
    for (const [genre, pattern] of Object.entries(genres)) {
      if (pattern.test(token) || (genre === "sci-fi" && token === "science" && tokens[index + 1] === "fiction")) {
        (negated ? exclude : include).add(genre);
        recognized = true;
      }
    }
    if (!negated && lightMood.test(token)) light = true;
    if (!recognized && !lightMood.test(token) && !requestWords.has(token) &&
        !negators.has(token) && !modifiers.has(token)) simple = false;
  });
  for (const genre of exclude) include.delete(genre);
  return { include, exclude, light, simple };
}

// Handle clear genre and mood requests with catalog metadata. Specific-title
// questions, alternatives and requests without these signals use the chat model.
export function genreRecommendations(message: string, films: Film[], previousAnswer: string) {
  const query = searchable(message);
  if (informationalQuestion.test(message) ||
      films.some(film => mentionsTitle(query, filmTitles(film).filter(title => title.includes(" "))))) return null;

  const { include, exclude, light, simple } = preference(message);
  if (include.size + exclude.size > 1 && chooseAnother.test(message.toLowerCase())) return null;
  if (light && !include.size && !exclude.has("comedy")) include.add("comedy");
  if (!include.size && !exclude.size) return null;

  const recent = searchable(previousAnswer);
  const candidates = films.flatMap(film => {
    const tags = filmGenres(film);
    if (!tags.size || [...include].some(genre => !tags.has(genre)) ||
        [...exclude].some(genre => tags.has(genre))) return [];
    const heavy = heavyGenres.filter(genre => tags.has(genre) && !include.has(genre)).length;
    if (light && heavy) return [];
    const repeated = mentionsTitle(recent, filmTitles(film));
    const comedyFirst = include.has("comedy") && tags.values().next().value === "comedy";
    const score = (repeated ? -10 : 0) + (comedyFirst ? 2 : 0) - (include.has("comedy") ? heavy * 3 : 0);
    return [{ film, score }];
  });
  candidates.sort((a, b) => b.score - a.score ||
    String(b.film.release_date || "").localeCompare(String(a.film.release_date || "")),
  );
  return { films: candidates.map(({ film }) => film), simple };
}
