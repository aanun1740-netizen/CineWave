// Outbound links are ADMIN-SUPPLIED navigation targets, never iframe embeds.
// Accept ordinary web links; reject executable or local schemes such as javascript:.
export function allowedExternalWatch(raw) {
  if (typeof raw !== "string" || !raw || raw.length > 2048 ||
      /[\u0000-\u001F\u007F]/.test(raw) || /\s/.test(raw)) return false;
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Public catalog rows are protected by a database CHECK requiring HTTPS.
// Validate this at the form boundary, before trying to save.
export function allowedExternalMovie(raw) {
  if (!allowedExternalWatch(raw)) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}
export const allowedExternalEpisode = (url) =>
  typeof url === "string" && /^https:\/\/api\.nextembed\.ws\/embed\/tv\/\d+\/[1-9]\d*\/[1-9]\d*\/?$/.test(url);
