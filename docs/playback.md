# Playback implementation and activation

## Current status

The player is implemented and locally tested with actual, generated MP4 and HLS video/audio. It reads the existing `watch_url`; no backend/schema change is required for an existing authorized HTTPS MP4 or `.m3u8` URL. All 24 observed catalog records currently have no `watch_url`. No production SQL, publication or deployment was performed.

**No real film has been verified or commercially cleared in this task.** The official Blender and Creative Commons hosts returned proxy CONNECT 403. `data/playback-films.json` records three candidates and all missing evidence. A known open-movie title or an Internet Archive upload is not proof of the rights for a specific file.

| Candidate (not verified) | Rights-holder source to inspect | Candidate license to verify |
| --- | --- | --- |
| Big Buck Bunny (2008) | https://peach.blender.org/about/ | CC BY 3.0 |
| Sintel (2010) | https://durian.blender.org/about/ | CC BY 3.0 |
| Tears of Steel (2012) | https://mango.blender.org/sharing/ | CC BY 3.0 |

The license names above are research leads, not completed license verification. Playback URLs remain null and the generated SQL refuses to insert any candidates. Do not represent these as verified additions. No new third-party movie poster has been selected.

## Exact activation steps

1. Apply the requested environment network settings so the rights-holder pages, `download.blender.org` and `creativecommons.org` can be inspected. Existing custom allowlist entries were preserved. The saved draft also requests `api.github.com` for PR creation. A saved draft does not apply runtime policy or publish an environment.
2. For each of 3–5 films, confirm the film title/year and specific edition with its rights holder. Record the actual license grant covering the complete video and soundtrack, its terms, attribution requirements and explicit commercial redistribution/streaming permission. Check for excluded third-party assets, logos/trademarks and platform restrictions. Do not accept a CC-NC grant, an uploader's unsupported public-domain claim, or a trailer as the full movie. Where the license requires attribution, retain the supplied credit and license/source links and disclose any modifications.
3. Follow the rights-holder download link to the exact full MP4/HLS source. Verify redirects, HTTPS, video identity, duration and credits against the source. Verify `Content-Type`, byte-range seeking (`206` / `Content-Range`) and browser playback. HLS requires CORS for manifests, segments and encryption keys when fetched by hls.js; use only authorized, unencrypted or appropriately authorized streams. Do not put privileged headers or keys in a public `watch_url`. HTTPS files should have stable URLs; expiring signed URLs need a separate authorized refresh mechanism.
4. Prefer hosting a licensed copy on a controlled HTTPS media origin where redistribution and hosting are permitted. A film license does not guarantee a third-party CDN allows hotlinking or will provide uptime. Preserve the original film's credits. Record the verified media URL, exact date, attribution, source evidence and verification status in `data/playback-films.json`. Add only reliable genres. Do not simply toggle the verification flags without completing the evidence review.
5. Regenerate with `python3 scripts/build_playback_sql.py` and review `sql/seed_playback_movies.sql`. Obtain explicit owner approval **before any Supabase execution**, including a rollback-only run. The current script intentionally aborts because evidence is incomplete. The verified form inserts new records as `is_published=false`; it never updates the existing 24 records, their URLs or their IDs. It skips existing title/year matches, uses the database's ID default, and rolls back on an ID collision. Its default final statement is `ROLLBACK`. PostgreSQL identity sequences can still advance during a rollback-only INSERT, so owner approval is required even for that run; test locally first.
6. After verification and approval, run the complete script transaction in the Supabase SQL editor and inspect returned rows. Only with approved persistence change the final `ROLLBACK` to `COMMIT`, then run the complete script again. Review new IDs, visible attribution, dates, genres, URLs and licensing in the database. No source file merge applies SQL automatically.
7. Separately approve publishing the specific inserted IDs in Supabase (the seed does not publish them) and the frontend release. Deploy `index.html`, `catalog.js`, `player.js`, `player.css` and `vendor/` together as that approved release. Once published, the existing catalog query retrieves their `watch_url` and the player uses it. For existing films, add a `watch_url` only with specific evidence/approval for that film; this change includes no SQL that modifies their URLs.
8. Verify actual films on desktop Chrome/Firefox and Safari/iOS, Android, a slow network, the deployed site's CSP and the real media host. Confirm controls, seeking, resume, fullscreen, language changes, error recovery, visible attribution and no background playback after closing. Approve production changes only after those checks. Local synthetic-media tests do not verify remote film rights or delivery.

## Player behavior and limits

- Responsive custom controls have English, Russian and Armenian labels. MP4 codec support depends on the browser; tested locally with H.264/AAC. Container support alone does not guarantee codec support.
- HLS uses native support first, otherwise self-hosted `hls.js@1.7.3` (Apache-2.0) when MSE is supported. Native Safari/iOS was not available for automated testing. The light bundle does not supply subtitle/alternate-audio selection or DRM support. Interface language does not dub/subtitle a film.
- Start is user-initiated. Play/pause, volume/mute, seeking, time/duration and fullscreen have accessible controls. iOS may delegate volume/fullscreen to the operating system. The native fullscreen fallback is feature-detected; unsupported/fullscreen-denied requests show a localized message.
- Progress/resume is stored per catalog ID in browser localStorage, without accounts or remote writes. Disabled storage does not prevent playback. Finite VOD seeking/progress is supported; live streams may have no seekable timeline. Closing via button/backdrop/Escape or switching films stops media and destroys the HLS instance. UI language changes preserve the current video and play position.
- Missing, invalid, failed or unsupported URLs produce localized messages. User-triggered retry is available for failures; there is no application-level retry loop. HTTPS is required for remote URLs. Same-origin HTTP works for local development. HTTPS credentials embedded in URLs and non-HTTP media schemes are rejected.
- If the deployed site uses CSP, allow only the chosen media origins in `media-src` and HLS fetch origins in `connect-src`. HLS/MSE also needs `blob:` in `media-src`; hls.js workers need compatible `worker-src blob:` policy. Review deployment CSP in its own configuration; no CSP was weakened by this change.

## Tests

From the repository root:

```sh
node --test tests/catalog.test.cjs tests/player.test.cjs
python3 tests/browser_smoke.py
python3 tests/player_browser.py
```

The player test generates original test video/audio with ffmpeg in a temporary directory. Its local HTTP server supports range requests; it verifies real MP4 and HLS decoding, transport/volume/seeking, fullscreen, saved progress/resume, language changes without video replacement, teardown, missing/404/retry and mobile widths. The catalog smoke test continues to exercise posters, all genre filters, My List and the mocked AI UI. Live AI inference, native Safari/iOS behavior, third-party film delivery and commercial license evidence remain unverified.
