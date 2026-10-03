---
feature: billz-v3 — import product photos from Billz during sync
status: allowed
budget:
  iterations_allowed: 1         # lean run, user-granted 03.10.2026
  iterations_used: 1
  usd_at_start: 1.85            # ccusage active block at contract time
created: 03.10.2026
---

## 1. Scope

During the existing manual Billz sync (billz-v2, `api/src/billz/`), additionally import product
photos from the matched BILLZ 2 rows into the UMA media library and attach them to the matched
products in **append-missing** mode (user's fixed decision): Billz photos are appended AFTER the
product's existing curated CMS photos, deduplicated so a photo is never attached twice; curated
photos and their order are never touched. Report gains a photo counter; the Billz card summary
shows it. Everything else from billz-v2 is unchanged.

Live-API facts (verified 03.10.2026, see §3 and `docs/reference/billz2-api-notes.md`): product rows
carry `photos: [{photo_url, sequence, is_main}]` (absolute URLs on `fra1.digitaloceanspaces.com`,
jpg/png); currently 41 of 292 rows have exactly one photo each. NOTE: the merchant's catalog was
restructured since 03.09 — every row now has a UNIQUE `parent_id` (groups of one). The existing
group-resolution logic still functions; no changes to it in this run.

**QC trim (recorded compromise, same as billz-v2):** QC = playwright-qa (focused) + the
orchestrator's live smoke against the real merchant account. bug-hunter and planner-assessor are
SKIPPED — UI delta is one summary line. supreme-court still rules on the evidence.

## 2. Out of scope

Everything in billz-v1 §2 / billz-v2 §2, plus: no replacement or deletion of existing product
images; no photo import outside the sync action (no separate button); no re-download when a Billz
photo changes content under the same URL; no alt-text generation; no storefront changes (images
flow through the existing bundle path); no fixes to the catalog-restructure/size-grouping issue
(flagged to the user separately); no cleanup of orphaned MediaAssets after a rolled-back
transaction (they are reused via sourceUrl dedup on the next run).

## 3. Data & API contract

### Wire/schema changes (shared/src/index.ts → mirrored in cms/src/lib/api/types.ts)

```ts
export interface BillzSyncReport {
  // ...existing fields unchanged...
  importedPhotos?: number;   // NEW, optional — photos attached this run; absent in pre-v3 stored reports
}
```
No other shared changes. `BillzSettings`, endpoints, settings controller: unchanged.

### BillzClient (api/src/billz/billz.client.ts — extend)

- `BillzProductRow` gains `photos?: { photo_url: string; sequence: number; is_main: boolean }[]`.
- NEW method `downloadPhoto(url: string): Promise<Buffer>` — plain GET via global fetch,
  15s AbortController, up to 2 attempts, rejects bodies > 10 MiB (check Content-Length when present
  AND final buffer length). Throws `BillzNetworkError` on failure. All outbound photo traffic goes
  through this seam so the e2e stub covers it (stub surface: login/getProducts/getShops/downloadPhoto).

### Sync semantics (BillzService — extend doSync, keep structure)

1. Product query gains `images: { select: { mediaId: true }, orderBy: { sortOrder: 'asc' } }`.
2. Per matched product, after the existing price/size handling: collect photos from ALL rows of the
   resolved group; dedupe by `photo_url`; order `is_main` first, then `sequence` asc, then row
   order; cap 10 per product per run.
3. Per photo URL: `media.findBySourceUrl(url)` → reuse that asset; else
   `client.downloadPhoto(url)` then `media.ingest(buffer, basename(new URL(url).pathname), url)`
   (MediaService is `@Global()` — inject it). Download/ingest happen BEFORE the `$transaction`;
   per-photo failures (network, unsupported format) → Russian warning with the product label
   («Товар …: не удалось загрузить фото из Billz»), sync continues, no throw.
4. Attach: asset ids not already among the product's current `images` mediaIds → push
   `productImage.create` ops into the existing `$transaction`, `sortOrder` = current image count +
   append index. Existing ProductImage rows are NEVER deleted or reordered. `importedPhotos` +=
   number of appended rows.
5. Report: `importedPhotos` set on every new report (0 when none). Persisted/`status()` path
   unchanged — old stored reports simply lack the field.
6. `test()`, endpoints, 409 mutex, invalidate, threshold: unchanged.

## 4. UI surface

`cms/src/components/settings/billz-card.tsx` only: the last-run summary gains one line
«Загружено фото: N», rendered ONLY when `report.importedPhotos` is a number (hide for pre-v3
reports). No other UI changes; no layout rework.

## 5. i18n

`cms/src/lib/i18n/ru.ts`: one new key under `t.billz.*` for the photo line (e.g.
`reportPhotos: 'Загружено фото'`). Run `antislop` over it. Server warning strings live in the api
(backend-owned), Russian, same tone as existing warnings.

## 6. File ownership

**backend-developer** — `shared/src/index.ts`, `api/src/billz/**` (client + service), `api/test/app.e2e-spec.ts`,
`cms/src/lib/api/types.ts`, `docs/reference/billz2-api-notes.md` (add photos field + catalog-restructure note).
**ui-developer** — `cms/**` except `cms/src/lib/api/types.ts` (billz-card summary line, ru.ts).

## 7. Acceptance criteria

1. `cd api && npm test` green. New e2e coverage (stubbed client incl. `downloadPhoto` returning a
   real tiny PNG buffer): (a) matched product with an existing curated image + stub row with photos
   → Billz photo appended AFTER the curated one (mediaIds order proves it), report
   `importedPhotos: 1`; (b) second sync → no duplicate attach, `importedPhotos: 0`; (c)
   `downloadPhoto` throws → sync succeeds with a Russian warning and no attach; (d) public bundle
   still has no `billz`/`billzSku` keys.
2. Curated images untouched: sortOrder/first image unchanged after sync (asserted in (a)).
3. LIVE (orchestrator, real token): a product mapped to an артикул whose Billz row has a photo
   gets that photo appended — visible in the CMS product editor media strip and in
   `/api/public/content` `images[]`; re-running sync does not duplicate it; card shows
   «Загружено фото: 1» then «…: 0».
4. Billz card renders the photo line only when the field exists; legacy report (without it) shows
   the old summary unchanged.
5. Anti-slop pass on the new ru copy.
6. Legacy intact: billz-v2 behavior (prices/sizes/report), other settings cards, media library UI.

## 8. Conflict log

(empty)

## 9. Verdict

- **Ruling:** ALLOW

- **Grounds:**
  1. §7.1 PASS — backend report: api tests 64/64 green; 3 new e2e specs cover (a) append-after-curated order, (b) url+sourceUrl dedup with downloadPhoto call counts, (c) failure → Russian warning without abort, (d) no billz/billzSku in public bundle; real PNG exercised through sharp.
  2. §7.2 PASS — append order asserted in spec (a) and confirmed live (orchestrator smoke C: Billz photo appended after the 2 curated mediaIds, curated order intact).
  3. §7.3 PASS — live smoke C against the real merchant account: uma-sequin-dress / ZPH-30325 → sync1 importedPhotos 1, sync2 importedPhotos 0, bundle images[]=3, served file verified RIFF/WEBP magic; playwright-qa D confirms the card shows «Загружено фото: 1» then «…: 0».
  4. §7.4 PASS — UI guard `typeof report.importedPhotos === 'number'` (B); legacy branch proven at API level by stripping the field from the stored billzSync Setting and observing status without it (C). QA's in-browser gap for this branch is covered by C.
  5. §7.5 PASS — antislop score 0 on both new ru strings (E).
  6. §7.6 PASS — billz-v2 behavior, other settings cards, product editor media strip intact (C + D, desktop and 375px); live product restored exactly to pre-state and test MediaAsset deleted.
  7. QA gap (console log for the exact sync click lost to a QA-script crash) is mitigated by an equivalent full session with zero console errors (D); carries no blocker weight. QC-trim (no bug-hunter/planner-assessor) is a user-sanctioned compromise recorded in §1.

- **Budget state:** iterations 1/1 used; usd_at_start 1.85, active 5h block 13.07 at ruling → ~$11.2 spent this run. No headroom for another full iteration (~$10+); remedy sized accordingly (ship, no conditions).

- **Remedy:** SHIP. No pre-ship conditions. Orchestrator invokes documentor. Later-list (out of scope this run, no budget impact now): (i) merchant catalog restructure — all rows now unique parent_id, grouping degraded to groups-of-one; revisit size-grouping with the merchant (already flagged to user, F); (ii) orphaned MediaAssets after a rolled-back transaction are reused via sourceUrl dedup, no cleanup — acceptable per §2; (iii) playwright-qa in-browser check of the legacy hide-branch can ride along with any future billz UI change.

Ruled 03.10.2026 by supreme-court.
