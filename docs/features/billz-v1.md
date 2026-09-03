# billz-v1 — Billz POS stock + price sync (manual)

> **Superseded by billz-v2 (03.09.2026).** The live smoke revealed the merchant runs
> BILLZ 2 (app.billz.io / api-admin.billz.ai), not BILLZ 1 — the client, sync mapping,
> and settings described below were reworked in `docs/features/billz-v2.md`, whose live
> verification also closed this record's pending live-smoke items (criteria 3/5). The
> write path, report UI, sentinel, and privacy guarantees documented here still apply.

Contract: `.claude/contracts/billz-v1.md` (status: allowed; supreme-court ALLOW,
03.09.2026, with a 0.5-iteration fix pass for two copy/warning remedies). Shipped:
03.09.2026. Vendored Billz API reference: `docs/reference/billz-v1-auth.md`,
`docs/reference/billz-v1-methods.md`; pre-contract notes:
`docs/reference/billz-integration-prep.md`.

## What shipped

Phase 1 of the Billz integration: a manually triggered stock + price sync from the
merchant's BILLZ 1 account (`api.billz.uz`, JSON-RPC 2.0) into the UMA content API.
Nothing flows the other way — no order push, no catalog import, no cron. Four pieces:

- **`api/src/billz/` module** — an injectable `BillzClient` (self-signed HS256 JWT,
  JSON-RPC calls) and a `BillzService.sync()` that matches Billz product rows to UMA
  products by a new `Product.billzSku` field, merges per-size rows, and updates
  price/sale/oldPrice, per-size availability, and stock counters in one transaction.
- **CMS Settings → «Интеграции» → Billz card** — credentials (secret key, username,
  issuer, office-ID filter), «Проверить подключение», «Синхронизировать», and a
  persisted last-run summary. The secret is write-only: it never travels back to the
  browser after save.
- **Product editor** — a text field «Артикул Billz» (`billzSku`), the match key. Admin
  API only; it does not appear in the public content bundle.
- **Coverage** — api e2e suite extended to 58 specs (11 new Billz specs against a
  stubbed client), all green.

## Architecture

### Outbound client (`api/src/billz/billz.client.ts`)

Billz auth is a self-signed JWT: the client signs `{iss: <site address>, sub:
<username lowercased>}` with the merchant's SECRET_KEY via `@nestjs/jwt`
(HS256, 5 min expiry) and sends it as `Authorization: Bearer` on a JSON-RPC 2.0 POST to
`https://api.billz.uz/v1/`. Global fetch with a 30 s AbortController. Errors are typed
three ways — auth, network/timeout, RPC — so the controller can map them to 400
«Неверные данные Billz» vs 502 «Billz недоступен, попробуйте позже». The client is an
injectable Nest provider so the e2e suite overrides it with a stub; no test ever hits
the live API.

### Endpoints (`api/src/billz/billz.controller.ts`, all under `AdminGuard`)

- `POST /api/admin/billz/test` → `{ok: true, rows}` or the 400/502 errors above; 400
  «Укажите данные Billz в настройках» when credentials are incomplete.
- `POST /api/admin/billz/sync` → runs inline, returns the `BillzSyncReport`; 409
  «Синхронизация уже выполняется» via an in-memory flag.
- `GET /api/admin/billz/status` → last persisted report or `null`.

### Sync semantics (`api/src/billz/billz.service.ts`)

Billz models each size as a separate product row (`properties.SIZE`); UMA has one
product with `sizeValues[]`. The sync:

1. Fetches everything with one `products.get` (`IncludeEmptyStocks: 1`, plus
   `offices: officeIds` when the filter is set — the filter defines which office(s)
   count as online-store stock).
2. Groups rows by normalized sku (trim + lowercase) and matches against
   `Product.billzSku` with the same normalization. A billzSku duplicated across UMA
   products updates all of them and adds a warning.
3. Merges sizes: `SIZE` trimmed + uppercased; duplicate sku+SIZE rows sum quantity;
   rows without SIZE add to the product total only. With an office filter, quantity is
   summed over the configured offices and price/discount comes from the first
   configured office present (disagreement → warning).
4. Prices sale-coherently: `discountAmount > 0` → `sale=true`,
   `oldPrice=round(price)`, `price=round(price − discountAmount)`; if rounding makes
   `oldPrice <= price` the discount is dropped; no discount → `sale=false`,
   `oldPrice=null`. `tag` is never touched, and translations/media/categories stay
   CMS-owned.
5. Updates stock: matched size → `available = qty > 0`, `lowStockQty = qty` when
   `0 < qty <= LOW_STOCK_THRESHOLD` (constant, 3). UMA sizes with no Billz row are left
   untouched with a warning; Billz sizes unknown to UMA are ignored with a warning.
   `product.stock = totalQty`, `outOfStock = totalQty === 0`.
