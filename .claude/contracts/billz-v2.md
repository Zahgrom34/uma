---
feature: billz-v2 — adapt Billz sync to BILLZ 2 API
status: allowed
budget:
  iterations_allowed: 1         # lean run — weekly plan budget at ~10%, user-granted
  iterations_used: 1
  usd_at_start: 57.16
created: 03.09.2026
---

## 1. Scope

Adapt the shipped billz-v1 stock+price sync to the merchant's actual platform, **BILLZ 2**
(`api-admin.billz.ai`, REST + bearer token) — see `docs/reference/billz2-api-notes.md` for the
empirically verified API shapes (authoritative for this run; the BILLZ 1 docs no longer apply).
Replace the outbound client (token login instead of self-signed JWT), remap the product response
(per-shop prices/stock, parent_id variant grouping, razmer attribute sizes), simplify the CMS card
(secret token only — username/issuer fields removed; shop selection by real shop names via a new
shops endpoint). Everything else from billz-v1 stays: sentinel secret storage, billzSku match field,
sync write path, report UI, privacy guarantees.

**QC trim (recorded compromise):** weekly budget ≈10%. QC = playwright-qa (focused) + the
orchestrator's live smoke against the real merchant account (token in `api/.env`). bug-hunter and
planner-assessor are SKIPPED this run — the UI surface shrinks relative to billz-v1, whose full QC
audited the same card and copy. supreme-court still rules on the evidence.

## 2. Out of scope

Everything in billz-v1 §2 (cron, orders, catalog import, storefront, secret deletion, env creds), plus:
no BILLZ 2 features beyond products/shop endpoints (no clients, no orders, no webhooks), no retry
queues, no token persistence beyond in-memory cache, no changes to the sync report UI layout.

## 3. Data & API contract

### Wire/schema changes (shared/src/index.ts → mirrored in cms/src/lib/api/types.ts)

```ts
export const BillzSettingsSchema = z.object({
  secretKey: z.string().max(2000, 'Слишком длинный токен'),   // now holds the BILLZ 2 secret token; '' on PUT = keep
  shopIds:   z.array(z.string().trim().min(1)).max(50),       // BILLZ 2 shop UUIDs; [] = all shops
});
// username/issuer/officeIds REMOVED. Field name secretKey kept to preserve sentinel plumbing.

export interface BillzSettings { secretKey: string; secretKeySet: boolean; shopIds: string[] }
export interface BillzShop { id: string; name: string }
// BillzSyncReport, BillzTestResult unchanged.
```

Settings controller: DEFAULTS `{secretKey:'', shopIds:[]}`; sentinel semantics unchanged; stored
legacy billz rows with old fields are tolerated (unknown keys ignored on read; next PUT rewrites clean).

### BillzClient (api/src/billz/billz.client.ts — rewrite)

- `login(secretToken)` → POST `https://api-admin.billz.ai/v1/auth/login` `{secret_token}` → access_token.
  In-memory cache keyed by token hash, invalidated on 401/exp; re-login once on 401, then fail.
- `getProducts(page, limit)` → GET `/v2/products?limit=&page=`; `getShops()` → GET `/v1/shop?limit=100`.
- Same 30s AbortController, same typed errors (auth → 400 «Неверные данные Billz», network/5xx →
  502 «Billz недоступен, попробуйте позже»). Injectable; e2e overrides the provider (stub gets
  `login/getProducts/getShops` or a single `call`-style seam — implementer's choice, but the stub
  surface must cover all three behaviors).

### Sync semantics (BillzService — adapt, keep structure)

