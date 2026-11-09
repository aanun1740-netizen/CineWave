import { useEffect, useRef, useState } from "react";
import { backendFetch, config, client } from "../services/backend";
import { canonicalGenre, localizedMovie, genreLabel } from "../domain";

function aiErrorStatus(code, status) {
  if (code === "cooldown") return "aiCooldown";
  if (code === "daily_limit") return "aiDailyLimit";
  if (code === "global_limit") return "aiGlobalLimit";
  if (code === "provider_limit") return "aiProviderLimit";
  if (code === "message_too_long") return "aiTooLong";
  if (code === "sign_in_required" || status === 401) return "aiSignIn";
  return "aiError";
}

const GENRES = ["Comedy", "History", "Action", "Drama", "Sci-Fi", "Romance", "Horror", "Animation", "Family", "Adventure", "Thriller", "Documentary", "Fantasy", "War"];
function findCatalogMatches(question, movies, language) {
  const q = question.trim().toLocaleLowerCase();
  const terms = q.split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 2);
  const targetGenres = GENRES.filter(g => [g, genreLabel(g, "hy"), genreLabel(g, "ru")].some(label => q.includes(label.toLocaleLowerCase())));
  return movies.map(movie => {
    const info = localizedMovie(movie, language);
    const titles = Object.values(movie.titles || {}).map(v => String(v).toLocaleLowerCase());
    const titleHit = titles.some(v => v && q.includes(v));
    const genreHits = (movie.genres || []).filter(g => targetGenres.includes(canonicalGenre(g))).length;
    const titleWords = terms.filter(w => titles.some(title => title.includes(w))).length;
    return {movie, info, score: (titleHit ? 20 : 0) + genreHits * 5 + titleWords};
  }).filter(x => x.score > 0).sort((a,b) => b.score - a.score || String(a.info.title).localeCompare(String(b.info.title))).slice(0,3);
}

export default function AI({ open, setOpen, t, movies = [], language = "hy", onOpenMovie }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef(null);
  const panel = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const history = useRef([]);

  useEffect(() => {
    // On phones, auto-focusing the chat input opens the keyboard immediately.
    // Small input fonts can also trigger iOS Safari's automatic page zoom.
    if (open && window.matchMedia("(min-width: 701px)").matches) {
      input.current?.focus({ preventScroll: true });
    }
  }, [open]);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = panel.current.scrollHeight;
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    if (!message.trim() || busy) return;
    const value = message.trim();
    setSuggestions([]);
    setMessage("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { text: value, user: true },
      { status: "aiThinking" },
    ]);

    try {
      const { data, error } = await client.auth.getSession();
      const token = data?.session?.access_token;
      if (error || !token) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { status: "aiSignIn" },
        ]);
        return;
      }

      const response = await backendFetch(
        `${config.url}/functions/v1/cinewave-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.key,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: value, language, history: history.current.slice(-6) }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { status: aiErrorStatus(payload?.error, response.status) },
        ]);
        return;
      }

      if (typeof payload?.answer === "string" && payload.answer.trim()) {
        history.current = [...history.current, { role: "user", text: value }, { role: "assistant", text: payload.answer.slice(0, 900) }].slice(-6);
      }
      setSuggestions(findCatalogMatches(value, movies, language));
      setMessages((prev) => [
        ...prev.slice(0, -1),
        typeof payload?.answer === "string" && payload.answer.trim()
          ? { text: payload.answer }
          : { status: "aiNoAnswer" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { status: "aiError" },
      ]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  return (
    <>
      <button
        id="cw-ai-button"
        onClick={() => setOpen(!open)}
        aria-controls="cw-ai-panel"
        aria-expanded={open}
      >
        ✦ <span>KinoLab AI</span>
      </button>
      <section
        id="cw-ai-panel"
        role="dialog"
        aria-labelledby="cw-ai-title"
        hidden={!open}
      >
        <header id="cw-ai-head">
          <div>
            <span className="eyebrow">{t("aiEyebrow")}</span>
            <h2 id="cw-ai-title">KinoLab AI</h2>
          </div>
          <button
            id="cw-ai-close"
            onClick={() => setOpen(false)}
            aria-label={t("aiClose")}
          >
            ×
          </button>
        </header>
        <div id="cw-ai-messages" ref={panel} aria-live="polite">
          <div className="cw-ai-msg cw-ai-bot">{t("aiWelcome")}</div>
          {messages.map((row, i) => (
            <div
              key={i}
              className={`cw-ai-msg cw-ai-${row.user ? "user" : "bot"}`}
            >
              {row.status ? t(row.status) : row.text}
            </div>
          ))}
          {suggestions.length > 0 && (
            <div className="cw-ai-catalog" aria-label={t("aiCatalogHeading")}>
              <p>{t("aiCatalogHeading")}</p>
              {suggestions.map(({movie,info}) => (
                <button key={movie.id} type="button" className="cw-ai-catalog-item"
                  onClick={() => onOpenMovie?.(movie)}>
                  {movie.img && <img src={movie.img} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} />}
                  <span className="cw-ai-catalog-meta"><strong>{info.title}</strong><small>{[movie.year, ...(movie.genres || []).slice(0,2).map(g => genreLabel(g, language))].filter(Boolean).join(" · ")}</small></span><span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <form id="cw-ai-form" onSubmit={submit}>
          <input
            ref={input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            id="cw-ai-input"
            aria-label={t("aiMessage")}
            placeholder={t("aiPlaceholder")}
            maxLength={400}
            required
            disabled={busy}
          />
          <button id="cw-ai-send" disabled={busy} aria-label={t("aiSend")}>
            ↑
          </button>
        </form>
      </section>
    </>
  );
}
