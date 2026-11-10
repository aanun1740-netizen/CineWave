import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  getSession: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  role: vi.fn(),
  from: vi.fn(),
  signOut: vi.fn(),
  authCallback: null,
}));
vi.mock("./services/backend", () => ({
  base: "/CineWave-Test-/",
  config: { url: "https://zayssiouqexwdicudalc.supabase.co", key: "fixture" },
  backendFetch: mocks.backendFetch,
  signOut: mocks.signOut,
  client: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
    },
    rpc: mocks.role,
    from: mocks.from,
  },
}));
import App from "./App";
import Admin from "./Admin";
import AI from "./components/AI";
import { translations } from "./translations";
const proof = (url) => ({
  watch_url: url,
  license_verified: true,
  playback_verified: true,
  commercial_reuse_verified: true,
  license_source: "https://rights.invalid/evidence",
  license_terms_source: "https://rights.invalid/terms",
});
const films = [
  {
    id: "1",
    title_en: "Solar Story",
    title_hy: "Արևի պատմություն",
    title_ru: "Солнечная история",
    release_date: "2024-01-01",
    genre_names: ["Drama"],
    watch_url: "https://media.invalid/film.webm",
    playback_verification: proof("https://media.invalid/film.webm"),
  },
  {
    id: "2",
    title_en: "Moon Show",
    title_hy: "Լուսնի սերիալ",
    release_date: "2023-01-01",
    media_type: "tv",
    genre_names: ["Comedy"],
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  // Older tests explicitly exercise the Armenian UI; the public default is English.
  localStorage.setItem("cinewave:language", "hy");
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.backendFetch.mockResolvedValue({ ok: true, json: async () => films });
  mocks.role.mockResolvedValue({ data: false, error: null });
  mocks.signOut.mockResolvedValue({ failed: false });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ films: [] }) });
});
describe("React storefront", () => {
  it("opens in English for new visitors, lets them choose Russian, and remembers it on reload", async () => {
    localStorage.removeItem("cinewave:language");
    const user = userEvent.setup();
    const view = render(<App />);
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(screen.getByRole("searchbox").placeholder).toBe("Search titles...");
    expect(localStorage.getItem("cinewave:language")).toBe("en");
    await user.selectOptions(screen.getByRole("combobox"), "ru");
    await waitFor(() => expect(localStorage.getItem("cinewave:language")).toBe("ru"));
    view.unmount();
    render(<App />);
    await waitFor(() => expect(document.documentElement.lang).toBe("ru"));
    expect(screen.getByRole("searchbox").placeholder).toBe("Поиск фильмов...");
  });
  it("preserves an existing Armenian preference, searches multilingual titles, filters TV and changes language", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText("Արևի պատմություն");
    expect(document.documentElement.lang).toBe("hy");
    await user.type(screen.getByRole("searchbox"), "Солнечная");
    expect(screen.queryByText("Լուսնի սերիալ")).toBeNull();
    expect(
      within(document.querySelector("#catalogSection")).getByText(
        "Արևի պատմություն",
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Մաքրել որոնումը" }));
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Գլխավոր նավարկում" }),
      ).getByText("Սերիալներ"),
    );
    expect(screen.getByText("Լուսնի սերիալ")).toBeTruthy();
    expect(
      within(document.querySelector("#catalogSection")).queryByText(
        "Արևի պատմություն",
      ),
    ).toBeNull();
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("searchbox").placeholder).toBe("Search titles...");
    expect(
      within(document.querySelector(".discovery-note")).getByRole("button", {
        name: "Ask KinoLab AI",
      }),
    ).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox"), "ru");
    expect(
      within(document.querySelector(".discovery-note")).getByRole("button", {
        name: "Спросить KinoLab AI",
      }),
    ).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox"), "hy");
    expect(
      within(document.querySelector(".discovery-note")).getByRole("button", {
        name: "Հարցնել KinoLab AI-ին",
      }),
    ).toBeTruthy();
  });
  it("links the privacy and aggregate-measurement notice in all three UI languages", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText("Արևի պատմություն");
    const link = screen.getByRole("link", { name: "Գաղտնիություն և այցելությունների հաշվառում" });
    expect(link.getAttribute("href")).toBe("/CineWave-Test-/privacy.html");
    await user.selectOptions(screen.getByRole("combobox"), "ru");
    expect(screen.getByRole("link", { name: "Конфиденциальность и статистика" })).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(screen.getByRole("link", { name: "Privacy & usage analytics" })).toBeTruthy();
  });
  it("allows exactly five distinct external films for guests and prompts on a sixth", async () => {
    const movies = Array.from({length:6},(_,index)=>({
      id:index+1,
      title_en:"Guest film "+(index+1),
      title_hy:"Հյուրի ֆիլմ "+(index+1),
      media_type:"movie",
      genre_names:["Drama"],
      release_date:"2026-01-01",
      is_published:true,
      external_watch_url:"https://films.example.org/watch/"+(index+1),
    }));
    mocks.backendFetch.mockImplementation(async url=>({
      ok:true,
      json:async()=>String(url).includes("kinolab_external_catalog") ? movies : [],
    }));
    render(<App />);
    await waitFor(()=>expect(document.querySelector('[data-id="catalog:external:1"] a.play-overlay')).toBeTruthy());
    for(let i=1;i<=5;i++){
      const card=document.querySelector(`[data-id="catalog:external:${i}"]`);
      const link=card.querySelector("a.play-overlay");
      expect(link?.getAttribute("href")).toBe("https://films.example.org/watch/"+i);
      fireEvent.click(link);
      expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(i);
    }
    expect(document.querySelector('[data-id="catalog:external:6"] a.play-overlay')).toBeNull();
    const blocked=document.querySelector('[data-id="catalog:external:6"] button.play-overlay');
    expect(blocked).toBeTruthy();
    fireEvent.click(blocked);
    expect(screen.getByRole("dialog",{name:"Շարունակիր դիտել KinoLab-ում 🎬"})).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(5);
    fireEvent.click(screen.getByRole("button",{name:"Շարունակել ուսումնասիրել կատալոգը"}));
    // A previously selected film remains free to reopen.
    const first=document.querySelector('[data-id="catalog:external:1"] a.play-overlay');
    expect(first).toBeTruthy();
    fireEvent.click(first);
    expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(5);
    fireEvent.click(blocked);
    fireEvent.click(screen.getByRole("button",{name:"Գրանցվել անվճար"}));
    expect(location.hash).toBe("#/register");
  });

  it("automatically gates a newly published film even from an outbound link with no per-film handler", async () => {
    localStorage.setItem("kinolab:guest-films-v1", JSON.stringify([
      "catalog:external:1", "catalog:external:2", "catalog:external:3",
      "catalog:external:4", "catalog:external:5",
    ]));
    // A new entry uses the normal published-catalog feed: no manual setup.
    const film = {
      id: 113, title_en: "Newly added film", title_hy: "Նոր ֆիլմ",
      genre_names: ["Drama"], release_date: "2026-11-10",
      is_published: true, media_type: "movie",
      external_watch_url: "https://films.example.org/watch/newly-added",
    };
    mocks.backendFetch.mockImplementation(async url => ({
      ok: true,
      json: async () => String(url).includes("kinolab_external_catalog") ? [film] : [],
    }));
    render(<App />);
    await waitFor(() => expect(document.querySelector('[data-id="catalog:external:113"] button.play-overlay')).toBeTruthy());
    // Simulate a future catalog component rendering a plain outbound anchor,
    // without the onOutbound prop used by older movie cards.
    const outbound = document.createElement("a");
    outbound.href = film.external_watch_url;
    outbound.textContent = "Open external film";
    document.body.appendChild(outbound);
    try {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      const allowed = outbound.dispatchEvent(event);
      expect(allowed).toBe(false);
      expect(event.defaultPrevented).toBe(true);
      expect(await screen.findByRole("dialog", { name: "Շարունակիր դիտել KinoLab-ում 🎬" })).toBeTruthy();
      expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(5);
    } finally {
      outbound.remove();
    }
  });

  it("blocks a sixth film from its detail view while keeping the title readable", async () => {
    localStorage.setItem("kinolab:guest-films-v1",JSON.stringify([
      "catalog:external:1","catalog:external:2","catalog:external:3",
      "catalog:external:4","catalog:external:5",
    ]));
    const film={
      id:6, title_en:"Sixth movie",title_hy:"Վեցերորդ ֆիլմ",
      genre_names:["Drama"],release_date:"2026-01-01",
      is_published:true,media_type:"movie",
      external_watch_url:"https://films.example.org/watch/6",
    };
    mocks.backendFetch.mockImplementation(async url=>({
      ok:true,json:async()=>String(url).includes("kinolab_external_catalog")?[film]:[],
    }));
    render(<App />);
    await waitFor(()=>expect(document.querySelector('[data-id="catalog:external:6"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-id="catalog:external:6"]'));
    const details=await screen.findByRole("dialog",{name:"Վեցերորդ ֆիլմ"});
    expect(within(details).getByText("Վեցերորդ ֆիլմ")).toBeTruthy();
    expect(within(details).queryByRole("link",{name:"Դիտել ֆիլմը"})).toBeNull();
    fireEvent.click(within(details).getByRole("button",{name:"Դիտել ֆիլմը"}));
    expect(screen.getByRole("dialog",{name:"Շարունակիր դիտել KinoLab-ում 🎬"})).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(5);
  });

  it("does not start direct internal video playback through a pasted hash after five guest films", async () => {
    localStorage.setItem("kinolab:guest-films-v1",JSON.stringify([
      "catalog:external:1","catalog:external:2","catalog:external:3",
      "catalog:external:4","catalog:external:5",
    ]));
    history.replaceState(null,"","#/watch/catalog%3A1");
    render(<App />);
    expect(await screen.findByRole("dialog",{name:"Շարունակիր դիտել KinoLab-ում 🎬"})).toBeTruthy();
    expect(location.hash).not.toContain("#/watch/");
    expect(document.querySelector(".modal video")).toBeNull();
  });

  it("does not apply the guest limit to signed-in members", async () => {
    localStorage.setItem("kinolab:guest-films-v1",JSON.stringify([
      "catalog:external:11","catalog:external:12","catalog:external:13",
      "catalog:external:14","catalog:external:15",
    ]));
    mocks.getSession.mockResolvedValue({data:{session:{
      user:{id:"member-1",email:"member@example.invalid"},access_token:"stub"
    }},error:null});
    const profileQuery={
      select:vi.fn(()=>profileQuery),
      eq:vi.fn(()=>profileQuery),
      maybeSingle:vi.fn(async()=>({data:{preferred_language:"hy"},error:null})),
    };
    const listQuery={
      select:vi.fn(()=>listQuery),
      eq:vi.fn(async()=>({data:[],error:null})),
    };
    mocks.from.mockImplementation(table => table==="profiles"?profileQuery:listQuery);
    const film={id:16,title_en:"Sixth film",title_hy:"Վեցերորդ ֆիլմը",
      external_watch_url:"https://films.example.org/watch/16",media_type:"movie",
      is_published:true,genre_names:["Drama"],release_date:"2026-01-01"};
    mocks.backendFetch.mockImplementation(async url=>({
      ok:true,json:async()=>String(url).includes("kinolab_external_catalog")?[film]:[],
    }));
    render(<App />);
    await waitFor(()=>expect(document.querySelector('[data-id="catalog:external:16"] a.play-overlay')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-id="catalog:external:16"] a.play-overlay'));
    expect(screen.queryByRole("dialog",{name:"Շարունակիր դիտել KinoLab-ում 🎬"})).toBeNull();
    expect(JSON.parse(localStorage.getItem("kinolab:guest-films-v1"))).toHaveLength(5);
  });

  it("shows a published movie with any normal external website link, without an embedded player", async () => {
    const watchUrl="https://films.example.org/play/88585";
    const row={
      id:88,
      title_en:"External Movie",
      title_hy:"Արտաքին ֆիլմ",
      release_date:"2026-01-01",
      genre_names:["Thriller"],
      media_type:"movie",
      is_published:true,
      external_watch_url:watchUrl,
    };
    mocks.backendFetch.mockImplementation(async url=>({
      ok:true,
      json:async()=>String(url).includes("kinolab_external_catalog") ? [row] : [],
    }));
    const user=userEvent.setup();
    render(<App />);
    await waitFor(()=>expect(document.querySelector('[data-id="catalog:external:88"]')).toBeTruthy());
    // The card must distinguish an external viewing link from catalog-only titles.
    const card = document.querySelector('[data-id="catalog:external:88"]');
    expect(card.querySelector(".poster-badge")?.textContent).toBe("Արտաքին հղում");
    const filmPage = card.querySelector("a.film-page-link");
    expect(filmPage?.getAttribute("href")).toMatch(/\/film\/88\/$/);
    expect(filmPage?.textContent).toContain("Ֆիլմի էջ");
    // Ordinary movie-card click still opens the original KinoLab modal.
    await user.click(card);
    const dialog=await screen.findByRole("dialog",{name:"Արտաքին ֆիլմ"});
    const link=within(dialog).getByRole("link",{name:"Դիտել ֆիլմը"});
    expect(link.getAttribute("href")).toBe(watchUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(dialog.querySelector("iframe")).toBeNull();
  });
  it("shows an external movie trailer in the hero and movie details", async () => {
    const trailer = "https://www.youtube.com/watch?v=abcdefghijk";
    const movie = {
      id: 55,
      title_en: "Trailer Test Film",
      title_hy: "Թրեյլերի փորձարկում",
      release_date: "2026-01-01",
      genre_names: ["Drama"],
      is_published: true,
      external_watch_url: "https://api.nextembed.ws/embed/movie/92733",
      trailer_url: trailer,
    };
    mocks.backendFetch.mockImplementation(async (url) => ({
      ok: true,
      json: async () => String(url).includes("kinolab_external_catalog") ? [movie] : [],
    }));
    const user = userEvent.setup();
    render(<App />);
    const heroTrailer = await screen.findByRole("link", { name: "Թրեյլեր" });
    expect(heroTrailer.getAttribute("href")).toBe(trailer);
    expect(heroTrailer.getAttribute("target")).toBe("_blank");
    await user.click(document.querySelector('[data-id="catalog:external:55"]'));
    const dialog = await screen.findByRole("dialog", { name: "Թրեյլերի փորձարկում" });
    const dialogTrailer = within(dialog).getByRole("link", { name: "Դիտել թրեյլերը" });
    expect(dialogTrailer.getAttribute("href")).toBe(trailer);
    expect(dialogTrailer.getAttribute("target")).toBe("_blank");
  });
  it("lists external TV series in TV Shows and shows season episode links", async () => {
    const episode1="https://api.nextembed.ws/embed/tv/12345/1/1";
    const episode2="https://api.nextembed.ws/embed/tv/12345/1/2";
    const series={
      id: 77,
      title_en: "Test TV Show",
      title_hy: "Փորձնական սերիալ",
      release_date: "2026-01-01",
      media_type: "tv",
      is_published: true,
      genre_names: ["Drama"],
      external_watch_url: episode1,
      episode_links: [
        {season:1,episode:1,url:episode1},
        {season:1,episode:2,url:episode2},
      ],
    };
    mocks.backendFetch.mockImplementation(async (url)=>({
      ok:true,
      json:async()=>String(url).includes("kinolab_external_catalog")?[series]:[],
    }));
    const user=userEvent.setup();
    render(<App />);
    await waitFor(()=>expect(document.querySelector('[data-id="catalog:external:77"]')).toBeTruthy());
    await user.click(within(screen.getByRole("navigation", {name:"Գլխավոր նավարկում"})).getByText("Սերիալներ"));
    const catalog=document.getElementById("catalogSection");
    expect(within(catalog).getByText("Փորձնական սերիալ")).toBeTruthy();
    await user.click(catalog.querySelector('[data-id="catalog:external:77"]'));
    const dialog=await screen.findByRole("dialog", {name:"Փորձնական սերիալ"});
    const links=within(dialog).getAllByRole("link");
    expect(links.some(link=>link.getAttribute("href")===episode1)).toBe(true);
    expect(links.some(link=>link.getAttribute("href")===episode2)).toBe(true);
    expect(within(dialog).getByText("Սեզոններ և սերիաներ")).toBeTruthy();
  });
  it("switches between accessible dark and light themes and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText("Արևի պատմություն");
    expect(document.body.dataset.theme).toBe("dark");
    const light = screen.getByRole("button", { name: "Միացնել բաց ռեժիմը" });
    await user.click(light);
    expect(document.body.dataset.theme).toBe("light");
    expect(localStorage.getItem("kinolab:theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(document.body.dataset.theme).toBe("dark");
    expect(localStorage.getItem("kinolab:theme")).toBe("dark");
  });
  it("restores saved light mode when opening the storefront again", async () => {
    localStorage.setItem("kinolab:theme", "light");
    render(<App />);
    await screen.findAllByText("Արևի պատմություն");
    expect(document.body.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Միացնել մուգ ռեժիմը" })).toBeTruthy();
  });
  it("saves guest My List and opens/reloads hash movie routes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText("Արևի պատմություն");
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
    const hero = document.querySelector(".hero");
    await user.click(within(hero).getByRole("button", { name: "Իմ ցանկը" }));
    expect(JSON.parse(localStorage.getItem("cinewave:my-list"))).toEqual([
      "catalog:1",
    ]);
    await user.click(
      within(
        screen.getByRole("navigation", { name: "Գլխավոր նավարկում" }),
      ).getByText("Իմ ցանկը"),
    );
    expect(screen.queryByText("Լուսնի սերիալ")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Արևի պատմություն — Դիտել հիմա" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Արևի պատմություն" });
    expect(location.hash).toContain("movie/");
    await user.click(within(dialog).getByRole("button", { name: "Փակել" }));
    expect(location.hash).toBe("#/my-list");
  });
  it("shows external films even when the legacy movie or metadata API is unavailable", async () => {
    const row = {
      id: 99, title_en: "Public Film", title_hy: "Հանրային ֆիլմ",
      genre_names: ["Drama"], media_type: "movie",
      external_watch_url: "https://example.com/film/99", is_published: true,
    };
    mocks.backendFetch.mockImplementation(async (url) => {
      if (String(url).includes("kinolab_external_catalog"))
        return { ok: true, json: async () => [row] };
      throw Error("temporarily unavailable");
    });
    render(<App />);
    await waitFor(() =>
      expect(document.querySelector('[data-id="catalog:external:99"]')).toBeTruthy());
    expect(screen.queryByText("Չհաջողվեց բեռնել հավաքածուն։ Փորձեք կրկին։")).toBeNull();
  });

  it("renders recoverable catalog errors only when all sources fail and retries safely", async () => {
    mocks.backendFetch.mockRejectedValue(Error("offline"));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Չհաջողվեց բեռնել հավաքածուն։ Փորձեք կրկին։");
    mocks.backendFetch.mockResolvedValue({ ok: true, json: async () => films });
    await user.click(screen.getByRole("button", { name: "Փորձել կրկին" }));
    await screen.findAllByText("Արևի պատմություն");
    expect(mocks.backendFetch).toHaveBeenCalledTimes(6);
    expect(mocks.backendFetch).toHaveBeenCalledWith(
      expect.stringContaining("/kinolab_external_catalog?"),
      expect.any(Object),
    );
  });
  it("preserves WebM playback, progress and Continue Watching", async () => {
    localStorage.setItem(
      "cinewave:playback:catalog:1",
      JSON.stringify({ time: 30, duration: 100 }),
    );
    history.replaceState(null, "", "#/watch/catalog%3A1");
    render(<App />);
    const dialog = await screen.findByRole("dialog", {
      name: "Արևի պատմություն",
    });
    await waitFor(() =>
      expect(dialog.querySelector("video")?.src).toBe(
        "https://media.invalid/film.webm",
      ),
    );
    expect(screen.getByText("Շարունակել դիտումը")).toBeTruthy();
  });
  it("restores a signed-in member's saved language after reload", async () => {
    localStorage.setItem("cinewave:language", "en");
    document.documentElement.lang = "en";
    const session = {
      user: { id: "member-1", email: "member@example.invalid" },
    };
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const profileQuery = {
      select: vi.fn(() => profileQuery),
      eq: vi.fn(() => profileQuery),
      maybeSingle: vi.fn(async () => ({
        data: { display_name: "Test User", preferred_language: "hy" },
        error: null,
      })),
    };
    const listQuery = {
      select: vi.fn(() => listQuery),
      eq: vi.fn(async () => ({ data: [], error: null })),
    };
    mocks.from.mockImplementation((table) =>
      table === "profiles" ? profileQuery : listQuery,
    );
    render(<App />);
    await waitFor(() =>
      expect(localStorage.getItem("cinewave:language")).toBe("hy"),
    );
    expect(document.documentElement.lang).toBe("hy");
    expect(screen.getByRole("searchbox").placeholder).toBe("Որոնել ֆիլմ...");
  });
  it("places the AI entry after account forms without duplicate floating actions", async () => {
    history.replaceState(null, "", "#/register");
    render(<App />);
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled());
    const formSection = document.querySelector(".account-pages");
    const aiSlot = document.querySelector(".account-ai-slot");
    expect(formSection).toBeTruthy();
    expect(aiSlot?.previousElementSibling).toBe(formSection);
    expect(aiSlot?.querySelector("#cw-ai-button")).toBeTruthy();
    expect(document.querySelectorAll("#cw-ai-button")).toHaveLength(1);
    expect(document.querySelectorAll(".account-links button")).toHaveLength(4);
  });
  it("accepts an eight-character registration password, while rejecting seven", async () => {
    history.replaceState(null, "", "#/register");
    const user = userEvent.setup();
    render(<App />);
    const pass = await screen.findByLabelText("Նոր գաղտնաբառ (առնվազն 8 նիշ)");
    const repeat = screen.getByLabelText("Կրկնել գաղտնաբառը");
    expect(pass.minLength).toBe(8);
    expect(repeat.minLength).toBe(8);
    await user.type(pass, "Kino202");
    await user.type(repeat, "Kino202");
    expect(pass.checkValidity()).toBe(false);
    expect(repeat.checkValidity()).toBe(false);
    await user.type(pass, "6");
    await user.type(repeat, "6");
    expect(pass.checkValidity()).toBe(true);
    expect(repeat.checkValidity()).toBe(true);
    await user.type(screen.getByLabelText("Էլեկտրոնային հասցե"), "viewer@example.invalid");
    await user.type(screen.getByLabelText("Ցուցադրվող անուն"), "Viewer");
    await user.click(within(document.querySelector(".account-form")).getByRole("button", {name:"Ստեղծել հաշիվ"}));
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "viewer@example.invalid", password: "Kino2026",
    })));
  });
  it("submits sign-in through existing Supabase auth and handles failure", async () => {
    mocks.signIn.mockResolvedValue({ error: Error("bad credentials") });
    history.replaceState(null, "", "#/login");
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText("Էլեկտրոնային հասցե"),
      "guest@example.invalid",
    );
    await user.type(screen.getByLabelText("Գաղտնաբառ"), "wrong-password");
    await user.click(
      within(document.querySelector(".account-form")).getByRole("button", {
        name: "Մուտք գործել",
        exact: true,
      }),
    );
    await screen.findByText(
      "Չհաջողվեց ավարտել գործողությունը։ Ստուգեք կապը և փորձեք կրկին։",
    );
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "guest@example.invalid",
      password: "wrong-password",
    });
    expect(screen.getByLabelText("Գաղտնաբառ").value).toBe("");
  });
});
describe("KinoLab AI guest and quota messages", () => {
  const t = (key) => translations.hy[key] || key;

  it("requires an actual session before contacting the function", async () => {
    const user = userEvent.setup();
    render(<AI open={true} setOpen={vi.fn()} t={t} />);
    const field = screen.getByRole("textbox", { name: "Ձեր հաղորդագրությունը" });
    expect(field.maxLength).toBe(400);
    await user.type(field, "Բարև");
    await user.click(screen.getByRole("button", { name: "Ուղարկել հաղորդագրությունը" }));
    expect(await screen.findByText(translations.hy.aiSignIn)).toBeTruthy();
    expect(mocks.backendFetch).not.toHaveBeenCalled();
  });

  it("shows a meaningful daily quota message instead of a generic error", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "user-jwt-test" } },
      error: null,
    });
    mocks.backendFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "daily_limit" }),
    });
    const user = userEvent.setup();
    render(<AI open={true} setOpen={vi.fn()} t={t} />);
    await user.type(
      screen.getByRole("textbox", { name: "Ձեր հաղորդագրությունը" }),
      "Պատմական ֆիլմ",
    );
    await user.click(screen.getByRole("button", { name: "Ուղարկել հաղորդագրությունը" }));
    expect(await screen.findByText(translations.hy.aiDailyLimit)).toBeTruthy();
    expect(mocks.backendFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/functions\/v1\/kinolab-ai-v2$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer user-jwt-test" }),
      }),
    );
  });
});

