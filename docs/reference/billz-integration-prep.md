# Billz integration — prep notes (pre-contract)

> **Correction (billz-v2, 03.09.2026):** the shop actually runs **BILLZ 2**, not BILLZ 1 — the
> "confirmed facts" below about the platform are wrong; see `docs/reference/billz2-api-notes.md`.

> **Status (03.09.2026):** Phase 1 (stock + price sync) shipped as **billz-v1** — see
> `docs/features/billz-v1.md`. The open questions below were resolved in that run:
> match key = per-product `billzSku` field; trigger = manual «Синхронизировать» button
> only (no cron); online-store offices = the `officeIds` filter in the Billz settings
> card; `discountAmount` drives `sale`/`oldPrice` (sale-coherent). Phases 2 (catalog
> import) and 3 (order push) remain unbuilt. The rest of this file is kept as written.

Written 21.08.2026, before the implementation run. The contract for this feature does not
exist yet — it gets written at the start of the run, after the user grants a budget.

## Confirmed facts

- The shop runs **BILLZ 1** (`app.billz.uz`). API: JSON-RPC 2.0 over `POST https://api.billz.uz/v1/`
  (orders also have a v3 variant at `/v3/` with `clientID` support).
- Full API docs are vendored verbatim in this directory: `billz-v1-auth.md`, `billz-v1-methods.md`
  (source: https://api.billz.uz/docs/). Do not trust memory over these files.
- **Auth**: self-signed JWT, HS256. Payload `{iss: <site address>, iat: <unix time>}`, signed with a
  `SECRET_KEY` issued by the BILLZ company for the merchant account. Sent as `Authorization: Bearer`.
- Key methods:
  - `products.get` — products with price/priceUSD/discountAmount, per-office qty and prices,
    `properties` (BRAND, CATEGORY, SUB_CATEGORY, COLOR, SIZE, SEASON, GENDER, DESCRIPTION),
    `imageUrls` (strip `_square` suffix or use `FullSizePhoto=1` for originals).
    Incremental sync via `LastUpdatedDate`; filters: `ProductIds`, `offices`, `WithProductPhotoOnly`,
    `IncludeEmptyStocks`.
  - `orders.create` — push a sale (v1) / sale with client binding (v3); `parked: true` creates a
    deferred sale. paymentMethod enum incl. Cash, UZCard, Humo, Click, Payme, VISA.
  - `catalog.get` — paginated catalog with search/status/office filters.
  - Also available: `client.get/search`, `reports.*` (sales, inventory, cheques, …), `import.create`.
- **Billz models each size as a separate product row** (SIZE property). UMA products have one row
  with `sizeValues[]` — sync must group Billz rows (by SKU stem or name) into one UMA product.
- Billz has no ru/uz/en translations — those stay CMS-owned and must never be overwritten by sync.

## User decisions already made

- **API credentials are configured in the CMS**: Settings gets a new «Интеграции» section
  (Billz card: SECRET_KEY, iss, probably office ID filter) — NOT env vars. Stored via the existing
  settings mechanism (extend `SettingsSchema`; secret must not leak into the public content bundle).
- Implementation goes through the standard pipeline (contract, parallel dev, QC, court).
- Recommended phasing discussed with the user (they have not yet picked one or granted a budget —
  ASK FOR BUDGET before writing the contract):
  1. Stock + price sync Billz → CMS, matching by SKU/barcode (quick win, recommended first).
  2. Full catalog import (auto-create products; needs size-row grouping, translations left blank).
  3. Order push storefront → Billz (requires building an orders backend first — largest).

## Open questions for the run

- Match key between Billz rows and UMA products: `sku` vs `barCode` (UMA product IDs are slugs like
  `uma-sequin-dress`; a mapping table or a per-product `billzSku` field will be needed).
- Sync trigger: poll interval (cron in API) vs manual «Синхронизировать» button in CMS — or both.
- Which office(s) count as online-store stock (`offices` filter / officeID).
- Whether Billz discountAmount should drive UMA `sale`/`oldPrice` or only price.
- Existing production deployment: server container gets env unchanged; new settings arrive via DB,
  so a redeploy of the image (git pull + rebuild on the server) ships it.
