import { useEffect, useState } from "react";

const labels = { en: "Back to top", ru: "Наверх", hy: "Վերադառնալ վերև" };

export default function BackToTop({ language }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const { scrollHeight, clientHeight } = document.documentElement;
      const threshold = Math.min(120, (scrollHeight - clientHeight) / 2);
      setVisible(window.scrollY > 0 && window.scrollY >= threshold);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!visible) return null;
  const label = labels[language] || labels.en;

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("catalog")?.focus({ preventScroll: true });
  }

  return (
    <button type="button" className="back-to-top" aria-label={label} title={label} onClick={goToTop}>
      <span aria-hidden="true">↑</span>
    </button>
  );
}
