import { useEffect, useRef } from "react";
import { localizedMovie, genreLabel, adminModel, externalWatchUrl } from "../domain";
import Player from "./Player";
import { Artwork } from "./MovieRow";
import { isCleanPlayerMovie } from "../services/clean-player";

// Only trusted, intentionally embeddable platforms; never embed arbitrary hosts.
function trustedEmbed(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    let id = null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    } else if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
      return "https://www.youtube-nocookie.com/embed/" + id;
    if (u.hostname === "archive.org" || u.hostname === "www.archive.org") {
      const match = u.pathname.match(/^\/(?:details|embed)\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,119})\/?$/);
      if (match && !u.search && !u.hash) return "https://archive.org/embed/" + match[1];
    }
    if (u.hostname === "geo.dailymotion.com") {
      const match = u.pathname.match(/^\/player\/([A-Za-z0-9]+)\.html$/);
      const video = u.searchParams.get("video");
      if (match && video && /^[A-Za-z0-9]+$/.test(video) && u.searchParams.size === 1 && !u.hash)
        return "https://geo.dailymotion.com/player/" + match[1] + ".html?video=" + video;
    }
    if (u.hostname === "api.nextembed.ws" && /^\/embed\/(movie|tv)\/\d+(?:\/\d+\/\d+)?\/?$/.test(u.pathname) && !u.search && !u.hash) return u.href;
    if (u.hostname === "player.vimeo.com" || u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const match = u.pathname.match(/^\/(?:video\/)?([0-9]+)\/?$/);
      if (match) return "https://player.vimeo.com/video/" + match[1];
    }
  } catch {}
  return null;
}

export default function MovieDialog({
  movie,
  loading,
  watch,
  language,
  t,
  close,
  onWatch,
  onCleanWatch,
  onOutbound,
  guestLocked,
  toggle,
  saved,
  watchable,
  onProgress,
}) {
  const dialog = useRef(null),
    closer = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    document.body.classList.add("has-player-dialog");
    closer.current?.focus();
    return () => {
      document.body.classList.remove("has-player-dialog");
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const info = movie ? localizedMovie(movie, language) : {};
  const trailerEmbed = movie && movie.source === "supabase" && movie.approval?.license_verified === true && movie.approval?.commercial_reuse_verified === true ? trustedEmbed(movie.embed) : null;
  // All authorized external embed references open directly in a new browser tab.
  // Native MP4/HLS keeps the built-in player; no iframe preflight or popups.
  const hasDirectPlayback = movie ? watchable(movie) : false;
  const official = /^https:\/\/(?:www\.)?netflix\.com\/title\/\d+\/?$/.test(movie?.officialWatch || "") ? movie.officialWatch : null;
  const externalWatch = !hasDirectPlayback ? externalWatchUrl(movie) : null;
  const cleanPlayer = isCleanPlayerMovie(movie, movie?.externalWatch);
  return (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      ref={dialog}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
        if (e.key === "Tab") {
          const nodes = [
            ...dialog.current.querySelectorAll(
              'button:not(:disabled),a[href],input:not(:disabled),select,[tabindex="0"]',
            ),
          ].filter((node) => node.getClientRects().length);
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="dialog">
        <div className="dialog-top">
          <div>
            <span className="eyebrow">KINOLAB</span>
            <h2 id="modalTitle">
              {info.title || t(loading ? "loading" : "titleUnknown")}
            </h2>
          </div>
          <button
            className="close"
            ref={closer}
            onClick={close}
            aria-label={t("close")}
          >
            ×
          </button>
        </div>
        <div className="video-wrap">
          {movie && (watch && hasDirectPlayback ? (
            <Player movie={movie} language={language} onProgress={onProgress} />
          ) : (
            <div className="details-art">
              <Artwork className="detail-poster" src={movie.img} alt={info.title} />
              {!hasDirectPlayback && !externalWatch && !cleanPlayer && (
                <div className="availability-note">{t("browseOnly")}</div>
              )}
            </div>
          ))}
        </div>
        <div className="dialog-info">
          <div className="meta">
            {movie &&
              [movie.year, ...movie.genres.map((g) => genreLabel(g, language))]
                .filter(Boolean)
                .map((value, i) => <span key={i}>{value}</span>)}
          </div>
          <p>
            {info.desc ||
              t(movie ? "descriptionFallback" : loading ? "loading" : "empty")}
          </p>
          {movie?.kind === "TV Show" && movie.episodes?.length > 0 && !watch && (
            <section className="series-episode-section" aria-label={({hy:"Սերիաներ",ru:"Серии",en:"Episodes"}[language])}>
              <h3>{({hy:"Սեզոններ և սերիաներ",ru:"Сезоны и серии",en:"Seasons & episodes"}[language])}</h3>
              <div className="series-episode-grid">
                {movie.episodes.map(item=>(
                  guestLocked?.(movie) ? (
                    <button key={item.season+":"+item.episode} type="button" className="series-episode-link"
                      onClick={() => onOutbound?.(null,movie)}>
                      {({hy:"Սեզոն",ru:"Сезон",en:"Season"}[language])} {item.season}
                      {" · "}
                      {({hy:"Սերիա",ru:"Серия",en:"Episode"}[language])} {item.episode}
                    </button>
                  ) : (
                    <a key={item.season+":"+item.episode}
                      href={item.url} target="_blank" rel="noopener noreferrer"
                      className="series-episode-link" onClick={(e) => onOutbound?.(e,movie)}>
                      {({hy:"Սեզոն",ru:"Сезон",en:"Season"}[language])} {item.season}
                      {" · "}
                      {({hy:"Սերիա",ru:"Серия",en:"Episode"}[language])} {item.episode}
                    </a>
                  )
                ))}
              </div>
            </section>
          )}
          {movie && (
            <div className="detail-actions">
              {cleanPlayer && !watch && (
                <button className="btn primary" type="button" onClick={onCleanWatch}>
                  {({hy:"Դիտել ֆիլմը",ru:"Смотреть фильм",en:"Watch movie"}[language])}
                </button>
              )}
              {externalWatch && !watch && !cleanPlayer && (
                <div className="movielab-external-watch">
                  {guestLocked?.(movie) ? (
                    <button className="btn primary" type="button" onClick={() => onOutbound?.(null,movie)}>
                      {({hy:"Դիտել ֆիլմը",ru:"Смотреть фильм",en:"Watch movie"}[language])}
                    </button>
                  ) : (
                    <a className="btn primary" href={externalWatch} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => onOutbound?.(e,movie)}>
                      {({hy:"Դիտել ֆիլմը",ru:"Смотреть фильм",en:"Watch movie"}[language])}
                    </a>
                  )}
                  <span className="movielab-external-disclosure">{({hy:"Բացվում է արտաքին նվագարկիչում · KinoLab-ը մնում է բաց",ru:"Откроется внешний плеер · KinoLab останется открытым",en:"Opens an external player · KinoLab stays open"}[language])}</span>
                </div>
              )}
              {!watch && hasDirectPlayback && (
                <button className="btn primary" onClick={onWatch}>
                  {t("watch")}
                </button>
              )}
              <button
                className="btn secondary"
                aria-pressed={saved}
                onClick={() => toggle(movie)}
              >
                {saved ? "✓ " : "＋ "}
                {t(saved ? "inList" : "list")}
              </button>
              {adminModel.https(movie.trailer) && (
                <a
                  className="btn secondary"
                  href={movie.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {
                    {
                      hy: "Դիտել թրեյլերը",
                      ru: "Трейлер",
                      en: "Watch trailer",
                    }[language]
                  }
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
