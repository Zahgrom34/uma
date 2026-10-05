---
feature: billz-v4 — name-based variant grouping in the Billz sync
status: approved
budget:
  iterations_allowed: 1         # the remaining iteration of the 04.10.2026 2-iteration grant
  iterations_used: 0
  usd_at_start: 41.80
created: 05.10.2026
---

## 1. Scope

The merchant's BILLZ 2 catalog stores every size (and color) as a separate product row with a
unique `parent_id` (groups of one — verified 03.10 and 05.10, zero multi-row parent groups among
292 rows). Today the sync therefore reads price/stock/sizes/photos from the single row whose sku
matches `billzSku`, which forces admin workarounds ("photos only in the smallest-size card",
one-size-only stock). billz-v4 extends group resolution in `api/src/billz/billz.service.ts` so a
matched product aggregates ALL rows of the same Billz product name:

- **Group = rows sharing the matched row's parent group (existing logic) UNION rows sharing its
  name stem** — `name.split(' / ')[0]` trimmed, case-insensitively. Rows whose whole name has no
  ` / ` separator use the full name as stem. The union keeps billz-v2 behavior intact for catalogs
  with real parent grouping.
- Sizes: per-size qty summed across ALL group rows (several colors of size S add up); size set =
  union of group sizes. Stock = total over group. Photos: already collected per group
  (`groupPhotoUrls`) — stem grouping widens them automatically; cap 10 and ordering unchanged.
- Pricing: unchanged rule (first selected-shop price of the group's first row; existing
  disagreement warning now also fires when color rows differ in price — e.g. «Sumka paxta» oq
  519 000 vs ko'k 469 000).
- `billzSku` semantics restored to the original intent: ANY variant's артикул links the whole
  product.

**QC trim (recorded compromise):** no UI change, no wire change → QC = api e2e (updated stubs) +
orchestrator live smoke against the real merchant account; playwright-qa/bug-hunter/
planner-assessor SKIPPED. supreme-court still rules on the evidence.

## 2. Out of scope

Everything in billz-v1/v2/v3 §2; color variants as separate site products; any shared/** or cms/**
change; storefront; scheduled/cron sync; re-grouping warnings UI. Stem collisions between genuinely
different products that share an identical full stem are accepted risk (none exist in the current
catalog; names like «Naqshli ko'ylak» vs «Naqshli polo» have distinct stems).

## 3. Implementation contract

`api/src/billz/billz.service.ts` only (+ e2e spec):
1. Index rows by normalized stem alongside the existing sku/parent indexes.
2. `resolveGroup(row)` returns the deduplicated union: existing parent/children resolution ∪
   stem-mates. Dedup by row id (fall back to sku when id is absent in stubs).
3. Per-size aggregation: qty summed per normalized size across the group (was: last row wins via
   map assignment — verify and fix if so); rows without a size attr keep counting toward product
   total only. Everything downstream (LOW_STOCK_THRESHOLD, write path, report, warnings,
   transaction, invalidate) unchanged.
4. e2e (`api/test/app.e2e-spec.ts`): extend the existing happy-path stub catalog with same-stem
   rows (unique parent_ids, two sizes + a second color duplicating one size) and assert: sizes =
   union, duplicated size qty summed, photos collected from a non-matched stem-mate row, price
   disagreement across stem-mates warns. All existing specs stay green.

## 4. Acceptance criteria

1. `cd api && npm test` fully green (was 64/64; new assertions added).
2. LIVE smoke (orchestrator, real token, prod): after sync — «Платье с пайетками» (linked to one
   S-row) has sizes S/M/L available with qty summed across colors (bundle `unavailableSizes`
   consistent); «Куртка с принтом Пахта» gallery contains photos from BOTH S-color rows (≥7
   media) without duplicates; re-run sync → `importedPhotos: 0`, no size flapping.
3. No leak regressions (`billz*` absent from public bundle).
4. Report/warnings remain native Russian; no new UI strings (nothing for antislop).

## 5. Deploy (orchestrator, after ALLOW)

Commit + push, `sudo docker build` on the server, container swap (same flags), live re-verify §4.2,
then documentor close-out.

## 6. Conflict log

(empty)

## 7. Verdict

**Ruling: ALLOW**

**Grounds:**
1. §4.1 PASS — `cd api && npm test` re-run by the court: 65/65 green, including the new spec
   «stem grouping: same-name rows sum sizes across colors, collect photos, warn on price
   disagreement (billz-v4)» (backend report A; court's own run, 05.10.2026).
2. §3.1–3.3 PASS — rowStem index, resolveGroup union with dedup by id||sku, per-size qty summing
   asserted; implementation confined to `api/src/billz/billz.service.ts` + e2e spec as contracted
   (backend report A).
3. §4.2 substantially PASS — live smoke against the real merchant token on local API with new
   code: артикул YYS-42424 matched a 6-row stem (2 colors × S/M/L), stock 118 = exact Billz sum
   across both colors, sizes S/M/L available, price 1 150 000 from matched row, product restored
   field-by-field afterwards (orchestrator smoke B). The two prod-only checks (kurtka gallery ≥7
   photos, importedPhotos: 0 on re-run) are deploy-gated per §5; the photo-from-stem-mate and
   dedup paths are proven locally by e2e (importedPhotos 2, mediaIds 4) (evidence C).
4. §4.3 PASS — existing leak spec green in the court's test run. §4.4 PASS — no new strings
   (evidence D).
5. QC trim is contract-sanctioned (§1): api e2e + orchestrator live smoke constitute the full
   evidence set for this run; no missing input.

**Budget state:** iterations 1/1 used by this run (0 → 1). usd_at_start 41.80; active 5h block
48.52 USD → ~6.72 USD spent this iteration. Day total 49.30 USD (ccusage daily, 05.10.2026).
No further full iteration is payable under the grant; none is required.

**Remedy:** SHIP. Conditions (within remaining budget, no re-run):
1. Orchestrator executes §5 deploy, then re-verifies the deploy-gated half of §4.2 live:
   «Куртка с принтом Пахта» gallery ≥7 media from both color rows without duplicates;
   second sync → `importedPhotos: 0`, no size flapping. Any failure there is a deploy/prod-data
   issue, not grounds to reopen this contract.
2. documentor close-out per pipeline step 6.

**Later list (documented, non-blocking):**
- Priceless rows are skipped in the price-disagreement comparison (backend judgment call,
  fixture-only situation). Record in the feature doc as accepted behavior.
- Stem-collision risk between identically-stemmed distinct products remains accepted per §2;
  revisit only if the merchant catalog ever grows such names.
