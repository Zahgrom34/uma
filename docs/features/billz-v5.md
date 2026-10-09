# billz-v5 — Billz-driven sizes and 30 MiB photo inputs

Contract: `.claude/contracts/billz-v5.md` (status: allowed; supreme-court ALLOW,
09.10.2026, single lean iteration). Shipped: 09.10.2026, commit `c913168`,
deployed to prod the same day as image `uma:billz-v5`. Extends billz-v2/v3/v4
(`docs/features/billz-v2.md` … `billz-v4.md`); everything from those is
unchanged. Fixes two root causes from the 09.10 production sync log.

## What shipped

**A. Photo input cap 10 → 30 MiB.** The merchant uploads full-res camera JPEGs
(9–16 MB, verified live on DO Spaces); both gates of the photo pipeline rejected
anything over 10 MiB, so every large Billz photo failed with «не удалось
загрузить фото из Billz». Both limits are now 30 MiB:

- `api/src/billz/billz.client.ts` — `PHOTO_MAX_BYTES` in `downloadPhoto`,
  checked on Content-Length when present AND on the final buffer.
- `api/src/media/media.service.ts` — `MAX_UPLOAD_BYTES` for image ingest
  (ingest resizes to 1600px WebP, so input size is transient; `MAX_VIDEO_BYTES`
  untouched). The server-side error message numeral follows: «Файл больше
  30 МБ». Since the CMS upload route shares the same constant (multer stays at
  52 MB), admin uploads of 10–30 MB images now succeed too — intended.

**B. Sizes are Billz-driven for matched products**
(`api/src/billz/billz.service.ts`). Previously sync only UPDATED ProductSize
rows that already existed — real Billz sizes never reached the site, stale UMA
demo sizes lingered, and decor rows warned forever because their `razmer` holds
dimensions («18*33») or STD. New behavior:

- **Size recognition:** a razmer value counts as a wearable size iff, after
  trim+uppercase, it matches `LETTER_SIZE`
  (`/^(XXS|XS|S|M|L|XL|XXL|3XL|4XL)$/`) or `NUMERIC_SIZE`
  (`/^\d{1,2}([.,]5)?$/` — clothing/shoe/ring sizes, optional half). Anything
  else (dimensions `18*33`, `150*200`, STD, ONE SIZE, free text) is NOT a size:
  its qty counts toward the product total only, with NO warning.
- **Upsert:** recognized Billz sizes missing in UMA are CREATED
  (`available = qty>0`, `lowStockQty` per the existing threshold-3 rule);
  existing rows (matched case-insensitively, legacy-case rows kept under their
  stored spelling) update as before.
- **Prune:** UMA sizes absent from the Billz group are DELETED via a targeted
  `deleteMany` by stored size values inside the existing `$transaction` — never
  a replace-all of the whole list. Products without a `billzSku` are untouched.
- **Warnings removed:** «размер … есть в Billz, но не заведён — пропущен» and
  «размер … не найден в Billz, оставлен без изменений» are gone — the
  conditions no longer exist. All other warnings (price disagreement, photo
  failures) stay.

No wire change (`BillzSyncReport` shape unchanged — fewer warnings is not a
shape change), no UI change beyond the error-message numeral, no
shared/cms/storefront edits. Files touched: the three above plus
`api/test/app.e2e-spec.ts`.

## Live evidence (prod smoke, 09.10.2026)

Full sync 32/32 products synced with ZERO warnings (previous run: 53 warning
lines); `importedPhotos: 11` on the first run and `0` on the re-run (sourceUrl
dedup). «Платье с пайетками» ended with exactly S/M/L and a 12-photo gallery;
«Кольцо „Золотой лев"» gained sizes 16/17; the vases stayed size-less with
their dimension rows counted into stock totals. api e2e 70/70 green (court
re-ran it; 5 new specs cover upsert-create, prune, dimension/STD → total-only
with no warning, a real ~12 MiB image through sharp, and >30 MiB still rejected
with the Russian warning); public-bundle leak spec green, `tsc --noEmit` clean.

## QC trim (recorded compromise, as billz-v3/v4)

Backend-only, no UI/wire change → QC = api e2e + the orchestrator's live smoke
on prod after deploy. playwright-qa, bug-hunter and planner-assessor skipped
per contract §1; supreme-court ruled on that evidence set.

## Known limitations / later list (unfunded)

- **Storefront default size row for null `sizeValues` (pre-existing, surfaced
  during the smoke — NOT introduced by v5):** the storefront renders the
  default XS–XL size row for wearable products whose `sizeValues` is null, so a
  dress that only exists in S/M/L still displays XS and XL as selectable.
  `PublicProduct` carries no actual size list and sync does not write
  `sizeValues`. Candidate fix: sync writes `sizeValues` from the recognized
  sizes. Belongs to a future contract.
- The CMS media drop-zone hint strings (`cms/src/lib/i18n/ru.ts`:
  `dropFormats`, `dropFormatsImages`) still say «до 10 МБ» while the server now
  accepts 30 MiB images — cms/** was out of scope this run; a numeral update
  can ride along with any future CMS change.
- A size deliberately hidden in UMA will be recreated by the next sync — Billz
  is now the source of truth for matched products' sizes; curate in Billz.
- Previously failed large photos were not migrated by hand; the next sync picks
  them up via sourceUrl dedup (confirmed by the smoke's importedPhotos 11 → 0).
- billz-v2/v3/v4 limitations carry over unchanged.
