import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CleanWatchPage from "./CleanWatchPage";

vi.mock("../domain", () => ({
  localizedMovie: (movie, lang) => ({
    title: movie.titles[lang] || movie.titles.en,
  }),
}));
afterEach(() => { cleanup(); document.title = "KinoLab"; });

const movie = {
  playbackMode: "clean",
  titles: {hy:"Արշալույս", ru:"Рассвет", en:"Dawn"},
  externalWatch:"https://vkvideo.ru/video-1_2"
};

describe("CleanWatchPage", () => {
  it("renders only the player and the localized movie browser title", () => {
    render(<CleanWatchPage movie={movie} language="hy" ready access locked={false} onBack={()=>{}} />);
    expect(document.title).toBe("Արշալույս");
    expect(screen.getByTitle("Արշալույս").getAttribute("src"))
      .toBe("https://vkvideo.ru/video_ext.php?oid=-1&id=2");
    expect(screen.queryByText(/Watch movie/i)).toBeNull();
    expect(screen.queryByText(/Open original player|Открыть исходный плеер|Բացել սկզբնական փլեյերը/i)).toBeNull();
    expect(document.querySelector('a[target="_blank"]')).toBeNull();
  });
  it("shows the access limit and never loads the iframe before access", () => {
    render(<CleanWatchPage movie={movie} language="en" ready access={false} locked onBack={()=>{}} />);
    expect(screen.getByText(/five free movie choices/)).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });
  it("ignores unsupported provider links even for clean-mode rows", () => {
    render(<CleanWatchPage movie={{...movie,externalWatch:"https://example.org"}} language="en" ready access onBack={()=>{}} />);
    expect(screen.getByText(/unavailable/)).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });
  it("switches a series episode within the same player", () => {
    const url = "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef";
    const series = {
      ...movie, id: "catalog:external:1", mediaType: "tv",
      episodes: [
        {season:1, episode:1, url:movie.externalWatch},
        {season:2, episode:1, url},
      ],
    };
    render(<CleanWatchPage movie={series} language="en" ready access onBack={()=>{}} />);
    const season = screen.getByRole("combobox", { name: "Season" });
    fireEvent.change(season, { target: { value: "2" } });
    expect(screen.getByTitle("Dawn").getAttribute("src")).toBe(url);
    expect(screen.getByRole("combobox", { name: "Episode" }).value).toBe("1");
  });

});
