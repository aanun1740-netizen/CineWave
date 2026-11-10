import { useEffect, useRef, useState } from "react";
import { localizedMovie, genreLabel, POSTER_FALLBACK } from "../domain";
import { playback } from "./Player";
import { siteBase } from "../site-base";
import { Icon } from "./Icons";
export function Artwork({ src, alt, ...props }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      src={failed ? POSTER_FALLBACK : src || POSTER_FALLBACK}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
export default function MovieRow({
  id,
  title,
  eyebrow,
  subtitle,
  movies,
  language,
  t,
  watchable,
  externalWatchUrl,
  guestLocked,
  onOutbound,
  open,
  actions,
  results = false,
  empty,
}) {
  const row = useRef(null),
    [bounds, setBounds] = useState({ start: true, end: false });
  const update = () => {
    const el = row.current;
    if (el)
      setBounds({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
  };
  useEffect(() => {
    update();
    // Phone rotation and responsive layout can change the scrollable card
    // width without a new catalog request. Keep arrow states in sync.
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver(update)
      : null;
    if (observer && row.current) observer.observe(row.current);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [movies]);
  const scroll = (direction) =>
    row.current?.scrollBy({
      left: direction * row.current.clientWidth * 0.85,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  return (
    <section className={`section ${results ? "is-results" : ""}`} id={id}>
      <div className="section-head">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={`${id}-heading`}>{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        <div className="section-actions">
          {actions}
          <div className="row-controls">
            <button
              onClick={() => scroll(-1)}
              disabled={bounds.start}
              aria-label={t("previous")}
            >
              ‹
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={bounds.end}
              aria-label={t("next")}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <div
        className="movie-grid"
        ref={row}
        onScroll={update}
        tabIndex={0}
        role="region"
        aria-labelledby={`${id}-heading`}
      >
        {movies.map((movie) => {
          const info = localizedMovie(movie, language),
            available = watchable(movie),
            official = !available ? externalWatchUrl(movie) : null,
            progress = playback.progressFor(movie.id);
          return (
            <article
              key={movie.id}
              className="movie"
              data-id={movie.id}
              tabIndex={0}
              role="button"
              aria-label={`${info.title} — ${t(available ? "watch" : "details")}`}
              onClick={() => open(movie)}
              onKeyDown={(e) => {
                if (["Enter", " "].includes(e.key)) {
                  e.preventDefault();
                  open(movie);
                } else if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                  e.preventDefault();
                  (e.key === "ArrowLeft"
                    ? e.currentTarget.previousElementSibling
                    : e.currentTarget.nextElementSibling
                  )?.focus();
                }
              }}
            >
              <div className="poster">
                <Artwork
                  key={movie.img}
                  loading="lazy"
                  decoding="async"
                  width="500"
                  height="750"
                  src={movie.img}
                  alt={info.title}
                />
                <span
                  className={`poster-badge ${available ? "available" : official ? "external" : ""}`}
                >
                  {t(available ? "available" : official ? "externalLink" : "catalogOnly")}
                </span>
                {official ? (
                  guestLocked?.(movie) ? (
                    <button className="play-overlay" type="button"
                      aria-label={`${info.title} — ${t("watch")} (sign in)`}
                      onClick={(e) => { e.stopPropagation(); onOutbound?.(null, movie); }}
                      onKeyDown={(e) => e.stopPropagation()}>
                      <Icon name="play" />{t("watch")}
                    </button>
                  ) : (
                    <a className="play-overlay" href={official} target="_blank" rel="noopener noreferrer"
                      aria-label={`${info.title} — ${t("watch")} (external player)`}
                      onClick={(e) => { e.stopPropagation(); onOutbound?.(e, movie); }}
                      onKeyDown={(e) => e.stopPropagation()}>
                      <Icon name="play" />{t("watch")}
                    </a>
                  )
                ) : available ? (
                  <button className="play-overlay" type="button" onClick={(e) => {e.stopPropagation(); open(movie, true);}}
                    onKeyDown={(e) => e.stopPropagation()}>
                    <Icon name="play" />{t("watch")}
                  </button>
                ) : (
                  <span className="play-overlay"><Icon name="info" />{t("details")}</span>
                )}
              </div>
              <div className="movie-title">
                {info.title || t("titleUnknown")}
              </div>
              {/^catalog:external:[1-9][0-9]*$/.test(movie.id) && (
                <a className="film-page-link"
                  href={`${siteBase()}film/${movie.id.slice("catalog:external:".length)}/`}
                  aria-label={`${info.title} — ${t("filmPage")}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}>
                  {t("filmPage")} <span aria-hidden="true">↗</span>
                </a>
              )}
              <div className="movie-meta">
                {[
                  movie.year,
                  movie.genres.map((g) => genreLabel(g, language)).join(" · "),
                ]
                  .filter(Boolean)
                  .join(" • ")}
                {progress > 0 && (
                  <div className="progress">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!movies.length && empty && <div className="empty">{empty}</div>}
    </section>
  );
}
