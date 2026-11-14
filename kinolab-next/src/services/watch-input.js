import { cleanEmbedUrl } from "./clean-player";
import { allowedExternalMovie } from "./external-links";

// Accept ordinary watch links and provider-issued <iframe> snippets from the
// admin editor, but never store HTML or paste it into the storefront DOM.
// The regular external section remains OUTBOUND; the clean-player section
// continues to have its separate explicit playback mode.
export function normalizeAdminWatchInput(raw, mode = "external") {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 4096) return null;
  const text = raw.trim();
  if (!/^<iframe\b/i.test(text)) {
    if (mode === "clean") return cleanEmbedUrl(text);
    return allowedExternalMovie(text) ? text : null;
  }

  // Exactly one empty iframe with a quoted src. Never allow HTML/script/body
  // content into a saved URL field. An unknown host must not be embedded.
  const frame = text.match(/^<iframe\b([^>]*)>(?:\s*<\/iframe\s*>)?\s*$/is);
  if (!frame) return null;
  const attributes = frame[1];
  const sources = [...attributes.matchAll(/(?:^|\s)src\s*=\s*(["'])(.*?)\1/gi)];
  if (sources.length !== 1) return null;
  const embed = cleanEmbedUrl(sources[0][2].replace(/&amp;/gi, "&"));
  return embed || null;
}
