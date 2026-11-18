import { useEffect, useRef, useState } from "react";
import { localizedMovie, genreLabel, externalWatchUrl } from "../domain";
import Player from "./Player";
import { Artwork } from "./MovieRow";
import MovieRating from "./MovieRating";
import { Icon } from "./Icons";
import "./inline-movie-player.css";
import { cleanEmbedUrl } from "../services/clean-player";
import CleanEpisodePicker, { useCleanEpisodes } from "./CleanEpisodePicker";
import TrailerAction from "./TrailerAction";
import { trailerEmbedUrl } from "../services/trailer";

const trailerLabels = {
  hy: { play: "Դիտել թրեյլերը", back: "Հետ՝ մանրամասներին", source: "Բացել թրեյլերը աղբյուրի կայքում" },
  ru: { play: "Трейлер", back: "К описанию", source: "Открыть трейлер на сайте источника" },
  en: { play: "Watch trailer", back: "Back to details", source: "Open trailer on source site" },
};

export default function MovieDialog({
  movie,
  loading,
  watch,
  language,
  t,
  close,
  onWatch,
  onInlineWatch,
  trailerOpen,
  onOpenTrailer,
  onCloseTrailer,
  onOutbound,
  guestLocked,
  toggle,
  saved,
  watchable,
  onProgress,
  ratingAccount,
  onRateLogin,
}) {
  const dialog = useRef(null),
    closer = useRef(null),
    inlineFrame = useRef(null);
  const [inlinePlaying, setInlinePlaying] = useState(false);
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
  const hasDirectPlayback = movie ? watchable(movie) : false;
  const externalWatch = !hasDirectPlayback ? externalWatchUrl(movie) : null;
  const playback = useCleanEpisodes(movie);
  const cleanSource = cleanEmbedUrl(playback.source);
  const trailerSource = trailerEmbedUrl(movie?.trailer);
  const showTrailer = Boolean(trailerOpen && trailerSource);
  const trailerText = trailerLabels[language] || trailerLabels.en;
  const showInline = Boolean(!showTrailer && cleanSource && (inlinePlaying || (movie?.mediaType === "tv" && watch)));
  const watchLabel = {hy:"Դիտել ֆիլմը",ru:"Смотреть фильм",en:"Watch movie"}[language];
  useEffect(() => {
    if (showTrailer) inlineFrame.current?.scrollIntoView?.({ block: "nearest" });
    if (showTrailer || showInline) inlineFrame.current?.focus({ preventScroll: true });
  }, [showTrailer, showInline]);
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
        if (e.key === "Escape" && !document.fullscreenElement) {
          e.stopPropagation();
          close();
        }
        if (e.key === "Tab") {
          const nodes = [
            ...dialog.current.querySelectorAll(
              'button:not(:disabled),a[href],input:not(:disabled),select,iframe,[tabindex="0"]',
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
        {showInline && playback.selected && (
          <div className="dialog-episode-picker"><CleanEpisodePicker {...playback} language={language} /></div>
        )}
        <div className="video-wrap">
          {movie && (showTrailer ? (
            <iframe className="inline-movie-frame inline-trailer-frame" ref={inlineFrame}
              title={info.title + " · " + trailerText.play} src={trailerSource} allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin" />
          ) : watch && hasDirectPlayback ? (
            <Player movie={movie} language={language} onProgress={onProgress} />
          ) : showInline ? (
            <iframe className="inline-movie-frame" ref={inlineFrame}
              title={info.title} src={cleanSource} allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin" />
          ) : cleanSource ? (
            <div className="inline-movie-preview">
              <Artwork className="inline-movie-backdrop" src={movie.backdrop || movie.img} alt="" />
              <Artwork className="inline-movie-poster" src={movie.img} alt="" />
              <button className="btn primary inline-movie-play" type="button"
                onClick={() => { if (onInlineWatch()) setInlinePlaying(true); }}>
                <Icon name="play" /> {movie.mediaType === "tv" ? t("watch") : watchLabel}
              </button>
            </div>
          ) : (
            <div className="details-art">
              <Artwork className="detail-poster" src={movie.img} alt={info.title} />
              {!hasDirectPlayback && !externalWatch && !cleanSource && (
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
          {movie?.kind === "TV Show" && movie.episodes?.length > 0 && !cleanSource && !watch && (
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
              {externalWatch && !watch && !cleanSource && (
                <div className="movielab-external-watch">
                  {guestLocked?.(movie) ? (
                    <button className="btn primary" type="button" onClick={() => onOutbound?.(null,movie)}>
                      {watchLabel}
                    </button>
                  ) : (
                    <a className="btn primary" href={externalWatch} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => onOutbound?.(e,movie)}>
                      {watchLabel}
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
              {showTrailer ? (
                <>
                  <button className="btn secondary" type="button" onClick={onCloseTrailer}>{trailerText.back}</button>
                  <TrailerAction url={movie.trailer}>{trailerText.source}</TrailerAction>
                </>
              ) : (
                <TrailerAction url={movie.trailer} onPlay={trailerSource ? onOpenTrailer : null}>
                  {trailerText.play}
                </TrailerAction>
              )}
            </div>
          )}
          {ratingAccount && movie?.mediaType === "movie" && (
            <MovieRating key={ratingAccount.session?.user.id ?? "guest"}
              movieKey={movie.id} language={language} ready={ratingAccount.ready}
              signedIn={Boolean(ratingAccount.session?.user && !ratingAccount.session.user.is_anonymous)}
              onLogin={onRateLogin} />
          )}
        </div>
      </div>
    </div>
  );
}
