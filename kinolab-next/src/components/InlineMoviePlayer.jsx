import { useEffect, useRef, useState } from "react";

const labels = {
  hy: { expand: "Ամբողջ էկրան", exit: "Դուրս գալ ամբողջ էկրանից", source: "Բացել աղբյուրի կայքում", unavailable: "Այս դիտարկիչում ամբողջ էկրանը հասանելի չէ։" },
  ru: { expand: "На весь экран", exit: "Выйти из полноэкранного режима", source: "Открыть на сайте источника", unavailable: "В этом браузере полноэкранный режим недоступен." },
  en: { expand: "Fullscreen", exit: "Exit fullscreen", source: "Open on source site", unavailable: "Fullscreen is unavailable in this browser." },
};

export default function InlineMoviePlayer({ src, title, language, externalWatch, onOutbound }) {
  const words = labels[language] || labels.en;
  const stage = useRef(null);
  const fullscreenButton = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", update);
    fullscreenButton.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === stage.current) await document.exitFullscreen();
      else await stage.current.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  }

  return (
    <div className="inline-movie-stage" ref={stage}>
      <iframe title={title} src={src} allowFullScreen
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin" />
      <div className="inline-movie-controls">
        {externalWatch && <a href={externalWatch} target="_blank" rel="noopener noreferrer" onClick={onOutbound}>
          {words.source} <span aria-hidden="true">↗</span>
        </a>}
        <button className="inline-movie-fullscreen" type="button" ref={fullscreenButton} onClick={toggleFullscreen}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={expanded ? "M4 9h5V4m6 0v5h5M4 15h5v5m11-5h-5v5" : "M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"} />
          </svg>
          {expanded ? words.exit : words.expand}
        </button>
      </div>
      {fullscreenError && <p className="inline-movie-status" role="status">{words.unavailable}</p>}
    </div>
  );
}
