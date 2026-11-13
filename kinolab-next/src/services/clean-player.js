import { vkEmbedUrl } from "./vk-embed";

// Embed only recognized HTTPS player endpoints; a generic external website
// is never loaded as an iframe. VK's own branding/controls remain intact.
export function cleanEmbedUrl(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 4096) return null;
  let input = raw.trim();
  if (/^<iframe\b/i.test(input)) {
    const src = input.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!src) return null;
    input = src[2].replace(/&amp;/gi, "&");
  }
  const vk = vkEmbedUrl(input);
  if (vk) return vk;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.port || url.hash) return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    if (host === "rutube.ru" || host === "www.rutube.ru") {
      const match = path.match(/^\/(?:video\/|play\/embed\/)([a-fA-F0-9]{32})\/?$/);
      if (match && !url.search) return "https://rutube.ru/play/embed/" + match[1].toLowerCase();
    }
    if (host === "ok.ru" || host === "www.ok.ru") {
      const match = path.match(/^\/(?:video\/|videoembed\/)(\d+)\/?$/);
      if (match && !url.search) return "https://ok.ru/videoembed/" + match[1];
    }
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const id = path === "/watch" ? url.searchParams.get("v") : path.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id) &&
          (path !== "/watch" || (url.searchParams.size === 1 && !url.hash))) {
        return "https://www.youtube-nocookie.com/embed/" + id;
      }
    }
    if (host === "www.youtube-nocookie.com" || host === "youtube-nocookie.com") {
      const match = path.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/);
      if (match && !url.search) return "https://www.youtube-nocookie.com/embed/" + match[1];
    }
    if (host === "youtu.be") {
      const match = path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      if (match && !url.search) return "https://www.youtube-nocookie.com/embed/" + match[1];
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const match = path.match(/^\/(?:video\/)?(\d+)\/?$/);
      if (match && !url.search) return "https://player.vimeo.com/video/" + match[1];
    }
    if (["archive.org", "www.archive.org"].includes(host)) {
      const match = path.match(/^\/(?:details|embed)\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,119})\/?$/);
      if (match && !url.search) return "https://archive.org/embed/" + match[1];
    }
    if (["dailymotion.com", "www.dailymotion.com"].includes(host)) {
      const match = path.match(/^\/(?:video|embed\/video)\/([A-Za-z0-9]+)\/?$/);
      if (match && !url.search) return "https://www.dailymotion.com/embed/video/" + match[1];
    }
    if (host === "api.nextembed.ws" && /^\/embed\/(movie|tv)\/\d+(?:\/\d+\/\d+)?\/?$/.test(path) && !url.search) {
      return "https://api.nextembed.ws" + path.replace(/\/$/, "");
    }
  } catch {}
  return null;
}

export function isCleanPlayerMovie(movie, externalUrl) {
  return Boolean(movie && movie.playbackMode === "clean" && cleanEmbedUrl(externalUrl));
}
