import { cleanEmbedUrl } from "./clean-player";
import { normalizeAdminWatchInput } from "./watch-input";

const maxEpisodes = 200;

export function cleanSeriesEpisodes(items) {
  if (!Array.isArray(items)) return [];
  const episodes = new Map();
  for (const item of items) {
    if (!Number.isSafeInteger(item?.season) || item.season < 1 ||
        !Number.isSafeInteger(item.episode) || item.episode < 1) continue;
    const url = cleanEmbedUrl(item.url);
    if (!url) continue;
    const key = item.season + ":" + item.episode;
    if (!episodes.has(key)) episodes.set(key, { season: item.season, episode: item.episode, url });
  }
  return [...episodes.values()].sort((a, b) => a.season - b.season || a.episode - b.episode);
}

export function parseCleanSeriesEpisodes(input) {
  // Episode numbers start entries. Provider iframe snippets can span lines.
  const entries = input.trim().split(/\r?\n(?=[ \t]*\d+\/\d+(?:\s|$))/);
  if (entries.length > maxEpisodes) return null;
  const items = [];
  const urls = new Set();
  for (const entry of entries) {
    const match = /^(\d+)\/(\d+)\s+([\s\S]+)$/.exec(entry.trim());
    if (!match) return null;
    const source = match[3].trim();
    if (!/^<iframe\b/i.test(source) && /\s/.test(source)) return null;
    const url = normalizeAdminWatchInput(source, "clean");
    if (!url || urls.has(url)) return null;
    const season = Number(match[1]);
    const episode = Number(match[2]);
    const nextEmbed = /^https:\/\/api\.nextembed\.ws\/embed\/tv\/\d+\/(\d+)\/(\d+)$/.exec(url);
    if (url.startsWith("https://api.nextembed.ws/") &&
        (!nextEmbed || Number(nextEmbed[1]) !== season || Number(nextEmbed[2]) !== episode)) return null;
    urls.add(url);
    items.push({ season, episode, url });
  }
  const validated = cleanSeriesEpisodes(items);
  return validated.length === entries.length ? validated : null;
}
