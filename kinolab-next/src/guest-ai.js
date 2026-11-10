// A browser-scoped anonymous quota identifier. It never grants account access.
// Supabase hashes it server-side before using it for the five-questions/day quota.
const KEY = "kinolab:guest-ai-id-v1";
let memoryId = "";
export function guestAIId() {
  try {
    const existing = localStorage.getItem(KEY);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing || "")) return existing;
  } catch { /* Private browsing may block storage. */ }
  if (memoryId) return memoryId;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(x => x.toString(16).padStart(2, "0")).join("");
  memoryId = hex.slice(0,8) + "-" + hex.slice(8,12) + "-" + hex.slice(12,16) + "-" + hex.slice(16,20) + "-" + hex.slice(20);
  try { localStorage.setItem(KEY, memoryId); } catch {}
  return memoryId;
}
