import "../catalog.js";
import { siteBase } from "./site-base.js";
import { allowedExternalWatch } from "./services/external-links";
import "../availability.js";
import "../model.js";
export const POSTER_FALLBACK = `${siteBase()}assets/poster-fallback.svg`;
const catalog = window.CineWaveCatalog;
export const { localizedMovie, genreLabel, availableGenres, canonicalGenre } =
  catalog;
export const mapCatalogMovie = (row) => {
  const movie = catalog.mapCatalogMovie(row);
  return {
    ...movie,
    img:
      movie.img === "assets/poster-fallback.svg" ? POSTER_FALLBACK : movie.img,
  };
};
export const { approvedPlayback } = window.CineWaveAvailability;
export const adminModel = window.CineWaveAdminModel;
export function filterMovies(
  movies,
  {
    query = "",
    genre = "All",
    year = "All",
    route = "home",
    list = new Set(),
    language = "en",
  } = {},
) {
  const normalize = (value) => String(value ?? "").normalize("NFC").toLocaleLowerCase();
  const q = normalize(query.trim());
  return movies.filter(
    (movie) =>
      (genre === "All" || movie.genres.includes(genre)) &&
      (year === "All" || String(movie.year ?? "") === String(year)) &&
      (!q ||
        [
          ...Object.values(movie.titles || {}),
          ...Object.values(movie.descriptions || {}),
          ...movie.genres.flatMap((g) => [g, genreLabel(g, language)]),
        ].some((text) => normalize(text).includes(q))) &&
      (route !== "my-list" || list.has(movie.id)) &&
      (route !== "movies" || movie.kind === "Movie") &&
      (route !== "tv" || movie.kind === "TV Show"),
  );
}
export function readStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export function initialLanguage() {
  try {
    const value = localStorage.getItem("cinewave:language");
    return ["hy", "ru", "en"].includes(value) ? value : "en";
  } catch {
    return "en";
  }
}
export function routeFromHash(hash = location.hash) {
  if (/^#(?:access_token|refresh_token)=/.test(hash)) return "home";
  // Expired email links should show guidance instead of silently opening Home.
  if (/^#error=/.test(hash) || (!hash && (window.CineWaveAuth?.authRedirectError ||
      new URLSearchParams(location.search).has("error_code")))) return "login";
  const route = hash.replace(/^#\/?/, "") || "home";
  return /^(home|movies|tv|my-list|login|register|profile|forgot|recover|movie\/.+|watch\/.+)$/.test(
    route,
  )
    ? route
    : "home";
}

/** Destination for authorized third-party playback; never expose draft embed URLs. */
export function externalWatchUrl(movie) {
  if (!movie || approvedPlayback(movie)) return null;
  const publishedExternal = String(movie.externalWatch || "");
  if (allowedExternalWatch(publishedExternal)) return publishedExternal;
  const official = String(movie.officialWatch || "");
  if (/^https:\/\/(?:www\.)?netflix\.com\/title\/\d+\/?$/.test(official)) return official;
  if (movie.source !== "supabase" || movie.approval?.license_verified !== true || movie.approval?.commercial_reuse_verified !== true) return null;
  try {
    const u = new URL(movie.embed);
    if (u.protocol !== "https:" || u.username || u.password || u.hash) return null;
    if (u.hostname === "api.nextembed.ws" && /^\/embed\/(movie|tv)\/\d+(?:\/\d+\/\d+)?\/?$/.test(u.pathname) && !u.search) return u.href;
    if (["www.youtube.com","youtube.com","youtu.be","vimeo.com","www.vimeo.com","player.vimeo.com","archive.org","www.archive.org","geo.dailymotion.com"].includes(u.hostname)) return u.href;
  } catch {}
  return null;
}
