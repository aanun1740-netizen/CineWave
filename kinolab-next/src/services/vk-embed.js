// Convert only genuine VK Video pages and official VK embed URLs to the
// supported third-party player. No short-link resolving, scraping or bypassing.
const VK_HOSTS = new Set(["vkvideo.ru", "vk.ru", "vk.com"]);

export function vkEmbedUrl(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 4096) return null;
  let raw = input.trim();
  if (/^<iframe\b/i.test(raw)) {
    const src = raw.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!src) return null;
    raw = src[2].replace(/&amp;/gi, "&");
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.port || !VK_HOSTS.has(url.hostname.toLowerCase())) return null;
    const videoPage = url.pathname.match(/^\/video(-?\d+)_(\d+)\/?$/);
    let owner, id;
    if (videoPage) {
      owner = videoPage[1];
      id = videoPage[2];
    } else if (url.pathname === "/video_ext.php") {
      owner = url.searchParams.get("oid");
      id = url.searchParams.get("id");
    } else {
      return null;
    }
    if (!/^-?\d+$/.test(owner || "") || !/^\d+$/.test(id || "")) return null;
    const embedded = new URL("https://vkvideo.ru/video_ext.php");
    embedded.searchParams.set("oid", owner);
    embedded.searchParams.set("id", id);
    if (!videoPage) {
      const hash = url.searchParams.get("hash");
      if (hash && /^[A-Za-z0-9_-]{1,128}$/.test(hash)) {
        embedded.searchParams.set("hash", hash);
      }
    }
    return embedded.href;
  } catch {
    return null;
  }
}
