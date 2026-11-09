import { useEffect, useState } from "react";
import { initialLanguage } from "../domain";
import { translations } from "../translations";
export function useLanguage() {
  const [language, updateLanguage] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("cinewave:language", language);
    } catch {}
  }, [language]);
  const t = (key, params = {}) =>
    String(
      translations[language]?.[key] ?? translations.en[key] ?? key,
    ).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  const setLanguage = (value) =>
    updateLanguage(["hy", "ru", "en"].includes(value) ? value : "hy");
  return { language, setLanguage, t };
}
