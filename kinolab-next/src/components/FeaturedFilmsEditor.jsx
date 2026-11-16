import { useEffect, useRef, useState } from "react";
import { localizedMovie } from "../domain";
import { client } from "../services/backend";

const copy = {
  hy: {
    instructions: "Ընտրիր մինչև 5 ֆիլմ՝ ցուցադրման հերթով։ Դատարկ թողնելու դեպքում ֆիլմերը կընտրվեն ավտոմատ։",
    slot: "Սլայդ", none: "Դատարկ", unavailable: "Ֆիլմն այլևս հասանելի չէ",
    loading: "Բեռնվում է…", loadError: "Չհաջողվեց բեռնել սլայդերի ընտրությունը։",
    save: "Պահպանել հերթը", saving: "Պահպանվում է…", saved: "Սլայդերի հերթը պահպանվեց։",
    retry: "Կրկին բեռնել", saveError: "Չհաջողվեց պահպանել։ Ստուգիր, որ ընտրված ֆիլմերը հրապարակված են, և կրկին փորձիր։",
    conflict: "Ընտրությունը փոխվել է մեկ այլ ներդիրում։ Բեռնիր վերջին տարբերակը և նորից ընտրիր հերթը։",
  },
  ru: {
    instructions: "Выберите до 5 фильмов в порядке показа. Если оставить поля пустыми, фильмы будут выбраны автоматически.",
    slot: "Слайд", none: "Пусто", unavailable: "Фильм больше недоступен",
    loading: "Загрузка…", loadError: "Не удалось загрузить подборку.",
    save: "Сохранить порядок", saving: "Сохранение…", saved: "Порядок слайдов сохранён.",
    retry: "Загрузить заново", saveError: "Не удалось сохранить. Проверьте, что выбранные фильмы опубликованы, и повторите попытку.",
    conflict: "Подборка изменилась в другой вкладке. Загрузите последнюю версию и выберите порядок снова.",
  },
  en: {
    instructions: "Choose up to 5 films in display order. Leave the slots empty to use automatic selection.",
    slot: "Slide", none: "Empty", unavailable: "Film no longer available",
    loading: "Loading…", loadError: "Could not load the featured films.",
    save: "Save order", saving: "Saving…", saved: "Slide order saved.",
    retry: "Reload selection", saveError: "Could not save. Check that the selected films are still published and try again.",
    conflict: "The selection changed in another tab. Reload the latest version and choose the order again.",
  },
};

const slotCount = 5;
const table = "kinolab_featured_films";

export default function FeaturedFilmsEditor({ movies, language, onDirty }) {
  const t = copy[language] || copy.en;
  const [selection, setSelection] = useState([]);
  const [revision, setRevision] = useState(null);
  const [attempt, retry] = useState(0);
  const [status, setStatus] = useState("loading");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const disabled = ["loading", "saving", "conflict"].includes(status);
  const choices = movies.map(movie => ({
    id: movie.id,
    label: [localizedMovie(movie, language).title, movie.year].filter(Boolean).join(" · "),
  })).sort((a, b) => a.label.localeCompare(b.label, language));
  const known = new Set(choices.map(movie => movie.id));

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await client.from(table).select("movie_ids,revision").eq("id", 1).single();
        if (error || !data) throw error || new Error("Configuration missing");
        if (!active) return;
        setSelection(data.movie_ids);
        setRevision(data.revision);
        setStatus("");
      } catch {
        if (active) setStatus("loadError");
      }
    }
    load();
    return () => { active = false; };
  }, [attempt]);

  function reload() {
    setStatus("loading");
    onDirty(false);
    retry(value => value + 1);
  }

  async function save(event) {
    event.preventDefault();
    if (!revision || disabled || selection.some(id => id && !known.has(id))) return;
    const movieIds = selection.filter(Boolean);
    setStatus("saving");
    try {
      const { data, error } = await client.from(table)
        .update({ movie_ids: movieIds, revision: crypto.randomUUID() })
        .eq("id", 1).eq("revision", revision).select("revision").maybeSingle();
      if (error) throw error;
      if (!mounted.current) return;
      if (!data) {
        setStatus("conflict");
        return;
      }
      setSelection(movieIds);
      setRevision(data.revision);
      setStatus("saved");
      onDirty(false);
    } catch {
      if (mounted.current) setStatus("saveError");
    }
  }

  return (
    <section className="panel">
      <p className="hint">{t.instructions}</p>
      {status && <p role="status" className="hint">{t[status]}</p>}
      {["loadError", "conflict"].includes(status) && (
        <button type="button" className="secondary" onClick={reload}>{t.retry}</button>
      )}
      {revision && (
        <form onSubmit={save}>
          <div className="form-grid">
            {Array.from({ length: slotCount }, (_, index) => {
              const value = selection[index] || "";
              return (
                <label key={index}>
                  {t.slot} {index + 1}
                  <select value={value} disabled={disabled}
                    onChange={event => {
                      const next = [...selection];
                      const chosen = event.target.value;
                      const previousIndex = chosen ? next.indexOf(chosen) : -1;
                      if (previousIndex >= 0) next[previousIndex] = value;
                      next[index] = chosen;
                      setSelection(next);
                      setStatus("");
                      onDirty(true);
                    }}>
                    <option value="">{t.none}</option>
                    {value && !known.has(value) && <option value={value} disabled>{t.unavailable}</option>}
                    {choices.map(movie => (
                      <option key={movie.id} value={movie.id}>
                        {movie.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <div className="form-actions">
            <button type="submit" className="primary"
              disabled={disabled || selection.some(id => id && !known.has(id))}>
              {t.save}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