1. Paginate `getProducts(page, 100)` until `count` covered.
2. Index rows by normalized sku (trim/lowercase) and by `parent_id`.
3. Match: UMA `billzSku` → row by sku. If the row has `parent_id != ''` → group = all rows sharing that
   parent_id; if the row IS a parent (`is_variative`) → group = its children; else group = [row].
   (Admin workflow: paste ANY variant's артикул from Billz.)
4. Per row: size = `product_attributes` value whose `attribute_name` matches /^(razmer|размер|size)$/i,
   trimmed+uppercased; rows without a size attr → qty to product total only.
   qty = Σ `shop_measurement_values.active_measurement_value` over selected shops (shopIds; [] = all).
5. Pricing per group: from `shop_prices` of the first selected shop present (or first entry when [] );
   warn when selected shops disagree; warn when group rows disagree (first row wins).
   `promo_price > 0 && promo_price < retail_price` → `sale=true, oldPrice=round(retail), price=round(promo)`;
   else `sale=false, oldPrice=null, price=round(retail)`. Coherence guard as in v1.
6. Stock/write path/report/warnings/threshold/transaction/invalidate: UNCHANGED from billz-v1
   (incl. ru product names in warnings).
7. `test()` = login + `getProducts(1, 1)` → `{ok: true, rows: count}`.

### Endpoints

Existing three unchanged. NEW: `GET /api/admin/billz/shops` → 200 `BillzShop[]` (id+name only);
same 400/502 error mapping; AdminGuard.

## 4. UI surface

Billz card only (`cms/src/components/settings/billz-card.tsx`):
- REMOVE username + issuer inputs (and their i18n keys' usage; keys may stay or go — no dead UI).
- Secret token field: same sentinel behavior; label «Секретный токен», hint that it's issued in the
  BILLZ cabinet (adapt the existing credsHint — no more username/shop-ID wording).
- Shop selection replaces the comma-IDs input: when a secret is set, load `GET /api/admin/billz/shops`
  and render checkboxes with real shop names (shadcn Checkbox list, quiet); empty selection = все
  магазины (say so in a muted hint). While shops can't load (no/бад token, network) show a one-line
  muted message, not an error state. Selected ids persist in `settings.billz.shopIds`.
- Buttons + last-run summary unchanged.

## 5. i18n

Adjust `t.billz.*` in `cms/src/lib/i18n/ru.ts`: «Секретный токен», token hint («Токен выдаётся в
кабинете BILLZ…» tone), «Магазины» + hint «Ничего не выбрано — синхронизируются все магазины»,
shops-unavailable line («Список магазинов появится после сохранения токена» / failure variant).
Remove now-unused keys. Run `antislop` over changed copy. Server messages unchanged.

## 6. File ownership

Same split as billz-v1: **backend-developer** — `shared/src/index.ts`, `api/**` (billz module rewrite,
settings controller defaults/schema, e2e spec updates), `cms/src/lib/api/types.ts`.
**ui-developer** — `cms/**` except types.ts (card, `lib/api/billz.ts` +useBillzShops, keys.ts, ru.ts,
settings.ts AdminSettings if needed).

## 7. Acceptance criteria

1. `cd api && npm test` green; Billz e2e specs updated to the v2 client seam (sentinel, 400-no-creds,
   502, happy-path with parent_id grouping + razmer sizes + promo pricing, shops endpoint, leak check).
2. Card shows секретный токен + магазины checkboxes (real shop names once token saved); no
   username/issuer remnants anywhere in the UI.
3. LIVE (orchestrator/QA with real token): «Проверить подключение» → success toast with row count
   matching the real catalog (~276); shops list shows the merchant's 4 shops.
4. LIVE: a product given a real Billz артикул syncs — price and per-size availability update to match
   Billz; report shows sane counts; then billzSku cleared (no test residue in content).
5. Public bundle still leak-free (`billz`, `billzSync`, `billzSku` absent).
6. Anti-slop + ru comprehension on changed copy (antislop pass; no jargon without a hint).
7. Legacy intact: other settings cards, product editor, billz-v1 report UI unchanged.

## 8. Conflict log

(empty)

## 9. Verdict

**ALLOW** (supreme-court, 03.09.2026). All 7 criteria PASS: 61/61 api tests (stubbed seam covering §7.1); live smoke against the real merchant account — test 276 rows, 4 real shops listed, real sync via артикул KDE-68543 applied exact Billz retail (1 100 000 → 729 000), cleared stale sale, stock 43, Russian missing-size warnings, product restored; public bundle leak-free; playwright-qa 7/7 with state restored; antislop 0.

Later-list (no budget remains): shops-fetch loading placeholder (~1–2s gap); alphabetize shop list. Dev-env note: nodemon/ts-node needs a manual child restart after a shared rebuild.

Budget: 1/1 iteration used; ~$15.51 this run (block 72.67 vs start 57.16); weekly $909.90 (~10% headroom warning confirmed). QC trim (no bug-hunter/planner-assessor, orchestrator live smoke as substitute) was user-sanctioned and recorded in §1.
