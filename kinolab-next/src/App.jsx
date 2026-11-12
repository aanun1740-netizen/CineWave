import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { backendFetch, config, base } from "./services/backend";
import { allowedExternalWatch } from "./services/external-links";
import {
  mapCatalogMovie,
  localizedMovie,
  genreLabel,
  availableGenres,
  approvedPlayback,
  externalWatchUrl,
  filterMovies,
  routeFromHash,
  POSTER_FALLBACK,
} from "./domain";
import { useLanguage } from "./hooks/useLanguage";
import useAccount from "./hooks/useAccount";
import Accounts from "./components/Accounts";
import MovieRow, { Artwork } from "./components/MovieRow";
import MovieDialog from "./components/MovieDialog";
import { playback } from "./components/Player";
import { Brand, Icon, Icons } from "./components/Icons";
import AI from "./components/AI";
import ArchiveSearch from "./components/ArchiveSearch";
import { recordMetric } from "./services/analytics";
import { FREE_GUEST_FILMS, GUEST_FILMS_KEY, readGuestFilms, attemptGuestFilm, saveGuestFilms } from "./guest-watch";
import GuestSignupPrompt from "./components/GuestSignupPrompt";
const navs = { home: "home", movies: "movies", tv: "tv", "my-list": "list" };
export default function App() {
  const { language, setLanguage, t } = useLanguage(),
    account = useAccount();
  const [route, setRoute] = useState(routeFromHash),
    [movies, setMovies] = useState([]),
    [state, setState] = useState("loading"),
    [proofs, setProofs] = useState([]),
    [query, setQuery] = useState(""),
    [genre, setGenre] = useState("All"),
    [year, setYear] = useState("All"),
    [heroIndex, setHeroIndex] = useState(0),
    [profile, setProfile] = useState(false),
    [ai, setAI] = useState(false),
    [theme, setTheme] = useState(() => {
      try { return localStorage.getItem("kinolab:theme") === "light" ? "light" : "dark"; }
      catch { return "dark"; }
    }),
    [toast, setToast] = useState(""),
    [guestFilms, setGuestFilms] = useState(readGuestFilms),
    [guestPrompt, setGuestPrompt] = useState(false),
    [, setProgress] = useState(0);
  const underlay = useRef("home"),
    profilePanel = useRef(null),
    toastTimer = useRef(null),
    request = useRef(0),
    countedPageLoad = useRef(false),
    lastTrackedRoute = useRef(null);
  useEffect(() => {
    const seo = {
      hy: {
        title: "KinoLab — Ֆիլմեր և սերիալներ",
        description: "KinoLab — ֆիլմերի և սերիալների կատալոգ հայերեն, ռուսերեն և անգլերեն։ Գտեք նոր պատմություններ և պահպանեք նախընտրածները։",
        locale: "hy_AM",
      },
      ru: {
        title: "KinoLab — Фильмы и сериалы",
        description: "KinoLab — каталог фильмов и сериалов на армянском, русском и английском языках. Находите интересные истории и сохраняйте избранное.",
        locale: "ru_RU",
      },
      en: {
        title: "KinoLab — Movies & Series",
        description: "Discover movies and series on KinoLab in Armenian, Russian, and English. Explore stories and save your favorites.",
        locale: "en_US",
      },
    }[language] || null;
    if (!seo) return;
    document.documentElement.lang = language;
    document.title = seo.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", seo.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", seo.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", seo.description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", seo.locale);
  }, [language]);
  const accountPage = [
    "login",
    "register",
    "profile",
    "forgot",
    "recover",
  ].includes(route);
  const modal = /^(movie|watch)\//.test(route);
  const listing = route in navs ? route : underlay.current;
  const mayCount = account.ready && (!account.session || account.cloudReady) && !account.admin;
  useEffect(() => {
    const sync = (event) => {
      if (!event || event.key === GUEST_FILMS_KEY) setGuestFilms(readGuestFilms());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    // Once signed in, the guest registration prompt is no longer relevant.
    if (account.session) setGuestPrompt(false);
  }, [account.session]);
  useEffect(() => {
    if (!mayCount) return;
    if (!countedPageLoad.current) {
      countedPageLoad.current = true;
      recordMetric("page_view", "", language);
    }
    if (lastTrackedRoute.current === route) return;
    lastTrackedRoute.current = route;
    const match = /^(movie|watch)\/(.+)$/.exec(route);
    if (match) {
      try {
        const key = decodeURIComponent(match[2]);
        // A deep-linked /watch route is not proof of an actual button click.
        if (match[1] === "movie") recordMetric("film_open", key, language);
      } catch { /* Invalid hash: do not send any metrics. */ }
    }
  }, [mayCount, route, language]);
  function navigate(next, replace = false) {
    if (next in navs) {
      underlay.current = next;
      setQuery("");
      setGenre("All");
      setYear("All");
    }
    setProfile(false);
    history[replace ? "replaceState" : "pushState"](null, "", `#/${next}`);
    setRoute(next);
    if (!/^(movie|watch)\//.test(next))
      window.scrollTo({ top: 0, behavior: "auto" });
  }
  useEffect(() => {
    function change() {
      const next = routeFromHash();
      if (next in navs) {
        underlay.current = next;
        setQuery("");
        setGenre("All");
        setYear("All");
      }
      setRoute(next);
    }
    window.addEventListener("hashchange", change);
    window.addEventListener("popstate", change);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("popstate", change);
      clearTimeout(toastTimer.current);
    };
  }, []);
  useLayoutEffect(() => {
    document.body.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#F7F5F0" : "#20152E");
    try { localStorage.setItem("kinolab:theme", theme); } catch {}
  }, [theme]);
  useEffect(() => {
    // Restore the signed-in member's saved language after their profile loads.
    // The device preference is only the fallback for guests or unloaded profiles.
    const savedLanguage = account.profile?.preferred_language;
    if (
      account.session &&
      account.cloudReady &&
      ["hy", "ru", "en"].includes(savedLanguage)
    ) {
      setLanguage(savedLanguage);
    }
  }, [
    account.session?.user.id,
    account.cloudReady,
    account.profile?.preferred_language,
  ]);
  useEffect(() => {
    if (account.recovery) navigate("recover", true);
  }, [account.recovery]);
  useEffect(() => {
    document.body.classList.toggle("account-view", accountPage);
    document.body.classList.toggle(
      "is-browsing",
      Boolean(query || genre !== "All" || year !== "All" || listing !== "home"),
    );
  }, [accountPage, query, genre, year, listing]);
  useEffect(() => {
    function key(e) {
      if (e.key === "Escape") {
        if (ai) setAI(false);
        else if (profile) setProfile(false);
      }
    }
    function outside(e) {
      if (
        profile &&
        !profilePanel.current?.contains(e.target) &&
        !e.target.closest("#profileButton")
      )
        setProfile(false);
    }
    document.addEventListener("keydown", key);
    document.addEventListener("click", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", outside);
    };
  }, [ai, profile]);
  async function loadCatalog() {
    const id = ++request.current;
    setState("loading");
    try {
      const headers = { apikey: config.key, Authorization: `Bearer ${config.key}` };
      // Each catalog source is independent. Keep published movies visible if
      // an optional archive/metadata endpoint is temporarily unavailable.
      const readRows = async (url) => {
        try {
          const response = await backendFetch(url, { headers });
          if (!response.ok) return null;
          const data = await response.json();
          return Array.isArray(data) ? data : null;
        } catch {
          return null;
        }
      };
      const [publishedRows, externalRows] = await Promise.all([
        readRows(`${config.url}/rest/v1/movies?select=*&is_published=eq.true&order=release_date.desc`),
        readRows(`${config.url}/rest/v1/kinolab_external_catalog?select=*&is_published=eq.true&order=created_at.desc`),
      ]);
      if (publishedRows === null && externalRows === null) {
        throw Error("Catalog sources unavailable.");
      }
      if (id === request.current) {
        const rows = publishedRows || [];
        const externalPublished = (externalRows || [])
          .filter(row => allowedExternalWatch(row.external_watch_url))
          .map(row => ({ ...row, id: "external:" + row.id, watch_url:null, embed_url:null,
            playback_verification:null, rights_verification_status:"unverified" }));
        setMovies([...rows, ...externalPublished].map(mapCatalogMovie));
        setState("ready");
      }
    } catch {
      if (id === request.current) setState("error");
    }
  }
  useEffect(() => {
    loadCatalog();
    const abort = new AbortController();
    fetch(`${base}data/playback-films.json`, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data) => setProofs(Array.isArray(data.films) ? data.films : []))
      .catch(() => {});
    return () => {
      ++request.current;
      abort.abort();
    };
  }, []);
  const watchable = useCallback((movie) => approvedPlayback(movie, proofs), [proofs]);
  // Search and unrelated UI updates should not re-sort the entire catalog.
  const choices = useMemo(() => [...movies]
    .sort(
      (a, b) =>
        Number(watchable(b)) - Number(watchable(a)) ||
        Number(b.img !== POSTER_FALLBACK) - Number(a.img !== POSTER_FALLBACK),
    )
    .slice(0, 5), [movies, watchable]);
  // Rotate featured movies every six seconds; preserve manual dot selection.
  useEffect(() => {
    if (choices.length < 2 || route !== "home" || query || genre !== "All" || year !== "All") return;
    const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % choices.length), 6000);
    return () => window.clearInterval(timer);
  }, [choices.length, route, query, genre, year]);
  const featured = choices[heroIndex % Math.max(choices.length, 1)],
    info = featured ? localizedMovie(featured, language) : null;
  const filtered = useMemo(() => filterMovies(movies, {
    query,
    genre,
    year,
    route: listing,
    list: account.list,
    language,
  }), [movies, query, genre, year, listing, account.list, language]);
  let movieId = "";
  try {
    movieId = decodeURIComponent(route.split("/").slice(1).join("/"));
  } catch {}
  const current = movies.find((movie) => movie.id === movieId),
    home = listing === "home" && !query && genre === "All" && year === "All";
  // A pasted /watch hash must not bypass the same 5-film guest allowance.
  // An existing choice is replayable; a new choice consumes one slot.
  useEffect(() => {
    if (!route.startsWith("watch/") || !current || !account.ready ||
        account.session || guestFilms.includes(current.id)) return;
    allowWatch(current);
  }, [route, current?.id, account.ready, account.session, guestFilms]);
  const available = useMemo(() => movies.filter(watchable), [movies, watchable]),
    continuing = available.filter((movie) => {
      const p = playback.progressFor(movie.id);
      return p > 0 && p < 99;
    });
  const years = useMemo(() => [...new Set(movies
    .map((movie) => Number(movie.year))
    .filter((value) => Number.isInteger(value) && value >= 1888 && value <= 2100))]
    .sort((a, b) => b - a), [movies]);
  function notice(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }
  async function toggle(movie) {
    try {
      const exists = account.list.has(movie.id);
      await account.toggle(movie);
      notice(t(exists ? "removed" : "added"));
    } catch (error) {
      notice(
        {
          working:
            language === "hy"
              ? "Խնդրում ենք սպասել…"
              : language === "ru"
                ? "Подождите…"
                : "Please wait…",
        }[error.message] || t("loadError"),
      );
    }
  }
  function search(value) {
    setQuery(value);
    underlay.current = "movies";
    history.replaceState(null, "", "#/movies");
    setRoute("movies");
  }
  // This is a voluntary registration prompt, not access control to the
  // public catalog. External provider URLs and their behavior stay unchanged.
  function guestLocked(movie) {
    if (account.session) return false;
    return !account.ready || (
      !guestFilms.includes(movie?.id) && guestFilms.length >= FREE_GUEST_FILMS
    );
  }
  function allowWatch(movie) {
    if (!movie || !account.ready) {
      notice(({hy:"Խնդրում ենք սպասել, մինչև ստուգվի հաշվի կարգավիճակը։",ru:"Подождите, пока проверяется аккаунт.",en:"Please wait while your account is checked."}[language]));
      return false;
    }
    if (account.session) return true;
    // Read storage on each click as well as on the storage event, so that
    // two tabs sharing a browser do not accidentally issue a sixth choice.
    const stored = readGuestFilms();
    const seen = stored.length >= guestFilms.length ? stored : guestFilms;
    const result = attemptGuestFilm(movie.id, seen);
    setGuestFilms(result.films);
    if (!result.allowed) {
      setGuestPrompt(true);
      // Avoid two simultaneous modal dialogs if the Watch button is inside
      // the film details panel.
      if (modal) navigate(underlay.current, true);
      return false;
    }
    saveGuestFilms(result.films);
    return true;
  }
  function openWatch(movie, route = false) {
    if (!allowWatch(movie)) return false;
    if (mayCount) recordMetric("watch_click", movie.id, language);
    if (route) navigate("watch/" + encodeURIComponent(movie.id));
    return true;
  }
  function outboundClick(event, movie) {
    // A capture-phase guard has already checked this exact outbound click.
    // Don't count the same film twice or open a second registration prompt.
    if (event?.nativeEvent?.__kinolabWatchChecked)
      return event.nativeEvent.__kinolabWatchAllowed;
    if (!openWatch(movie)) {
      event?.preventDefault();
      return false;
    }
    return true;
  }
  // One automatic gate for every published film's outbound URL, including
  // future titles and watch links created by other catalog components.
  // This is a soft registration prompt only: third-party URLs are public.
  const publicWatchLinks = useMemo(() => {
    const links = new Map();
    for (const movie of movies) {
      const url = externalWatchUrl(movie);
      if (!url) continue;
      try { links.set(new URL(url).href, movie); } catch { /* Invalid URL is never a watch target. */ }
    }
    return links;
  }, [movies]);
  useEffect(() => {
    const guardOutbound = (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor) return;
      const movie = publicWatchLinks.get(anchor.href);
      if (!movie) return;
      // Runs before each component's click handler so an unguarded future
      // movie link cannot skip the registration policy.
      const allowed = allowWatch(movie);
      event.__kinolabWatchChecked = true;
      event.__kinolabWatchAllowed = allowed;
      if (!allowed) event.preventDefault();
      else if (mayCount) recordMetric("watch_click", movie.id, language);
    };
    document.addEventListener("click", guardOutbound, true);
    return () => document.removeEventListener("click", guardOutbound, true);
  }, [publicWatchLinks, account.ready, account.session, guestFilms, language, mayCount, modal]);
  const rowProps = {
    language,
    t,
    watchable,
    externalWatchUrl,
    guestLocked,
    onOutbound: outboundClick,
    open: (movie, play = false) => {
      if (play) openWatch(movie, true);
      else navigate("movie/" + encodeURIComponent(movie.id));
    },
  };
  const navigation = (mobile) => (
    <nav
      className={mobile ? "mobile-nav" : "nav"}
      aria-label={t(mobile ? "mobileNav" : "mainNav")}
    >
      {Object.entries(navs).map(([page, key]) => (
        <button
          key={page}
          className={listing === page ? "active" : ""}
          aria-current={listing === page ? "page" : undefined}
          onClick={() => navigate(page)}
        >
          {mobile ? (
            <>
              <span aria-hidden="true">
                {{ home: "◈", movies: "▤", tv: "▣", "my-list": "♡" }[page]}
              </span>
              <b>{t(key)}</b>
            </>
          ) : (
            t(key)
          )}
        </button>
      ))}
    </nav>
  );
  return (
    <>
      <a className="skip-link" href="#catalog">
        {t("skip")}
      </a>
      <Icons />
      <header className="topbar">
        <Brand />
        {navigation(false)}
        <div className="right">
          <label className="search">
            <Icon name="search" />
            <input
              id="search"
              type="search"
              placeholder={t("search")}
              aria-label={t("search")}
              autoComplete="off"
              value={query}
              onChange={(e) => search(e.target.value)}
            />
            {query && (
              <button
                id="clearSearch"
                aria-label={t("clear")}
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </label>
          <select
            id="language"
            className="language"
            aria-label={t("chooseLanguage")}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="hy">ՀԱՅ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
          <button
            id="themeToggle"
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(current => current === "dark" ? "light" : "dark")}
            aria-label={theme === "dark"
              ? ({hy:"Միացնել բաց ռեժիմը",ru:"Включить светлую тему",en:"Switch to light mode"}[language])
              : ({hy:"Միացնել մուգ ռեժիմը",ru:"Включить тёмную тему",en:"Switch to dark mode"}[language])}
            title={theme === "dark"
              ? ({hy:"Բաց ռեժիմ",ru:"Светлая тема",en:"Light mode"}[language])
              : ({hy:"Մուգ ռեժիմ",ru:"Тёмная тема",en:"Dark mode"}[language])}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button
            id="profileButton"
            className="avatar"
            aria-haspopup="dialog"
            aria-expanded={profile}
            aria-controls="profilePanel"
            aria-label={t("profile")}
            onClick={() => setProfile(!profile)}
          >
            <Icon name="user" />
          </button>
        </div>
        <section
          id="profilePanel"
          ref={profilePanel}
          className="profile-panel"
          role="dialog"
          aria-labelledby="profileTitle"
          hidden={!profile}
        >
          <p className="eyebrow">MY ACCOUNT</p>
          <div className="profile-identity">
            <span className="profile-person-icon" aria-hidden="true"><Icon name="user" /></span>
            <div className="profile-person-details">
              <h2 id="profileTitle">
                {account.session
                  ? (account.profile?.display_name?.trim() ||
                     account.session.user.user_metadata?.display_name?.trim() ||
                     account.session.user.user_metadata?.full_name?.trim() ||
                     t("profile"))
                  : t("profile")}
              </h2>
              <p className="profile-email">
                {account.session?.user.email ||
                  t("profileNote", { count: account.list.size })}
              </p>
            </div>
          </div>
          <div className="account-menu">
            <button className="btn secondary profile-menu-link" onClick={() => navigate("my-list")}>
              <Icon name="bookmark" />
              <span>{t("list")}</span>
            </button>
            {(account.session ? ["profile"] : ["login", "register"]).map(
              (page) => (
                <button
                  key={page}
                  className={`btn secondary profile-menu-link${route === page ? " profile-menu-current" : ""}`}
                  aria-current={route === page ? "page" : undefined}
                  onClick={() => navigate(page)}
                >
                  <Icon name="user" />
                  <span>
                  {
                    {
                      hy: {
                        login: "Մուտք գործել",
                        register: "Ստեղծել հաշիվ",
                        profile: "Ձեր պրոֆիլը",
                      },
                      ru: {
                        login: "Войти",
                        register: "Создать аккаунт",
                        profile: "Ваш профиль",
                      },
                      en: {
                        login: "Log in",
                        register: "Create account",
                        profile: "Your profile",
                      },
                    }[language][page]
                  }
                  </span>
                </button>
              ),
            )}
            {account.admin && (
              <a className="btn secondary profile-menu-link" href={`${base}admin/`}>
                <Icon name="settings" />
                <span>
                  {
                    {
                      hy: "Ադմինիստրատորի վահանակ",
                      ru: "Панель администратора",
                      en: "Admin Panel",
                    }[language]
                  }
                </span>
              </a>
            )}
          </div>
        </section>
      </header>
      <main>
        {accountPage ? (
          <>
            <Accounts
              route={route}
              account={account}
              language={language}
              setLanguage={setLanguage}
              navigate={navigate}
              movies={movies}
            />
            <div className="account-ai-slot">
              <AI open={ai} setOpen={setAI} t={t} movies={movies} language={language} onOpenMovie={(movie) => { setAI(false); navigate("movie/" + encodeURIComponent(movie.id)); }} />
            </div>
          </>
        ) : (
          <>
            {account.ready && !account.session && (
              <div className="guest-film-status" aria-live="polite">
                <span>{({hy:"Անվճար ֆիլմերի ընտրություն",ru:"Бесплатные фильмы",en:"Free film choices"}[language])}:</span>
                <strong>{guestFilms.length} / {FREE_GUEST_FILMS}</strong>
                <span>{({hy:"Ամբողջ կատալոգը բաց է․ գրանցումն անվճար է",ru:"Каталог доступен всем · регистрация бесплатная",en:"Browse every title · registration is free"}[language])}</span>
              </div>
            )}
            <section className="hero" aria-labelledby="heroTitle">
              {featured && (
                <img
                  className="hero-backdrop"
                  src={featured.backdrop || featured.img}
                  alt=""
                  decoding="async"
                  fetchPriority="high"
                  onError={(e) => (e.currentTarget.hidden = true)}
                />
              )}
              <div className="hero-shade" />
              <div className="hero-grain" aria-hidden="true" />
              <div className="hero-content">
                <div className="eyebrow">{t("collection")}</div>
                <h1 id="heroTitle">{info?.title || t("genericHero")}</h1>
                <div className="meta">
                  {featured &&
                    [
                      featured.year,
                      ...featured.genres.map((g) => genreLabel(g, language)),
                      featured.rating,
                    ]
                      .filter(Boolean)
                      .map((value, i) => <span key={i}>{value}</span>)}
                </div>
                <p>
                  {info?.desc ||
                    t(featured ? "descriptionFallback" : "genericDescription")}
                </p>
                <div className="actions">
                  {featured && externalWatchUrl(featured) && !watchable(featured) ? (
                    guestLocked(featured) ? (
                      <button type="button" className="btn primary"
                        aria-label={`${t("watch")} — registration`}
                        onClick={() => outboundClick(null, featured)}>
                        <Icon name="play" /><span>{t("watch")}</span>
                      </button>
                    ) : (
                      <a className="btn primary" href={externalWatchUrl(featured)} target="_blank" rel="noopener noreferrer"
                        aria-label={`${t("watch")} — external player`} onClick={(e) => outboundClick(e, featured)}>
                        <Icon name="play" /><span>{t("watch")}</span>
                      </a>
                    )
                  ) : (
                    <button className="btn primary" disabled={!featured}
                      onClick={() => {
                        if (watchable(featured)) openWatch(featured, true);
                        else navigate("movie/" + encodeURIComponent(featured.id));
                      }}>
                      <Icon name={featured && watchable(featured) ? "play" : "info"} />
                      <span>{t(featured && watchable(featured) ? "watch" : "details")}</span>
                    </button>
                  )}
                  {featured?.trailer && /^https:\/\//i.test(featured.trailer) && (
                    <a className="btn secondary" href={featured.trailer} target="_blank" rel="noopener noreferrer">
                      <Icon name="play" />
                      <span>{({hy:"Թրեյլեր",ru:"Трейлер",en:"Trailer"}[language])}</span>
                    </a>
                  )}
                  <button
                    className="btn secondary"
                    disabled={!featured}
                    aria-pressed={Boolean(
                      featured && account.list.has(featured.id),
                    )}
                    onClick={() => toggle(featured)}
                  >
                    <Icon name="heart" />
                    <span>
                      {t(
                        featured && account.list.has(featured.id)
                          ? "inList"
                          : "list",
                      )}
                    </span>
                  </button>
                </div>
                <div className="hero-bottom">
                  <span className="hero-line" />
                  <span>{t("heroCaption", { count: movies.length })}</span>
                </div>
              </div>
              {featured && featured.img !== POSTER_FALLBACK && (
                <div className="hero-art">
                  <div className="hero-art-glow" />
                  <Artwork
                    key={featured.img}
                    src={featured.img}
                    alt={info?.title}
                    width="500"
                    height="750"
                  />
                  <span className="art-stamp">
                    KINOLAB
                    <br />
                    <b>◌</b>
                  </span>
                </div>
              )}
              <div className="hero-pagination" aria-label={t("featured")}>
                {choices.map((movie, i) => (
                  <button
                    key={movie.id}
                    className={featured === movie ? "active" : ""}
                    aria-pressed={featured === movie}
                    aria-label={t("feature", {
                      title: localizedMovie(movie, language).title,
                    })}
                    onClick={() => setHeroIndex(i)}
                  />
                ))}
              </div>
            </section>
            <div className="catalog-shell" id="catalog" tabIndex={-1}>
              <section className="genre-section">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{t("mood")}</p>
                    <h2>{t("genreHeading")}</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setGenre("All");
                      search(query);
                    }}
                  >
                    {t("allGenres")}
                  </button>
                </div>
                <div className="genre-year-filter">
                  <label htmlFor="yearFilter">{t("releaseYear")}</label>
                  <select
                    id="yearFilter"
                    value={year}
                    aria-label={t("releaseYear")}
                    onChange={(event) => {
                      setYear(event.target.value);
                      // Keep Movies, TV Shows and My List in their current sections.
                      // From Discover, open the movie results view.
                      if (listing === "home") search(query);
                    }}
                  >
                    <option value="All">{t("allYears")}</option>
                    {years.map((value) => (
                      <option value={String(value)} key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className="genre-list">
                  {["All", ...availableGenres(movies)].map((value, i) => (
                    <button
                      key={value}
                      className={`genre ${genre === value ? "active" : ""}`}
                      aria-pressed={genre === value}
                      style={{
                        "--g": `linear-gradient(135deg,${["#f9234c,#40152d", "#ed332f,#29111a", "#246a86,#182b40", "#dba12a,#61370f", "#854c73,#24192d"][i % 5]})`,
                      }}
                      onClick={() => {
                        setGenre(value);
                        search(query);
                      }}
                    >
                      <span>
                        {value === "All"
                          ? t("all")
                          : genreLabel(value, language)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              {state !== "ready" && (
                <div className="catalog-status" role="status">
                  <span>
                    {t(state === "loading" ? "loading" : "loadError")}
                  </span>
                  {state === "error" && (
                    <button className="text-button" onClick={loadCatalog}>
                      {t("retry")}
                    </button>
                  )}
                </div>
              )}
              {state === "loading" && !movies.length && (
                <div className="skeletons" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
              {home && available.length > 0 && (
                <MovieRow
                  {...rowProps}
                  id="watchableSection"
                  title={t("ready")}
                  movies={available}
                />
              )}
              {home && continuing.length > 0 && (
                <MovieRow
                  {...rowProps}
                  id="continueSection"
                  title={t("continue")}
                  movies={continuing}
                />
              )}
              <MovieRow
                {...rowProps}
                id="catalogSection"
                title={
                  genre !== "All"
                    ? genreLabel(genre, language) + " • KinoLab"
                    : t(navs[listing] === "home" ? "discover" : navs[listing])
                }
                eyebrow={t("catalogEyebrow")}
                movies={filtered}
                results={!home}
                actions={
                  <button
                    className="text-button"
                    onClick={() => navigate("home")}
                  >
                    {t("reset")}
                  </button>
                }
                empty={
                  state === "ready"
                    ? t(
                        listing === "my-list"
                          ? "emptyList"
                          : movies.length
                            ? "empty"
                            : "noCatalog",
                      )
                    : null
                }
              />
              <ArchiveSearch query={query} language={language} />
              {home && movies.length > 0 && (
                <MovieRow
                  {...rowProps}
                  id="newSection"
                  title={t("throughYears")}
                  subtitle={
                    years.length
                      ? t("yearsSubtitle", {
                          first: Math.min(...years),
                          last: Math.max(...years),
                        })
                      : ""
                  }
                  movies={[...movies]
                    .sort((a, b) => (b.year || 0) - (a.year || 0))
                    .slice(0, 12)}
                />
              )}
              <section className="discovery-note">
                <span className="note-orbit" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className="eyebrow">KINOLAB AI</p>
                  <h2>{t("askTitle")}</h2>
                  <p>{t("askText")}</p>
                </div>
                <button className="btn secondary" onClick={() => setAI(true)}>
                  {t("ask")}
                </button>
              </section>
            </div>
          </>
        )}
      </main>
      <footer>
        <Brand />
        <p>{t("footer")}</p>
        <span>© KinoLab</span>
        <a href={`${base}privacy.html`} className="privacy-link">
          {({hy:"Գաղտնիություն և այցելությունների հաշվառում",ru:"Конфиденциальность и статистика",en:"Privacy & usage analytics"}[language])}
        </a>
      </footer>
      {navigation(true)}
      {modal && (
        <MovieDialog
          movie={current}
          loading={state === "loading"}
          watch={route.startsWith("watch/") && Boolean(account.session || guestFilms.includes(current?.id))}
          language={language}
          t={t}
          close={() => navigate(underlay.current, true)}
          onWatch={() => openWatch(current, true)}
          toggle={toggle}
          saved={Boolean(current && account.list.has(current.id))}
          watchable={watchable}
          guestLocked={guestLocked}
          onOutbound={outboundClick}
          onProgress={() => setProgress((value) => value + 1)}
        />
      )}
      {guestPrompt && <GuestSignupPrompt language={language}
        onClose={() => setGuestPrompt(false)}
        onRegister={() => { setGuestPrompt(false); navigate("register"); }}
        onLogin={() => { setGuestPrompt(false); navigate("login"); }} />}
      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
      {!accountPage && <AI open={ai} setOpen={setAI} t={t} movies={movies} language={language} onOpenMovie={(movie) => { setAI(false); navigate("movie/" + encodeURIComponent(movie.id)); }} />}
    </>
  );
}
