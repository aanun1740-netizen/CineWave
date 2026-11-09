// KinoLab-Test soft registration incentive, not a DRM or access-control system.
// The public catalog (and its third-party URLs) is still visible to everyone.
// Never put private/paid links into the public catalog.
export const FREE_GUEST_FILMS = 5;
export const GUEST_FILMS_KEY = "kinolab:guest-films-v1";

const movieId = (value) =>
  typeof value === "string" && /^catalog:(?:external:)?[1-9][0-9]{0,17}$/.test(value);

export function cleanGuestFilms(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(movieId))].slice(0, FREE_GUEST_FILMS);
}

export function readGuestFilms() {
  try { return cleanGuestFilms(JSON.parse(localStorage.getItem(GUEST_FILMS_KEY))); }
  catch { return []; }
}

export function attemptGuestFilm(filmId, alreadyOpened) {
  const saved = cleanGuestFilms(alreadyOpened);
  if (!movieId(filmId)) return { allowed: false, films: saved };
  if (saved.includes(filmId)) return { allowed: true, films: saved };
  if (saved.length >= FREE_GUEST_FILMS) return { allowed: false, films: saved };
  return { allowed: true, films: [...saved, filmId] };
}

export function saveGuestFilms(films) {
  try { localStorage.setItem(GUEST_FILMS_KEY, JSON.stringify(cleanGuestFilms(films))); }
  catch { /* In-memory protection remains when storage is unavailable. */ }
}