6. Writes everything in a single `prisma.$transaction` of targeted `product.update` +
   per-size `productSize.update` calls (never a replace-all of `sizes`), then one
   `content.invalidate()` after commit — the storefront sees the result on next reload
   via the cms-v2 no-cache/ETag path.
7. Persists the report (`startedAt`, `durationMs`, `totalRows`, matched/updated counts,
   `unmatchedSkus` capped at 50, `warnings`, `error`) to Setting row `billzSync`.
   Warnings name products by their Russian name (slug fallback) so the report is
   readable in the CMS — this was one of the court's two funded remedies.

### Credentials and the secret sentinel

Credentials live in the `billz` Setting row (`{secretKey, username, issuer,
officeIds}`), not env vars — a deliberate user decision from the prep phase, so a
production deploy needs no env changes. The secret is protected by a sentinel protocol
in `settings.controller.ts`:

- `GET /api/admin/settings` always returns `billz.secretKey: ''` plus a
  `secretKeySet` boolean.
- `PUT` with `billz.secretKey === ''` keeps the stored secret; a non-empty value
  replaces it. `secretKeySet` from the client is stripped.

This makes the sentinel survive the CMS's read-modify-write save pattern: saving any
other settings card (e.g. соцсети) round-trips `''` and keeps the secret intact
(acceptance criterion 2, verified). There is no way to delete a stored secret from the
UI — replace only, by contract.

Neither `billz` nor `billzSync` is in the public allowlist of
`content.service.ts buildBundle()`, and `billzSku` is mapped onto `AdminProduct` only —
`GET /api/public/content` contains none of the three. This was double-verified
independently by the assessor and the court (criterion 6).

### Data and types

- Prisma: `Product.billzSku String?` (nullable, no unique index), migration
  `20260903051138_add_product_billz_sku`.
- `shared/src/index.ts`: `BillzSettingsSchema`, `SettingsSchema.billz` (optional),
  `billzSku` on the product upsert/patch schemas, wire types `BillzSettings`,
  `BillzSyncReport`, `BillzTestResult`. Verbatim copy in `cms/src/lib/api/types.ts`
  per the shared-package convention.

### CMS surface

No new route. `/settings` gains a section heading «Интеграции» with one `BillzCard`
(`cms/src/components/settings/billz-card.tsx`, following the social-links-card
pattern): password-type secret input showing «•••••• (сохранён)» when a secret is
stored, username, issuer (labelled «Адрес сайта» with a de-jargoned hint — the second
funded remedy dropped the raw «(issuer)» term), comma-separated office IDs with inline
Russian validation, a hint that the credentials come from the Billz company with the
merchant account, the test/sync action buttons, and the last-run summary (dd.mm.yyyy
HH:mm date, duration, matched/updated counts, unmatched skus, warnings) with a
«Синхронизация ещё не запускалась» empty state. All copy through `t.billz.*` /
`t.products.billzSku*` in `cms/src/lib/i18n/ru.ts`. API layer in
`cms/src/lib/api/billz.ts`.

## QC evidence

- playwright-qa: acceptance criteria 1–6 PASS in a real browser — the bad-credentials
  halves of 3 and the UI half of 5 with the stub/real-key caveat below.
- bug-hunter: criteria 8 (anti-slop / Russian comprehension) and 9 (legacy regression:
  settings cards, product editor, products list, storefront) PASS.
- `cd api && npm test`: 58/58 e2e specs, including 11 Billz specs (secret sentinel
  round-trip, no-creds 400, network 502, happy-path counts + pricing + sizes, officeIds
  Zod rejection, public-bundle leak check).
- planner-assessor and supreme-court independently re-verified criteria 6 and 7.

## Pending: live smoke test

Criteria 3 (valid credentials) and 5 (real Billz data updating a real product) are
PENDING-EXTERNAL on the user's SECRET_KEY, which no agent can produce. The court judged
this non-blocking because the client is built strictly to the vendored reference docs.
**When the key arrives:** run the live smoke of criteria 3/5 (test connection → map one
product's billzSku → sync → verify price/sizes). Any live-API deviation from the
vendored docs is a new finding for the user, not silent scope.

## Known limitations

- Manual trigger only; no cron or scheduled sync (out of scope by contract).
- Single unpaginated `products.get` fetch; no `LastUpdatedDate` incremental sync. Fine
  at the current catalog size, revisit if the Billz catalog grows large.
- Secret is replace-only — no UI path to clear it.
- A billzSku shared by several UMA products updates all of them (warned, not blocked).
- `LOW_STOCK_THRESHOLD = 3` is a hard-coded constant, not a setting.
- The sync-in-progress lock is an in-memory flag — correct only for a single API
  instance (which matches the current single-container deployment).

## Backlog (court "later" list, unfunded)

- The toast stack briefly (~5 s) covers the last settings card's save button.
- Saving the Billz card with all fields empty looks half-configured (no explicit
  "not configured" state).
- Pre-existing: the social-links card's inputs get squeezed on mobile widths.
