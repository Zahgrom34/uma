# billz-v4 — name-based variant grouping in the Billz sync

Contract: `.claude/contracts/billz-v4.md` (status: allowed; supreme-court ALLOW,
05.10.2026, single lean iteration — the remaining half of the 04.10 2-iteration
grant). Shipped: 05.10.2026, commit `816be83`, deployed to prod the same day as
image `uma:billz-v4`. Extends billz-v2/v3 (`docs/features/billz-v2.md`,
`docs/features/billz-v3.md`); everything from those is unchanged. Empirical API
reference: `docs/reference/billz2-api-notes.md`.

## What shipped

The merchant's BILLZ 2 catalog stores every size/color combination as a
standalone product row with a unique `parent_id` (variant groups of one — the
03.10 restructure, verified again 05.10: zero multi-row parent groups among 292
rows). The parent-based grouping from billz-v2 therefore degraded to single-row
groups, which forced admin workarounds (photos only in one specific card,
one-size-only stock per linked артикул). billz-v4 extends group resolution in
`api/src/billz/billz.service.ts` so a matched product aggregates ALL rows that
share the same Billz product name:

- **Group = parent-group rows (existing billz-v2 logic) ∪ name-stem mates**
  (`resolveGroup`, deduplicated by row id, falling back to sku). The stem is
  `name.split(' / ')[0]` trimmed and compared case-insensitively — e.g.
  `Naqshli ko'ylak / M / ko'k` → `naqshli ko'ylak`; a name without the ` / `
  separator is its own stem (`rowStem`). The union keeps billz-v2 behavior
  intact for catalogs with real parent grouping.
- **Sizes/stock:** per-size qty is SUMMED across all group rows (`sizeQty`
  map; previously last-row-wins) — several color rows of size S add up; the
  size set is the union over the group; product stock is the group total.
- **Photos:** `groupPhotoUrls` from billz-v3 already collects per group, so
  stem grouping widens photo import to every variant row automatically; dedup,
  `is_main`/`sequence` ordering and the cap of 10 are unchanged.
- **Pricing:** unchanged rule — first selected-shop price of the group's first
  priced row. The existing disagreement warning now also fires when color rows
  differ in price («строки размеров расходятся в цене, взята цена первой
  строки»). Rows with no `shop_prices` at all (e.g. variative parent rows)
  neither set nor dispute the group price — they are skipped in the comparison
  (accepted behavior per the verdict's later list; in practice a fixture-only
  situation).
- **`billzSku` semantics restored to the original intent:** ANY variant row's
  артикул links the whole product, not just one specific size card.

No wire change, no UI change, no shared/cms/storefront edits — the entire
implementation is `api/src/billz/billz.service.ts` plus the e2e spec.

## Admin-facing consequence

The workaround rules from the 05.10 state of affairs are obsolete:

- Photos no longer need to live only in the smallest-size Billz card — the
  sync collects them from ANY variant card of the product.
- The артикул entered in «Артикул Billz» can be any variant's sku; sizes and
  stock come from the whole name group either way.

## Live evidence

Local smoke (real merchant token, 05.10.2026): артикул YYS-42424 matched a
6-row stem (2 colors × S/M/L); stock 118 = S57 + M46 + L15 summed across both
colors, exactly matching the Billz per-row numbers; sizes S/M/L available;
price 1 150 000 from the matched row; product restored field-by-field after
the smoke. The photo-from-stem-mate and dedup paths were proven by e2e
(importedPhotos 2, mediaIds 4).

Prod (after deploy, 05.10.2026): full sync 32/32 products synced,
`importedPhotos: 2` on the first run and `0` on the re-run with no size
flapping; the «Куртка с принтом Пахта» gallery holds 8 unique photos drawn
from both color rows.

api e2e 65/65 green (court re-ran it), including the new spec «stem grouping:
same-name rows sum sizes across colors, collect photos, warn on price
disagreement (billz-v4)» and the existing public-bundle leak spec.

## QC trim (recorded compromise)

No UI change and no wire change, so QC = api e2e (extended stubs) + the
orchestrator's live smoke; playwright-qa, bug-hunter and planner-assessor were
skipped per contract §1. supreme-court ruled on that evidence set.

## Known limitations / later list (unfunded)

- Priceless rows (no `shop_prices`) are skipped in the price-disagreement
  comparison — accepted; revisit only if real catalog rows ever ship without
  prices.
- Stem collisions between genuinely different products that share an identical
  full stem would merge them into one group — accepted risk per contract §2;
  none exist in the current catalog (names like «Naqshli ko'ylak» vs «Naqshli
  polo» have distinct stems). Revisit if the merchant catalog grows such names.
- Color variants are still not separate site products (out of scope).
- billz-v2/v3 limitations carry over unchanged.
