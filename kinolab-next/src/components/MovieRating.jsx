import { useEffect, useRef, useState } from "react";
import { client } from "../services/backend";
import "./movie-rating.css";

const copy = {
  hy: {
    title: "KinoLab-ի գնահատականը", empty: "Դեռ գնահատական չկա", loading: "Բեռնվում է…",
    count: n => n + " գնահատական", mine: "Քո գնահատականը", star: n => n + " աստղ՝ 5-ից",
    login: "Մուտք գործիր՝ գնահատելու համար", retry: "Կրկին փորձել",
    loadError: "Չհաջողվեց բեռնել գնահատականները։", saveError: "Չհաջողվեց պահպանել գնահատականը։",
    saved: "Գնահատականդ պահպանվել է։",
  },
  ru: {
    title: "Оценка KinoLab", empty: "Оценок пока нет", loading: "Загрузка…",
    count: (n, votes) => n + " " + (voteForms[russianPlural.select(votes)] || "оценок"),
    mine: "Ваша оценка", star: n => n + " из 5 звёзд",
    login: "Войдите, чтобы оценить", retry: "Повторить",
    loadError: "Не удалось загрузить оценки.", saveError: "Не удалось сохранить оценку.",
    saved: "Ваша оценка сохранена.",
  },
  en: {
    title: "KinoLab rating", empty: "No ratings yet", loading: "Loading…",
    count: (n, votes) => n + (votes === 1 ? " rating" : " ratings"),
    mine: "Your rating", star: n => n + " out of 5 stars",
    login: "Sign in to rate", retry: "Try again",
    loadError: "Could not load ratings.", saveError: "Could not save your rating.",
    saved: "Your rating was saved.",
  },
};
const voteForms = { one: "оценка", few: "оценки" };
const russianPlural = new Intl.PluralRules("ru");

export default function MovieRating({ movieKey, language, ready, signedIn, onLogin }) {
  const words = copy[language] || copy.en;
  const [rating, setRating] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await client.rpc("kinolab_movie_rating", { p_movie_key: movieKey });
        if (error || !data?.[0]) throw error || Error("Rating unavailable");
        if (mounted) setRating(data[0]);
      } catch {
        if (mounted) setMessage("loadError");
      }
    }
    load();
    return () => { mounted = false; };
  }, [ready, movieKey, attempt]);

  async function rate(stars) {
    if (saving.current || stars === rating.own_stars) return;
    saving.current = true;
    setPending(true);
    setMessage("");
    try {
      const { data, error } = await client.rpc("kinolab_rate_movie", {
        p_movie_key: movieKey,
        p_stars: stars,
      });
      if (error || !data?.[0]) throw error || Error("Rating unavailable");
      setRating(data[0]);
      setMessage("saved");
    } catch {
      setMessage("saveError");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  const votes = Number(rating?.vote_count || 0);
  const average = votes > 0
    ? new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        .format(rating.average_stars)
    : null;

  return (
    <section className="movie-rating" aria-label={words.title}>
      <div className="movie-rating-summary">
        <h3>{words.title}</h3>
        <div className="movie-rating-score" aria-live="polite">
          {average !== null ? (
            <>
              <strong><span aria-hidden="true">★ </span>{average} / 5</strong>
              <span>{words.count(new Intl.NumberFormat(language).format(votes), votes)}</span>
            </>
          ) : rating ? <span>{words.empty}</span> : !message && <span>{words.loading}</span>}
        </div>
      </div>
      {rating && (signedIn ? (
        <div className="movie-rating-vote">
          <span>{words.mine}</span>
          <div className="movie-rating-stars" role="group" aria-label={words.mine} aria-busy={pending}>
            {[1, 2, 3, 4, 5].map((stars) => (
              <button type="button" key={stars} aria-label={words.star(stars)}
                aria-pressed={stars === rating.own_stars} aria-disabled={pending}
                data-filled={stars <= rating.own_stars} onClick={() => rate(stars)}>
                <span aria-hidden="true">{stars <= rating.own_stars ? "★" : "☆"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : <button className="movie-rating-link" type="button" onClick={onLogin}>{words.login}</button>)}
      {(message === "loadError" || message === "saveError") &&
        <p className="movie-rating-feedback" role="alert">{words[message]}</p>}
      {message === "loadError" && <button className="movie-rating-link" type="button" onClick={() => {
        setMessage("");
        setAttempt((value) => value + 1);
      }}>{words.retry}</button>}
      <p className="movie-rating-feedback" role="status">{message === "saved" ? words.saved : ""}</p>
    </section>
  );
}
