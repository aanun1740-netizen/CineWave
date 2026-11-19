import assert from "node:assert/strict";
import test from "node:test";
import { genreRecommendations } from "./recommendations.ts";

const films = [
  { id: "1", title_en: "Sad Story", genre_names: ["Drama"], release_date: "2026-01-01" },
  { id: "2", title_en: "Mixed Story", genre_names: ["Comedy / Драма"], release_date: "2025-01-01" },
  { id: "3", title_en: "Lively Story", genre_names: ["Կատակերգություն", "Family"], release_date: "2024-01-01" },
  { id: "4", title_en: "Another Laugh", genre_names: ["Комедии"], release_date: "2023-01-01" },
];

for (const text of ["խնդալու բան բեր", "ծիծաղելու մի լավ ֆիլմ", "Посоветуй что-нибудь смешное", "Give me something funny"]) {
  test(`matches the requested light mood for ${text}`, () => {
    const result = genreRecommendations(text, films, "");
    assert.equal(result.simple, true);
    assert.deepEqual(result.films.map(film => film.id), ["3", "4"]);
  });
}

test("honors an explicit exclusion or a different mood", () => {
  assert.deepEqual(genreRecommendations("կատակերգություն առանց դրամայի", films, "").films.map(film => film.id), ["3", "4"]);
  assert.equal(genreRecommendations("լացելու բան բեր", films, "").films[0].id, "1");
});

test("keeps other criteria in the chat and distinguishes no match from a general question", () => {
  const dated = genreRecommendations("A funny movie from 2023", films, "");
  assert.equal(dated.simple, false);
  assert.deepEqual(dated.films.map(film => film.id), ["3", "4"]);
  assert.deepEqual(genreRecommendations("խնդալու բան բեր", films.slice(0, 2), "").films, []);
  assert.equal(genreRecommendations("What is a comedy?", films, ""), null);
  assert.equal(genreRecommendations("Is Sad Story funny?", films, ""), null);
});
