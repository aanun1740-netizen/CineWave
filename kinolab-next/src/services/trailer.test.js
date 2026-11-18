import { describe, expect, it } from "vitest";
import { trailerEmbedUrl } from "./trailer";

describe("trailerEmbedUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=abcdefghijk&si=shared",
    "https://youtu.be/abcdefghijk?si=shared",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube.com/live/abcdefghijk",
  ])("normalizes YouTube video links to the official player", (url) => {
    expect(trailerEmbedUrl(url)).toBe(
      "https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&playsinline=1",
    );
  });

  it("preserves Vimeo's unlisted video hash", () => {
    expect(trailerEmbedUrl("https://vimeo.com/12345/abc123")).toBe(
      "https://player.vimeo.com/video/12345?h=abc123&autoplay=1",
    );
  });

  it.each([
    "https://youtube.com.example.org/watch?v=abcdefghijk",
    "https://name@youtube.com/watch?v=abcdefghijk",
    "javascript:alert(1)",
    "https://www.youtube.com/playlist?list=abcdefghijk",
  ])("rejects non-video or untrusted URLs", (url) => {
    expect(trailerEmbedUrl(url)).toBeNull();
  });
});
