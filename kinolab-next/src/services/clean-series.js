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
  return sortEpisodes([...episodes.values()]);
}

function sortEpisodes(items) {
  return items.sort((a, b) => a.season - b.season || a.episode - b.episode);
}

export function parseCleanSeriesEpisodes(input) {
  // Keep the original offsets so Studio can select the rejected entry.
  // Episode markers begin entries. An iframe can include its own line breaks.
  const text = input.trim();
  if (!text) return { error: { code: "empty", start: 0, end: 0 } };
  const entries = text.split(/\r?\n(?=[ \t]*\d+\/\d+(?:\s|$))/);
  if (entries.length > maxEpisodes) return { error: { code: "limit" } };

  const items = [];
  const numbers = new Map();
  const urls = new Map();
  let start = input.indexOf(text);
  for (const entry of entries) {
    const end = start + entry.length;
    const line = input.slice(0, start).split("\n").length;
    const invalid = (code, details) => ({ error: { code, line, start, end, ...details } });

    const match = /^(\d+)\/(\d+)(?:\s+([\s\S]+))?$/.exec(entry.trim());
    if (!match) return invalid("format");
    const season = Number(match[1]);
    const episode = Number(match[2]);
    const number = season + "/" + episode;
    if (!Number.isSafeInteger(season) || season < 1 || !Number.isSafeInteger(episode) || episode < 1) {
      return invalid("format");
    }
    if (numbers.has(number)) return invalid("duplicateNumber", { number, firstLine: numbers.get(number) });

    const source = match[3]?.trim();
    if (!source) return invalid("missingLink", { number });
    if (source.match(/^https:\/\/(?:www\.)?rutube\.ru\/plst\//i)) return invalid("playlist", { number });
    if (!/^<iframe\b/i.test(source) && /\s/.test(source)) return invalid("link", { number });
    const url = normalizeAdminWatchInput(source, "clean");
    if (!url) return invalid("link", { number });
    if (urls.has(url)) {
      const sourceStart = start + entry.indexOf(source);
      return invalid("duplicateLink", {
        number, firstNumber: urls.get(url), start: sourceStart, end: sourceStart + source.length,
      });
    }

    const nextEmbed = /^https:\/\/api\.nextembed\.ws\/embed\/tv\/\d+\/(\d+)\/(\d+)$/.exec(url);
    if (url.startsWith("https://api.nextembed.ws/") &&
        (!nextEmbed || Number(nextEmbed[1]) !== season || Number(nextEmbed[2]) !== episode)) {
      return invalid("numberMismatch", { number });
    }

    numbers.set(number, line);
    urls.set(url, number);
    items.push({ season, episode, url });
    start = end + (input.startsWith("\r\n", end) ? 2 : 1);
  }
  return { episodes: sortEpisodes(items) };
}
