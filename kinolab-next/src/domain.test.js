import { describe, expect, it } from "vitest";
import {
  mapCatalogMovie,
  filterMovies,
  initialLanguage,
  routeFromHash,
  POSTER_FALLBACK,
  adminModel,
  approvedPlayback,
} from "./domain";
describe("migrated domain contracts", () => {
  it("uses Pages-safe fallback and English default with persisted language", () => {
    expect(initialLanguage()).toBe("en");
    localStorage.setItem("cinewave:language", "ru");
    expect(initialLanguage()).toBe("ru");
    localStorage.setItem("cinewave:language", "invalid");
    expect(initialLanguage()).toBe("en");
    expect(mapCatalogMovie({ id: 1 }).img).toBe(POSTER_FALLBACK);
    expect(POSTER_FALLBACK).toBe("/assets/poster-fallback.svg");
  });
  it("combines search, genres, content type and saved list", () => {
    const rows = [
      mapCatalogMovie({ id: 1, title_en: "Solar", genre_names: ["Drama"] }),
      mapCatalogMovie({
        id: 2,
        title_hy: "Լուսին",
        genre_names: ["Comedy"],
        media_type: "tv",
      }),
    ];
    expect(
      filterMovies(rows, { query: "Լուսին", genre: "Comedy", route: "tv" }).map(
        (row) => row.id,
      ),
    ).toEqual(["catalog:2"]);
    expect(
      filterMovies(rows, { route: "my-list", list: new Set(["catalog:1"]) })
        .length,
    ).toBe(1);
  });
  it("combines multiple genre OR choices, multiple year OR choices and the two groups with AND", () => {
    const rows = [
      mapCatalogMovie({ id: 11, title_en: "A", release_date:"2023-01-01", genre_names:["Drama","Adventure"] }),
      mapCatalogMovie({ id: 12, title_en: "B", release_date:"2024-01-01", genre_names:["Comedy"] }),
      mapCatalogMovie({ id: 13, title_en: "C", release_date:"2025-01-01", genre_names:["Horror"] }),
      mapCatalogMovie({ id: 14, title_en: "D", release_date:"2024-01-01", genre_names:["Drama"] }),
    ];
    expect(filterMovies(rows, {genre:["Drama","Comedy"],year:["2023","2024"]}).map(item=>item.id))
      .toEqual(["catalog:11","catalog:12","catalog:14"]);
    expect(filterMovies(rows, {genre:["Drama"],year:["2024"]}).map(item=>item.id))
      .toEqual(["catalog:14"]);
    expect(filterMovies(rows, {genre:[],year:[]}).length).toBe(4);
  });
  it("finds films by Armenian, Russian, and English descriptions across UI languages", () => {
    const rows = [
      mapCatalogMovie({
        id: 33,
        title_en: "Quiet River",
        title_hy: "Հանգիստ գետ",
        title_ru: "Тихая река",
        overview_en: "A journey through mysterious forests",
        overview_ru: "История о далёкой планете",
        overview_hy: "Պատմություն Արարատ լեռան մասին",
        genre_names: ["Adventure"],
      }),
    ];
    for (const [query, language] of [
      ["mysterious", "hy"], ["ПЛАНЕТЕ", "en"], ["Արարատ", "ru"],
    ]) {
      expect(filterMovies(rows, { query, language }).map(movie => movie.id))
        .toEqual(["catalog:33"]);
    }
    expect(filterMovies(rows, { query: "unrelated", language: "hy" })).toEqual([]);
  });
  it.each(["mp4", "webm", "m3u8"])(
    "accepts %s only with matching playback evidence",
    (extension) => {
      const url = `https://media.invalid/film.${extension}`;
      expect(adminModel.media(url)).toBe(true);
      const movie = {
        video: url,
        approval: {
          watch_url: url,
          license_verified: true,
          playback_verified: true,
          commercial_reuse_verified: true,
          license_source: "https://rights.invalid/proof",
          license_terms_source: "https://rights.invalid/terms",
        },
      };
      expect(approvedPlayback(movie)).toBe(true);
      movie.approval.playback_verified = false;
      expect(approvedPlayback(movie)).toBe(false);
    },
  );
  it("preserves hash routes, recovery tokens and invalid-route fallback", () => {
    expect(routeFromHash("#/watch/catalog%3A1")).toBe("watch/catalog%3A1");
    expect(routeFromHash("#access_token=fixture")).toBe("home");
    expect(routeFromHash("#/unknown")).toBe("home");
  });
});
