import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import EmbeddedMoviePlayer from "./EmbeddedMoviePlayer";

const src = "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef";
const title = "An episode";

afterEach(() => vi.useRealTimers());

it("keeps blocked RUTUBE content behind the recovery panel and retries the same episode", () => {
  vi.useFakeTimers();
  render(<EmbeddedMoviePlayer src={src} title={title} language="en" />);
  const frame = screen.getByTitle(title);
  const ready = (origin, source) => act(() => window.dispatchEvent(new MessageEvent("message", {
    origin, source, data: JSON.stringify({ type: "player:ready" }),
  })));

  fireEvent.load(frame);
  ready("https://example.org", frame.contentWindow);
  ready("https://rutube.ru", window);
  expect(screen.getByRole("status").textContent).toBe("Loading the player…");
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole("status").textContent).toBe("The player couldn’t load.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  const retryFrame = screen.getByTitle(title);
  expect(retryFrame).not.toBe(frame);
  expect(retryFrame.getAttribute("src")).toBe(src);
  ready("https://rutube.ru", retryFrame.contentWindow);
  expect(screen.queryByRole("status")).toBeNull();
  expect(retryFrame.getAttribute("tabindex")).toBe("0");
});

it("lets a TV viewer reveal the embedded player when its ready message never arrives", () => {
  vi.useFakeTimers();
  render(<EmbeddedMoviePlayer src={src} title={title} language="en" />);
  act(() => vi.advanceTimersByTime(12000));
  fireEvent.click(screen.getByRole("button", { name: "Try playback" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByTitle(title).getAttribute("tabindex")).toBe("0");
  expect(document.activeElement).toBe(screen.getByTitle(title));
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});
