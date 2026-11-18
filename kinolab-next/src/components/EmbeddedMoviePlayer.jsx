import { useEffect, useRef, useState } from "react";

const messages = {
  hy: { loading: "Բեռնում ենք նվագարկիչը…", failed: "Նվագարկիչը չբեռնվեց։", retry: "Կրկին փորձել", show: "Փորձել դիտել" },
  ru: { loading: "Загружаем плеер…", failed: "Не удалось загрузить плеер.", retry: "Повторить", show: "Попробовать смотреть" },
  en: { loading: "Loading the player…", failed: "The player couldn’t load.", retry: "Try again", show: "Try playback" },
};

function EmbedAttempt({ src, title, language, onRetry }) {
  const frame = useRef(null);
  const origin = new URL(src).origin;
  const tracksReadiness = origin === "https://rutube.ru";
  const [status, setStatus] = useState(tracksReadiness ? "loading" : "ready");
  const [showFrame, setShowFrame] = useState(false);
  const text = messages[language] || messages.en;

  useEffect(() => {
    if (showFrame) frame.current?.focus();
  }, [showFrame]);

  useEffect(() => {
    if (!tracksReadiness) return;
    // The iframe load event also fires for provider error pages. Wait for
    // RUTUBE's own ready event, and keep listening if it arrives late.
    const timeout = window.setTimeout(() => setStatus("failed"), 12000);
    const onMessage = (event) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data?.type === "player:ready" || data?.type === "player:playStart") {
        window.clearTimeout(timeout);
        setStatus("ready");
      } else if (data?.type === "player:error") {
        window.clearTimeout(timeout);
        setStatus("failed");
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [origin, tracksReadiness]);

  return (
    <>
      <iframe className="inline-movie-frame" ref={frame} title={title} src={src}
        tabIndex={status === "ready" || showFrame ? 0 : -1} allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin" />
      {status !== "ready" && !showFrame && (
        <div className="movie-embed-status">
          <p role="status">{text[status]}</p>
          {status === "failed" && <>
            <button className="movie-embed-retry" type="button" onClick={onRetry}>{text.retry}</button>
            <button className="movie-embed-show" type="button" onClick={() => setShowFrame(true)}>{text.show}</button>
          </>}
        </div>
      )}
      {showFrame && status !== "ready" &&
        <button className="movie-embed-retry movie-embed-floating-retry" type="button" onClick={onRetry}>{text.retry}</button>}
    </>
  );
}

export default function EmbeddedMoviePlayer({ src, title, language, playerRef, expanded }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <div className={expanded ? "movie-embed movie-embed-expanded" : "movie-embed"}
      ref={playerRef} tabIndex={-1}>
      <EmbedAttempt key={src + ":" + attempt} src={src} title={title} language={language}
        onRetry={() => setAttempt((value) => value + 1)} />
    </div>
  );
}
