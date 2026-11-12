import { client, config } from "./backend";

// Cookie-free, first-party, aggregate events. The admin-only reader and
// private aggregate SQL bucket are deployed; they do not store visitor IDs.
// No IP, identity, URL, referrer, search terms, or user-agent is sent by us.
// Supabase infrastructure may still process IP addresses in service logs.
const FILM_KEY = /^catalog:(?:external:)?[1-9][0-9]{0,17}$/;
export const metricsEnabled = () => config.analyticsEnabled === true;

export function recordMetric(event, movieKey = "", language = "hy") {
  if (!metricsEnabled() || typeof window === "undefined") return;
  if (!["page_view", "film_open", "watch_click"].includes(event)) return;
  if (event === "page_view" ? movieKey !== "" : !FILM_KEY.test(movieKey)) return;
  const lang = ["hy", "ru", "en"].includes(language) ? language : "hy";
  const device = window.innerWidth <= 767 ? "mobile" : "desktop";
  // Supabase client sends a valid session (or anonymous) bearer token.
  // This is non-blocking and must never interrupt film playback.
  void Promise.resolve(client.rpc("kinolab_record_event", {
    p_event: event, p_movie_key: movieKey,
    p_language: lang, p_device: device,
  })).catch(() => {});
}
