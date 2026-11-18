const TV_USER_AGENT = /smart.?tv|android tv|tizen|webos|web0s|vidaa|hbbtv|netcast|hisense|opera tv|viera/i;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]';

function isVisible(element) {
  if (!element.getClientRects().length) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

function center(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function installTvNavigation() {
  if (!TV_USER_AGENT.test(navigator.userAgent)) return;
  document.body.classList.add("tv-navigation");

  document.addEventListener("keydown", (event) => {
    const directions = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction || event.defaultPrevented) return;

    const active = document.activeElement;
    if (active?.matches("input, select, textarea, [contenteditable]") ||
        active?.isContentEditable) return;

    const scope = document.querySelector('[role="dialog"][aria-modal="true"]') || document;
    const candidates = [...scope.querySelectorAll(FOCUSABLE)].filter(isVisible);
    if (!candidates.length) return;

    if (!candidates.includes(active)) {
      const first = candidates.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }) || candidates[0];
      first.focus();
      event.preventDefault();
      return;
    }

    const current = center(active);
    const [dx, dy] = direction;
    let next = null;
    let best = Infinity;
    for (const candidate of candidates) {
      if (candidate === active) continue;
      const position = center(candidate);
      const forward = (position.x - current.x) * dx + (position.y - current.y) * dy;
      if (forward <= 4) continue;
      const sideways = Math.abs((position.x - current.x) * dy - (position.y - current.y) * dx);
      const score = forward + sideways * 2;
      if (score < best) {
        best = score;
        next = candidate;
      }
    }
    if (!next) return;
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
    event.preventDefault();
  });
}
