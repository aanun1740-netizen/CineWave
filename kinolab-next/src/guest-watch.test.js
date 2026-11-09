import { beforeEach, describe, expect, it } from "vitest";
import {
  FREE_GUEST_FILMS, GUEST_FILMS_KEY, readGuestFilms,
  saveGuestFilms, attemptGuestFilm, cleanGuestFilms,
} from "./guest-watch";

beforeEach(() => localStorage.clear());

describe("five distinct guest movies", () => {
  it("opens five different movies without registration, and blocks only the sixth new choice", () => {
    let choices=[];
    for(let i=1;i<=FREE_GUEST_FILMS;i++){
      const result=attemptGuestFilm("catalog:external:"+i,choices);
      expect(result.allowed).toBe(true);
      choices=result.films;
    }
    expect(choices).toHaveLength(5);
    const sixth=attemptGuestFilm("catalog:external:6",choices);
    expect(sixth.allowed).toBe(false);
    expect(sixth.films).toEqual(choices);
    expect(attemptGuestFilm("catalog:external:1",choices)).toEqual({allowed:true,films:choices});
  });
  it("persists five film choices per browser, never a visitor ID or URL", () => {
    saveGuestFilms(["catalog:external:1","catalog:external:2"]);
    expect(localStorage.getItem(GUEST_FILMS_KEY)).toContain("catalog:external:1");
    expect(readGuestFilms()).toEqual(["catalog:external:1","catalog:external:2"]);
    expect(attemptGuestFilm("catalog:external:3",readGuestFilms()).allowed).toBe(true);
  });
  it("ignores invalid stored data, repeated IDs and injected watch URLs", () => {
    expect(cleanGuestFilms(["catalog:1","catalog:1","https://movies.example/stream",
      "catalog:external:2","catalog:external:3","catalog:external:4",
      "catalog:external:5","catalog:external:6"])).toEqual([
      "catalog:1","catalog:external:2","catalog:external:3","catalog:external:4","catalog:external:5",
    ]);
    expect(attemptGuestFilm("https://movies.example/stream",[]).allowed).toBe(false);
    localStorage.setItem(GUEST_FILMS_KEY,"invalid JSON");
    expect(readGuestFilms()).toEqual([]);
  });
});
