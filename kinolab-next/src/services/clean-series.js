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
  const lines = input.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > maxEpisodes) return null;
  const items = [];
  const urls = new Set();
  for (const line of lines) {
    const match = /^(\d+)\/(\d+)\s+(.+)$/.exec(line);
    if (!match) return null;
    const url = normalizeAdminWatchInput(match[3], "clean");
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
  return validated.length === lines.length ? validated : null;
}
