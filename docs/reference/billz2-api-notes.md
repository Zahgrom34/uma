# BILLZ 2 API — empirically verified notes (03.09.2026)

The shop turned out to run **BILLZ 2** (app.billz.io), not BILLZ 1 — the merchant's secret token
authenticates against `api-admin.billz.ai` and fails against `api.billz.uz` (see billz-v1 close-out).
The official BILLZ 2 docs live in a JS-rendered Notion site (not vendorable); everything below was
verified live against the merchant account on 03.09.2026. Sanitized sample responses:
none committed (contain live commercial data) — re-probe with the token from `api/.env` when needed.

## Auth

- `POST https://api-admin.billz.ai/v1/auth/login`, JSON body `{"secret_token": "<token>"}`.
- 200 → `{code: 200, message: "ok", data: {access_token, refresh_token}}`. The access token is a JWT
  (HS256, company/user UUIDs inside) with `exp` ≈ 15 days out. Use `Authorization: Bearer <access_token>`.
- The merchant has ONE credential: the secret token (issued in the BILLZ cabinet). No username/issuer.

## Products

- `GET https://api-admin.billz.ai/v2/products?limit=<n>&page=<n>` → `{count, products: [...]}`.
  Observed catalog: 276 rows, `limit=100` accepted. Paginate until `page*limit >= count`.
- Row fields (observed): `id` (uuid), `parent_id` ('' for simple/parent), `is_variative` (true on parents),
  `name` (e.g. `Naqshli ko'ylak / M / ko'k`), `sku` (артикул, e.g. `KDE-68543` — **unique per size variant**,
  auto-generated, NOT a shared stem), `barcode`, `description` (HTML), `updated_at`,
  `product_attributes: [{attribute_name, attribute_value, ...}]` — size variant rows carry
  `attribute_name: "razmer"` with `attribute_value: "M"` (attribute names are merchant-defined;
  match case-insensitively on razmer/размер/size),
  `shop_prices: [{shop_id, shop_name, retail_price, retail_currency: "UZS", promo_price, promos}]`,
  `shop_measurement_values: [{shop_id, shop_name, active_measurement_value}]` — this is the per-shop stock qty.
- Variant model: a variative product has a parent row (`is_variative: true`) and child rows sharing
  `parent_id`; each child = one size/color combo with its own sku+barcode. Simple products are single rows.
- `photos: [{photo_url, sequence, is_main}]` (verified live 03.10.2026) — product photos per row.
  `photo_url` is an absolute https URL on `fra1.digitaloceanspaces.com` (jpg/png), `sequence` orders
  them, `is_main` marks the cover. Plain unauthenticated GET downloads them. In the current catalog
  41 of 292 rows carry exactly one photo each, but the field is an array — handle several per row.
- **Catalog restructure (observed 03.10.2026):** the merchant's catalog was rebuilt since 03.09 —
  every row now has a UNIQUE `parent_id` (variant groups of one). The group-resolution logic
  (sku → row → parent_id → siblings) still functions unchanged; it just resolves single-row groups.
  Flagged to the user separately; no sync changes made for it (billz-v3 §1/§2).

## Shops

- `GET https://api-admin.billz.ai/v1/shop?limit=<n>` → `{count, shops: [{id, name, ...}]}`.
  Merchant has 4 shops incl. a warehouse («Склад …») — stock relevant to the online store is a
  subset the admin selects in CMS settings.

## Errors

- Unknown routes → `{"error":{"code":"NOT_FOUND","message":"not found"}}` with 200-family/404 semantics;
  treat non-2xx and `error` bodies as failures. Invalid/expired access token → 401 (re-login once, then fail).
