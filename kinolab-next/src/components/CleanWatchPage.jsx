import { useEffect } from "react";
import { cleanEmbedUrl } from "../services/clean-player";
import { localizedMovie } from "../domain";

const strings = {
  hy: { unavailable: "Այս ֆիլմի փլեյերը հասանելի չէ։", loading: "Բեռնվում է…", closed: "Վերադառնալ KinoLab",
        locked: "Քո 5 անվճար ֆիլմերի սահմանաչափը լրացել է։ Գրանցվիր անվճար՝ դիտումը շարունակելու համար։",
        login: "Գրանցվել կամ մուտք գործել", external: "Բացել սկզբնական փլեյերը" },
  ru: { unavailable: "Плеер недоступен.", loading: "Загрузка…", closed: "Вернуться в KinoLab",
        locked: "Лимит 5 бесплатных фильмов достигнут. Зарегистрируйтесь бесплатно для продолжения.",
        login: "Войти или зарегистрироваться", external: "Открыть исходный плеер" },
  en: { unavailable: "This movie player is unavailable.", loading: "Loading…", closed: "Back to KinoLab",
        locked: "Your five free movie choices have been used. Register free to keep watching.",
        login: "Log in or register", external: "Open original player" },
};

export default function CleanWatchPage({ movie, language, ready, access, locked, onBack }) {
  const t = strings[language] || strings.en;
  const title = movie ? localizedMovie(movie, language).title : "";
  const src = movie?.playbackMode === "clean" ? cleanEmbedUrl(movie.externalWatch) : null;
  useEffect(() => {
    const previous = document.title;
    if (title) document.title = title;
    return () => { document.title = previous; };
  }, [title]);
  return (
    <main style={{ position:"fixed", inset:0, overflow:"auto", zIndex:9999, background:"#08070d", color:"#F7F5F0", fontFamily:"system-ui,sans-serif" }}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 16px",minHeight:52,boxSizing:"border-box",borderBottom:"1px solid #32243f"}}>
        <button type="button" onClick={onBack} aria-label={t.closed}
          style={{background:"#20152e",color:"#D4F458",border:"1px solid #4c3c61",borderRadius:8,padding:"8px 12px",cursor:"pointer"}}>←</button>
        <strong style={{fontSize:"clamp(14px,2vw,18px)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title || "KinoLab"}</strong>
      </div>
      {!ready ? <p style={{padding:24}}>{t.loading}</p> :
       !src ? <p style={{padding:24}}>{t.unavailable}</p> :
       !access ? <div style={{padding:24}}><p>{locked ? t.locked : t.loading}</p>
          {locked && <a href="#/register" style={{color:"#D4F458"}}>{t.login}</a>}
        </div> :
        <div style={{width:"100%",height:"calc(100dvh - 52px)",background:"#000",position:"relative"}}>
          <iframe title={title || "Movie player"} src={src} allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{display:"block",width:"100%",height:"100%",border:0,background:"#000"}} />
          <a href={src} target="_blank" rel="noopener noreferrer" title={t.external}
            style={{position:"absolute",bottom:12,right:12,background:"#20152ecc",color:"#F7F5F0",fontSize:12,padding:"5px 8px",borderRadius:5}}>{t.external}</a>
        </div>}
    </main>
  );
}
