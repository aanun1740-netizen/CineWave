import { useEffect, useState } from "react";

const labels = { en: "Back to top", ru: "Наверх", hy: "Վերադառնալ վերև" };

export default function BackToTop({ language }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY >= 220);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
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