describe("React admin", () => {
  it("opens KinoLab Studio in English for new visitors and keeps their language choice", async () => {
    localStorage.removeItem("cinewave:language");
    const user = userEvent.setup();
    render(<Admin />);
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(screen.getByRole("button", { name: "Sign in securely" })).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Language / Язык / Լեզու"), "hy");
    await waitFor(() => expect(localStorage.getItem("cinewave:language")).toBe("hy"));
    expect(document.documentElement.lang).toBe("hy");
  });
  it("denies non-admin sessions without querying movie data", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "guest@example.invalid" } } },
    });
    render(<Admin />);
    await screen.findByText(
      "Մուտքը մերժված է։ Այս հաշիվը KinoLab-ի ադմինիստրատորի իրավունքներ չունի։",
    );
    expect(
      document.querySelector(".access .brand img")?.getAttribute("alt"),
    ).toBe("KinoLab");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Language / Язык / Լեզու"), "ru");
    expect(
      screen.getByText(
        "Доступ запрещён. У этого аккаунта нет прав администратора KinoLab.",
      ),
    ).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Language / Язык / Լեզու"), "en");
    expect(
      screen.getByText(
        "Access denied. This account is not an authorized KinoLab administrator.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("← Back to KinoLab")).toBeTruthy();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("loads authorized library, validates editor and confirms deletion without a write", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "admin@example.invalid" } } },
    });
    mocks.role.mockResolvedValue({ data: true });
    const chain = {
      select: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(async () => ({
        data: [
          {
            ...films[0],
            is_published: false,
            rights_verification_status: "unverified",
            updated_at: "fixture",
          },
        ],
      })),
    };
    const externalChain = {
      select: vi.fn(() => externalChain),
      order: vi.fn(() => externalChain),
      range: vi.fn(async () => ({
        data: [{
          id: 123,
          title_en: "External Feature",
          is_published: true,
          created_at: "2026-11-10T01:00:00Z",
        }],
        error: null,
      })),
    };
    mocks.from.mockImplementation((name) =>
      name === "kinolab_external_catalog" ? externalChain : chain,
    );
    const user = userEvent.setup();
    render(<Admin />);
    await screen.findByText("Solar Story");
    await waitFor(() => {
      expect(document.querySelector(".stats strong")?.textContent).toBe("2");
    });
    expect(screen.getByText("Սովորական ֆիլմեր՝ 1 · Արտաքին հղումով՝ 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Կառավարել արտաքին ֆիլմերը" })).toBeTruthy();
    expect(screen.getByText("KINOLAB ԿԱՌԱՎԱՐՈՒՄ")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "▤ Ֆիլմադարան" }));
    await user.click(screen.getByRole("button", { name: "Ջնջել" }));
    expect(screen.getByRole("button", { name: "Հաստատել" }).disabled).toBe(
      true,
    );
    await user.click(screen.getByRole("button", { name: "Չեղարկել" }));
    expect(chain.range).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Խմբագրել" }));
    expect(screen.getByDisplayValue("Solar Story")).toBeTruthy();
    expect(screen.getByText("Հիմնական MP4, WebM կամ HLS URL")).toBeTruthy();
  });
  it("combines all published legacy and external-link films in admin statistics", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "admin@example.invalid" } } },
    });
    mocks.role.mockResolvedValue({ data: true });
    const movieRows = Array.from({length:24}, (_,i) => ({
      id: i + 1, title_en: "Regular Film "+(i+1), is_published: true,
    }));
    const externalRows = Array.from({length:47}, (_,i) => ({
      id: i + 101, title_en: "External Film "+(i+1), is_published: true,
    }));
    const fakeQuery = (rows) => {
      const query = {
        select: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(async () => ({ data: rows, error: null })),
      };
      return query;
    };
    const oldTable = fakeQuery(movieRows);
    const newTable = fakeQuery(externalRows);
    mocks.from.mockImplementation((table) =>
      table === "kinolab_external_catalog" ? newTable : oldTable,
    );
    render(<Admin />);
    await waitFor(() => {
      expect(document.querySelector(".stats strong")?.textContent).toBe("71");
    });
    expect(screen.getByText("Սովորական ֆիլմեր՝ 24 · Արտաքին հղումով՝ 47")).toBeTruthy();
    const metrics = Array.from(document.querySelectorAll(".stats strong")).map(el => el.textContent);
    expect(metrics.slice(0,3)).toEqual(["71","71","0"]);
    expect(mocks.from).toHaveBeenCalledWith("movies");
    expect(mocks.from).toHaveBeenCalledWith("kinolab_external_catalog");
    expect(oldTable.range).toHaveBeenCalledTimes(1);
    expect(newTable.range).toHaveBeenCalledTimes(1);
  });
});
