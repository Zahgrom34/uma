# billz-v3 — import product photos from Billz during sync

Contract: `.claude/contracts/billz-v3.md` (status: allowed; supreme-court ALLOW,
03.10.2026, single lean iteration). Shipped: 03.10.2026. Extends billz-v2
(`docs/features/billz-v2.md`); everything from v2 is unchanged. Empirical API
reference (incl. the `photos` field): `docs/reference/billz2-api-notes.md`.

## What shipped

The existing manual Billz sync now also imports product photos from the matched
BILLZ 2 rows into the UMA media library and attaches them to the matched products
in **append-missing** mode: Billz photos go AFTER the product's existing curated
CMS photos; curated images and their order are never touched, and nothing is
deleted or replaced. There is no separate button — photos ride along with the
normal «Синхронизировать» action.

- **Photo collection** (`api/src/billz/billz.service.ts`, `groupPhotoUrls`): per
  matched product, photo URLs are collected from ALL rows of the resolved variant
  group, deduplicated by `photo_url`, ordered `is_main` first then `sequence` asc
  then row order (stable sort), and capped at 10 per product per run
  (`PHOTOS_PER_PRODUCT`).
- **Download seam** (`api/src/billz/billz.client.ts`, `downloadPhoto`): plain
  unauthenticated GET (the URLs are public DO Spaces objects), 15 s timeout per
  attempt, up to 2 attempts, bodies over 10 MiB rejected (Content-Length when
  present AND final buffer length). All outbound photo traffic goes through this
  method so the e2e stub covers it.
- **Dedup, three layers** (`resolvePhoto` + attach loop): an already-imported
  asset is reused via `media.findBySourceUrl(url)`; otherwise the download goes
  through the normal media pipeline (`media.ingest`), which dedupes by content
  hash; finally, asset ids already among the product's attached `images` mediaIds
  are skipped. A photo is never attached twice.
- **Transaction placement:** download/ingest happen BEFORE the sync
  `$transaction`; only `productImage.create` ops (with `sortOrder` = current
  image count + append index) go inside it, alongside the existing price/stock
  updates. A per-photo failure (network, unsupported format) produces a Russian
  warning — «Товар …: не удалось загрузить фото из Billz» — and the sync
  continues; it never aborts the run.
- **Report** (`shared/src/index.ts`, mirrored in `cms/src/lib/api/types.ts`):
  `BillzSyncReport` gains `importedPhotos?: number` — set on every new report
  (0 when none), absent in pre-v3 stored reports.
- **Card** (`cms/src/components/settings/billz-card.tsx`): the last-run summary
  gains one line «Загружено фото: N» (`t.billz.reportPhotos` in
  `cms/src/lib/i18n/ru.ts`), rendered only when `report.importedPhotos` is a
  number — legacy reports show the old summary unchanged. No other UI changes.

## Key decisions

- **Append-missing was the user's fixed choice** over the alternatives
  (fill-empty, replace). Fill-empty would have been a no-op anyway: product
  creation in the CMS requires at least one photo, so no product has an empty
  image list. Replace was rejected because curated CMS photos are the brand's
  editorial selection and Billz photos are POS snapshots.
- Download before the transaction keeps the write path all-or-nothing: if the
  `$transaction` rolls back, no ProductImage rows exist, and the already-ingested
  MediaAssets are simply reused via sourceUrl dedup on the next run.

## Live evidence (real merchant account, 03.10.2026)

Smoke on `uma-sequin-dress` mapped to артикул ZPH-30325 (a row with one photo):
first sync reported `importedPhotos: 1` and appended the Billz photo after the 2
curated mediaIds (order intact); the public bundle showed `images[]` of 3 and the
served file verified as RIFF/WEBP; second sync reported `importedPhotos: 0` with
no duplicate. The card showed «Загружено фото: 1» then «…: 0» (playwright-qa).
The product was restored exactly to its pre-state and the test MediaAsset
deleted. api e2e 64/64 green, including 3 new specs: append-after-curated order,
url+sourceUrl dedup with `downloadPhoto` call counts, failure → Russian warning
without abort, and no `billz`/`billzSku` leakage into the public bundle.

## QC trim (recorded compromise, same as billz-v2)

QC = playwright-qa (focused) + the orchestrator's live smoke; bug-hunter and
planner-assessor skipped with the user's sanction — the UI delta is one summary
line. supreme-court ruled on the evidence.

## Known limitations / later list (unfunded)

- No re-download when a Billz photo changes content under the same URL — the
  sourceUrl dedup pins the first-imported bytes.
- Orphaned MediaAssets after a rolled-back transaction are not cleaned up; they
  are reused via sourceUrl dedup on the next run (accepted in contract §2).
- No alt-text generation for imported photos.
- Merchant catalog restructure (observed 03.10.2026): every row now has a unique
  `parent_id`, so variant grouping degrades to groups of one. The grouping logic
  still functions; revisit size-grouping with the merchant (flagged to the user,
  out of scope this run). **Resolved in billz-v4 (05.10.2026): grouping is now
  name-stem-based — see `docs/features/billz-v4.md`.**
- playwright-qa's in-browser check of the legacy hide-branch (report without
  `importedPhotos`) was covered at API level only; it can ride along with any
  future billz UI change.
- billz-v2 limitations carry over unchanged.
