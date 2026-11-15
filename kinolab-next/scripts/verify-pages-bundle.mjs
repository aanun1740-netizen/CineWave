import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [candidate = "dist", deployed = ".."] = process.argv.slice(2);
const origin = "https://kinolabmovies.com/";
const publishedUrl = deployed.startsWith("https://") ? new URL(deployed) : null;
const checkedFiles = new Set();

async function readPublished(path) {
  if (!publishedUrl) return readFile(resolve(deployed, path));
  const url = new URL(path, publishedUrl);
  url.searchParams.set("kinolab_check", String(Date.now()));
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Error(`${path} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

for (const entry of ["index.html", "admin/index.html"]) {
  const expected = await readFile(resolve(candidate, entry));
  const published = await readPublished(entry);
  if (!published.equals(expected)) {
    throw Error(`${entry} differs from the tested build. Publish both HTML entries and all generated assets together.`);
  }
  // Vite lists entry scripts, preloaded JS chunks, and styles in these pages.
  for (const [, reference] of expected.toString().matchAll(/(?:src|href)="([^"\n]*assets\/[^"\n]+\.(?:js|css))"/g)) {
    const path = new URL(reference, new URL(entry, origin)).pathname.slice(1);
    checkedFiles.add(path);
  }
}

if (checkedFiles.size === 0) throw Error("The build HTML contains no generated asset references.");
await Promise.all([...checkedFiles].map(async path => {
  const [expected, published] = await Promise.all([
    readFile(resolve(candidate, path)), readPublished(path),
  ]);
  if (!published.equals(expected)) throw Error(`${path} differs from the tested build.`);
}));
console.log(`Verified both Pages entry documents and ${checkedFiles.size} generated assets.`);
