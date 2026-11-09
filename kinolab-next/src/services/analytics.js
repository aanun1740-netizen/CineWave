import { backendFetch, config } from "./backend";

// Cookie-free, first-party, aggregate events. Off by default until the
// owner applies the staging SQL migration and explicitly enables this flag.
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
  // This is non-blocking. A failed measurement must never block Watch/play.
  void backendFetch(`${config.url}/rest/v1/rpc/kinolab_record_event`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_event: event, p_movie_key: movieKey,
      p_language: lang, p_device: device,
    }),
    keepalive: true,
  }).catch(() => {});
}
