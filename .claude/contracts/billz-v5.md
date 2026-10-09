---
feature: billz-v5 — Billz-driven sizes + larger photo inputs
status: allowed
budget:
  iterations_allowed: 1         # user-granted 09.10.2026
  iterations_used: 1
  usd_at_start: 29.41
created: 09.10.2026
---

## 1. Scope

Two root causes from the 09.10 production sync log, both ours:

**A. Photo size cap.** The merchant uploads full-res camera JPEGs (9–16 MB, verified live); our
pipeline rejects >10 MiB in BOTH `BillzClient.downloadPhoto` and `MediaService.ingest`
(`MAX_UPLOAD_BYTES`), producing «не удалось загрузить фото из Billz» for every large photo.
Raise both limits to **30 MiB** for images (ingest resizes to 1600px WebP, so input size is
transient). The CMS upload route (multer 52 MB) then also stops rejecting 10–30 MB admin uploads —
intended, same constant.

**B. Sizes are not Billz-driven.** Sync only updates ProductSize rows that already exist, so real
Billz sizes never reach the site («размер … есть в Billz, но не заведён — пропущен»), stale UMA
demo sizes linger with «не найден в Billz» warnings, and decor rows warn forever because their
`razmer` holds dimensions («18*33») or STD. New behavior for MATCHED products:

1. **Size recognition**: a razmer value counts as a wearable size iff, after trim+uppercase, it
   matches `/^(XXS|XS|S|M|L|XL|XXL|3XL|4XL)$/` or `/^\d{1,2}([.,]5)?$/` (clothing/shoe/ring
   sizes). Anything else (dimensions `18*33`, `150*200`, STD, ONE SIZE, free text) is NOT a size:
   its qty counts toward the product total only, with NO warning.
2. **Upsert**: recognized Billz sizes missing in UMA are CREATED (`available = qty>0`,
   `lowStockQty` per existing threshold rule). Existing ones update as today.
3. **Prune**: UMA sizes absent from the Billz group are DELETED (targeted deleteMany inside the
   existing `$transaction`, never replace-all of the whole list). Products without a billzSku are
   untouched. The two size warnings («не заведён — пропущен», «не найден в Billz, оставлен») are
   removed — the conditions no longer exist. All other warnings (price disagreement, photo
   failures) stay.

**QC trim (recorded compromise, as billz-v3/v4):** backend-only, no UI/wire change → QC = api e2e
+ orchestrator live smoke on prod after deploy. playwright-qa/bug-hunter/planner-assessor skipped;
supreme-court rules on the evidence.

## 2. Out of scope

Everything in prior billz contracts' §2; shared/** and cms/** (BillzSyncReport shape unchanged —
fewer warnings is not a shape change); storefront; cron; video; per-color products; changing the
52 MB multer limit; migrating previously failed photos retroactively by hand (the next sync picks
them up via sourceUrl dedup — nothing stored for failed ones).

## 3. Implementation contract

Files: `api/src/media/media.service.ts` (MAX_UPLOAD_BYTES 10→30 MiB), `api/src/billz/billz.client.ts`
(downloadPhoto cap 10→30 MiB), `api/src/billz/billz.service.ts` (size recognition/upsert/prune per
§1B), `api/test/app.e2e-spec.ts`. Size regexes live as named constants with the §1B.1 semantics.
Write path stays one `$transaction` + single `content.invalidate()`; report persisted as before.

## 4. Acceptance criteria

1. `cd api && npm test` fully green (65 existing must pass; new/updated specs): (a) Billz size
   absent in UMA → created with correct available/lowStockQty; (b) UMA size absent in Billz →
   deleted; (c) dimension razmer `18*33` and STD → no ProductSize, no warning, qty in total;
   (d) 12 MiB photo buffer → ingested (stub returns it; sharp gets a real image); (e) >30 MiB →
   still rejected with the Russian photo warning; (f) existing leak/sentinel/409 specs untouched.
2. LIVE prod smoke after deploy: sync → warnings contain NO «не заведён — пропущен» and NO
   «не найден в Billz, оставлен без изменений» lines; «Платье с пайетками» sizes become exactly
   S/M/L; «Кольцо „Золотой лев"» gains sizes 16/17; vases stay size-less; previously failed large
   photos import (importedPhotos > 0 on first sync, 0 on re-run); dress gallery grows accordingly.
3. Public bundle leak-free as before; `unavailableSizes`/`lowStockSizes` stay consistent on the
   storefront product pages (spot-check one dress).
4. No new user-facing strings (nothing for antislop).

## 5. Deploy (orchestrator, after ALLOW)

Commit + push, server docker build `uma:billz-v5`, container swap, run §4.2 live, documentor.

## 6. Conflict log

(empty)

## 7. Verdict

**Ruling:** ALLOW (conditions below)

**Grounds:**
1. §4.1 verified first-hand by the court, not just from the report: `cd api && npm test` → 70/70 green, `tsc --noEmit` clean. The 5 new billz-v5 specs map one-to-one to §4.1 a–e (upsert-create with available/lowStockQty; prune deletion; «18*33»/STD → no ProductSize, no warning, qty in total; real ~12 MiB image through sharp; >30 MiB rejected with the Russian warning). Existing leak/sentinel/409 specs pass untouched (§4.1 f, §4.3 bundle-leak spec green).
2. Diff inspected by the court: caps raised to 30 MiB in BOTH `api/src/media/media.service.ts` (MAX_UPLOAD_BYTES, images only — MAX_VIDEO_BYTES untouched) and `api/src/billz/billz.client.ts` (PHOTO_MAX_BYTES, checked on Content-Length AND final buffer), per §1A/§3. Size logic in `api/src/billz/billz.service.ts` uses named LETTER_SIZE/NUMERIC_SIZE constants with exactly the §1B.1 regex semantics; unrecognized razmer counts toward total only with no warning; prune is a targeted deleteMany by stored original size values inside the existing ops batch/$transaction (legacy-case rows handled); the two obsolete warnings removed, condition no longer reachable. Files touched = exactly the four owned in §3.
3. Judgment call accepted: updating the existing upload-error numeral «10 МБ» → «30 МБ» is not a new user-facing string (§4.4) and keeping it would misinform the admin. Numeral-only change, nothing for antislop.
4. QC trim is contract-sanctioned (§1): playwright-qa/bug-hunter/planner-assessor skipped per the recorded user compromise; court rules on api e2e + diff evidence, with §4.2 deploy-gated.
5. No blocker-severity evidence exists in any input; root cause §1A was verified live pre-contract (evidence C: failing photos are 10–16 MB on DO Spaces, network healthy).

**Budget state:** iteration 1 of 1 used. usd_at_start 29.41; active 5h block at ruling 34.89 USD → ~5.48 USD spent this run. Day total 98.35 USD; block projects 99.98 USD. Budget allows no second development iteration — irrelevant, as none is needed.

**Remedy:** Ship. Conditions (fit within remaining budget, orchestrator-owned per §5):
1. Deploy per §5, then run the §4.2 live smoke verbatim (no obsolete size warnings; dress → exactly S/M/L; ring → 16/17; vases size-less; importedPhotos > 0 then 0 on re-run; dress gallery grows) and the §4.3 storefront spot-check.
2. A §4.2 failure is treated as a deploy/prod-data issue per the billz-v4 precedent — targeted fix only, not a re-run of development.
3. On clean smoke: documentor closes out (feature record, changelog, contract).
