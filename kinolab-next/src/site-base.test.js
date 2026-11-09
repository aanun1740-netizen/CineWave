import { describe, expect, it } from "vitest";
import { siteBase } from "./site-base";

describe("portable KinoLab public URLs", () => {
  it.each([
    ["/", "/"],
    ["/index.html", "/"],
    ["/admin/", "/"],
    ["/admin/index.html", "/"],
    ["/CineWave/", "/CineWave/"],
    ["/CineWave/index.html", "/CineWave/"],
    ["/CineWave/admin/", "/CineWave/"],
    ["/CineWave/admin/index.html", "/CineWave/"],
  ])("resolves %s to %s", (input, expected) => {
    expect(siteBase(input)).toBe(expected);
  });
});
