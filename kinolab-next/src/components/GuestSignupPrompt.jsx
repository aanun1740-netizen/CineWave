import { useEffect, useRef } from "react";
import { FREE_GUEST_FILMS } from "../guest-watch";

const words = {
  hy: {
    headline: "Շարունակիր դիտել KinoLab-ում 🎬",
    desc: "Քո 5 անվճար ֆիլմերի սահմանաչափը լրացել է։ Գրանցվիր անվճար, շարունակիր դիտել և օգտվիր KinoLab AI-ից։",
    action: "Գրանցվել անվճար", login: "Արդեն ունե՞ս հաշիվ։ Մուտք գործիր",
    dismiss: "Շարունակել ուսումնասիրել կատալոգը",
    note: "Ֆիլմերի նկարագրությունները, որոնումը և թրեյլերները մնում են հասանելի առանց գրանցվելու։",
    close: "Փակել",
  },
  ru: {
    headline: "Продолжай смотреть на KinoLab 🎬",
    desc: "Лимит 5 бесплатных фильмов исчерпан. Зарегистрируйся бесплатно, продолжай смотреть и пользуйся KinoLab AI.",
    action: "Зарегистрироваться бесплатно", login: "Уже есть аккаунт? Войти",
    dismiss: "Продолжить изучать каталог",
    note: "Каталог, описания, поиск и трейлеры доступны без регистрации.",
    close: "Закрыть",
  },
  en: {
    headline: "Keep watching on KinoLab 🎬",
    desc: "You've reached your 5 free movie limit. Sign up for free to keep watching and use KinoLab AI.",
    action: "Create a free account", login: "Already have an account? Sign in",
    dismiss: "Keep browsing the catalog",
    note: "You can still browse titles, descriptions, search and trailers without an account.",
    close: "Close",
  },
};

export default function GuestSignupPrompt({ language, onClose, onRegister, onLogin }) {
  const t = words[language] || words.hy;
  const mainAction = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    const prior = document.activeElement;
    mainAction.current?.focus();
    return () => { if (prior?.isConnected) prior.focus(); };
  }, []);
  return <div className="guest-gate-overlay" role="presentation" onClick={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="guest-gate-dialog" role="dialog" aria-modal="true"
      aria-labelledby="guestGateTitle" aria-describedby="guestGateDescription"
      ref={dialog}
      onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key !== "Tab") return;
        const controls = [...dialog.current.querySelectorAll("button:not(:disabled)")];
        const first=controls[0],last=controls.at(-1);
        if (event.shiftKey && document.activeElement===first) {
          event.preventDefault();last?.focus();
        } else if (!event.shiftKey && document.activeElement===last) {
          event.preventDefault();first?.focus();
        }
      }}>
      <button className="guest-gate-close" type="button" aria-label={t.close} onClick={onClose}>×</button>
      <p className="guest-gate-brand">KINOLAB · {FREE_GUEST_FILMS}/{FREE_GUEST_FILMS}</p>
      <h2 id="guestGateTitle">{t.headline}</h2>
      <p id="guestGateDescription">{t.desc}</p>
      <button className="btn primary guest-gate-action" type="button"
        ref={mainAction} onClick={onRegister}>{t.action}</button>
      <button className="guest-gate-text-button" type="button" onClick={onLogin}>{t.login}</button>
      <button className="guest-gate-text-button" type="button" onClick={onClose}>{t.dismiss}</button>
      <p className="guest-gate-note">{t.note}</p>
    </section>
  </div>;
}
