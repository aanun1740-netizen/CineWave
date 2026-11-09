import { describe, expect, it } from "vitest";
import { allowedExternalEpisode, allowedExternalMovie, allowedExternalWatch } from "./external-links";

describe("KinoLab outbound web links", () => {
  it.each([
    "https://api.variyt.ws/embed/movie/88585",
    "https://api.nextembed.ws/embed/movie/92733",
    "https://example.com/watch/film?id=123",
    "http://example.org/cinema/my-movie",
    "https://www.youtube.com/watch?v=abcdefghijk",
  ])("accepts ordinary movie website URLs: %s", (url) => {
    expect(allowedExternalMovie(url)).toBe(true);
    expect(allowedExternalWatch(url)).toBe(true);
  });
  it("keeps the existing NextEmbed-only episode helper", () => {
    expect(allowedExternalEpisode("https://api.nextembed.ws/embed/tv/1399/1/2")).toBe(true);
    expect(allowedExternalEpisode("https://api.variyt.ws/embed/tv/1399/1/2")).toBe(false);
    expect(allowedExternalEpisode("https://example.com/tv/episode")).toBe(false);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/film",
    "https://user:pass@example.com/video",
    "https://example.com/film\nmalicious",
    "",
    null,
  ])("rejects unsafe or malformed outbound links: %s", (url) => {
    expect(allowedExternalWatch(url)).toBe(false);
  });
});
