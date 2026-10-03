# billz-v2 — adapt Billz sync to the BILLZ 2 API

Contract: `.claude/contracts/billz-v2.md` (status: allowed; supreme-court ALLOW,
03.09.2026, single lean iteration). Shipped: 03.09.2026. Supersedes the platform layer
of billz-v1 (`docs/features/billz-v1.md`). Empirical API reference:
`docs/reference/billz2-api-notes.md` — the vendored BILLZ 1 docs no longer apply.
Photo import from Billz rows was added later in billz-v3 (`docs/features/billz-v3.md`).

## Why the pivot

billz-v1 was built against the vendored BILLZ 1 docs (`api.billz.uz`, JSON-RPC 2.0,
self-signed JWT) the user pointed at. When the merchant's real credential arrived, the
live smoke revealed the shop actually runs **BILLZ 2** (app.billz.io): the secret token
authenticates against `api-admin.billz.ai` and fails against `api.billz.uz`. billz-v2
rewired the outbound client and the sync mapping to the real platform; everything else
from billz-v1 (write path, report UI, sentinel secret storage, `billzSku` match field,
privacy guarantees) stayed.

## What changed vs billz-v1

- **`BillzClient` rewritten** (`api/src/billz/billz.client.ts`): POST
  `/v1/auth/login {secret_token}` → bearer access token, cached in memory (keyed by
  token hash) with one re-login on 401, then fail. `getProducts(page, limit)` = GET
  `/v2/products` (paginated until `count` covered); `getShops()` = GET `/v1/shop?limit=100`.
  Same 30 s AbortController and typed 400/502 error mapping as v1; still injectable so
  e2e stubs it.
- **Sync remapping** (`api/src/billz/billz.service.ts`, structure kept): BILLZ 2 gives
  each size variant its own auto-generated sku, so matching goes through `parent_id`
  grouping — pasting ANY variant's артикул matches the whole variant group (parent row →
  its children; child row → all siblings; simple row → itself). Sizes come from the
  `product_attributes` entry whose name matches /^(razmer|размер|size)$/i; qty is summed
  from `shop_measurement_values` over the selected shops ([] = all); pricing from
  `shop_prices` of the first selected shop present, with `promo_price > 0 && < retail_price`
  driving the `sale`/`oldPrice` rule. Disagreements between shops or group rows warn.
- **Settings simplified**: `billz` Setting row is now `{secretKey, shopIds: string[]}` —
  username/issuer/officeIds removed. The `secretKey` field name is kept for sentinel
  plumbing but now holds the BILLZ 2 secret token. Legacy rows with old fields are
  tolerated on read; the next PUT rewrites them clean.
- **New endpoint**: `GET /api/admin/billz/shops` → `BillzShop[]` (`{id, name}`),
  AdminGuard, same 400/502 mapping.
- **CMS card simplified** (`cms/src/components/settings/billz-card.tsx`): «Секретный
  токен» field (sentinel behavior unchanged) plus a checkbox list of real shop names
  loaded from the shops endpoint once a token is saved; empty selection = все магазины
  (muted hint). Username/issuer inputs and the comma-separated IDs field are gone.
- **Types**: `BillzSettingsSchema` reduced to `{secretKey, shopIds}`, new `BillzShop`
  wire type; `shared/src/index.ts` mirrored verbatim in `cms/src/lib/api/types.ts`.
- **Tests**: api e2e suite updated to the new client seam — 61/61 green.

## Live evidence (real merchant account, 03.09.2026)

Unlike v1 (whose live smoke was pending the key), v2 was verified end-to-end against the
real account: «Проверить подключение» reported 276 rows matching the catalog; the shops
list showed the merchant's 4 real shops; a real sync via артикул KDE-68543 applied the
exact Billz retail price (1 100 000 → 729 000), cleared a stale sale flag, set stock 43,
and produced Russian missing-size warnings; the test product was restored afterwards
(no residue in content). Public bundle stayed leak-free (`billz`, `billzSync`, `billzSku`
absent). This closes billz-v1's pending-external criteria.

## QC trim (recorded compromise)

Weekly budget was at ~10%, so with the user's sanction the run skipped bug-hunter and
planner-assessor. QC = playwright-qa (7/7, focused, state restored) + the orchestrator's
live smoke above. The trimmed agents had fully audited the same card and copy in
billz-v1, and v2 shrinks that surface. supreme-court still ruled on the evidence.

## Known limitations / later list (unfunded)

- The shops checkbox list has no loading placeholder — a ~1–2 s blank gap while shops
  fetch after saving a token.
- The shop list is not alphabetized (rendered in API order).
- Access-token cache is in-memory only (fine for the single-instance deployment; a
  restart just re-logs-in).
- billz-v1 limitations that carry over: manual trigger only, replace-only secret,
  duplicate-billzSku fan-out warned not blocked, `LOW_STOCK_THRESHOLD = 3` hard-coded,
  in-memory sync lock.
- Dev-env note: after rebuilding `shared/`, the api's nodemon/ts-node child needs a
  manual restart to pick up the new schema — a watch-mode gap, not an app bug.
