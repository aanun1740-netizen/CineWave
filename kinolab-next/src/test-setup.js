import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  document.body.className = "cinewave-site";
  history.replaceState(null, "", "/CineWave-Test-/");
});
window.scrollTo = vi.fn();
window.matchMedia = vi.fn(() => ({
  matches: true,
  addEventListener() {},
  removeEventListener() {},
}));
Element.prototype.scrollBy = vi.fn();
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
HTMLMediaElement.prototype.load = vi.fn();
HTMLMediaElement.prototype.pause = vi.fn();
HTMLMediaElement.prototype.play = vi.fn(async () => {});
// Unmocked requests must fail immediately; no database or media network access in tests.
globalThis.fetch = vi.fn(() =>
  Promise.reject(new Error("Unmocked network forbidden")),
);
