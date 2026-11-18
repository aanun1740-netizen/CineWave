import { allowedExternalMovie } from "./external-links";

export function trailerEmbedUrl(raw) {
  if (!allowedExternalMovie(raw)) return null;
  const url = new URL(raw);
  if (url.port) return null;

  let youtubeId;
  if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    youtubeId = url.pathname === "/watch"
      ? url.searchParams.get("v")
      : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1];
  } else if (url.hostname === "youtu.be") {
    youtubeId = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1];
  } else if (["youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
    youtubeId = url.pathname.match(/^\/embed\/([\w-]{11})\/?$/)?.[1];
  }
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) {
    return "https://www.youtube-nocookie.com/embed/" + youtubeId + "?autoplay=1&playsinline=1";
  }

  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
    const video = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
    if (!video) return null;
    const hash = url.searchParams.get("h") ?? video[2];
    if (hash && !/^[a-zA-Z0-9]+$/.test(hash)) return null;
    const player = new URL("https://player.vimeo.com/video/" + video[1]);
    if (hash) player.searchParams.set("h", hash);
    player.searchParams.set("autoplay", "1");
    return player.href;
  }
  return null;
}
