# cms-v1 — content management, admin panel, live API storefront integration

Contract: `.claude/contracts/cms-v1.md` (status: allowed, supreme-court ALLOW 15.08.2026).
Shipped: 15.08.2026.

## What shipped

A NestJS + Prisma + SQLite API (`api/`) is now the source of truth for all storefront content: 21 products with first-class ru/uz/en translations, 10 categories, per-size stock, a local media library, 5 info pages, the ~186-key UI-string catalog, and commerce/contact/social settings. A shadcn/ui admin panel (`cms/`, Russian chrome) manages all of it behind cookie-JWT auth with a single seeded admin. The legacy storefront (`umabranduz/`) loads content at runtime from the public API with a three-tier fallback and is otherwise untouched.

## Architecture

Four workspaces:

- `api/` — NestJS 10, Prisma 5, SQLite. Modules: `auth`, `products`, `categories`, `media`, `pages`, `ui-strings`, `settings`, `content` (public bundle), `prisma`. Validation via Zod schemas from `shared/` through `api/src/common/zod-validation.pipe.ts`; validation errors are 400 with `{message, fieldErrors}`, messages in Russian. No framework config module — a minimal `.env` loader lives in `api/src/env.ts`. Uploaded media on disk in `api/uploads/` (webp, content-hash filenames).
- `shared/` — the boundary package `@uma/shared` (`shared/src/index.ts`): wire types (`PublicProduct`, `AdminProduct`, `ContentBundle`, `MediaAssetDto`, ...) and the Zod upsert schemas. Backend-owned; the CMS keeps a verbatim copy in `cms/src/lib/api/types.ts` and never imports `shared/` directly.
- `cms/` — admin panel. React + TypeScript + Tailwind + shadcn/ui, react-router v7, TanStack Query v5, react-hook-form + zod. Routes: `/login`, `/products` (default), `/products/new`, `/products/:id`, `/categories`, `/media`, `/pages`, `/pages/:slug`, `/copy`, `/settings` (`cms/src/routes.tsx`). All admin chrome strings live in `cms/src/lib/i18n/ru.ts`; formatting (UZS money, dd.mm.yyyy dates, ru plurals) in `cms/src/lib/format.ts`. Prod build is served under `/admin` (vite `base`).
- `umabranduz/` — legacy storefront (Vite + React JS). Two new files (`src/content.js`, `src/content-snapshot.json`), a rewritten `src/main.jsx`, and exactly three edits in `App.jsx` (productCopy import, pageCopy import, commerce constants). `data.js`, `styles.css`, and the i18n hack functions are unchanged.

### Storefront content loading (three tiers)

`umabranduz/src/content.js` exports `loadContent()` and `applyContent(bundle)`:

1. **Live API** — fetch `VITE_API_URL + /api/public/content` with the stored ETag, 3 s timeout; a 200 caches `{etag, bundle}` in `localStorage['uma-content-cache']`. *(Superseded by cms-v2: the fetch is now a simple GET with `cache: 'no-cache'` and no manual `If-None-Match`; the browser HTTP cache handles ETag revalidation, and localStorage stores `{bundle}` as the offline tier only.)*
2. **localStorage cache** — used on 304, network error, or timeout. *(cms-v2: used on network error/timeout only.)*
3. **Committed snapshot** — `src/content-snapshot.json` (written by the import script) when no cache exists. `loadContent()` always resolves; the storefront never blanks.

`applyContent` mutates the legacy module state in place: it empties and refills the `products` array (mapping `i18n.ru` to top-level fields, `images[0]`→`img`, `images[1]`→`img2`), fills `productCopy` (uz/en), rebuilds `pageCopy` in the exact legacy shape, and `Object.assign`s `commerce`.

**Load-bearing ordering in `main.jsx`:** `App.jsx` is dynamically imported only after `applyContent()` runs, because App.jsx snapshots product data at module evaluation (`productBase`, `syncProductLanguage`). A static import compiles and renders but silently serves stale/empty content. The file carries a comment saying so — do not "clean up".

## Data model (Prisma, `api/prisma/schema.prisma`)

Ten models: `AdminUser` (argon2 hash), `Category` (slug + nameRu/nameUz/nameEn; nameRu values are the exact legacy Russian strings the storefront's catalog predicates compare against), `Product` (id = legacy slug, price in UZS integer, tag stored lowercase `new|sale|online-exclusive`, `status` draft/published, JSON `sizeValues`/`colorVariants`), `ProductTranslation` (`@@id [productId, lang]`), `ProductSize` (`@@id [productId, size]`, `available`, `lowStockQty`), `MediaAsset` (filename = 12-char sha1 content hash + `.webp`, `sourceUrl` kept for import idempotency), `ProductImage` (ordered join), `InfoPage` (`@@id [slug, lang]`, slugs: about, delivery, returns, payment, contact), `UiString` (key + ru/uz/en), `Setting` (key + JSON value; keys: commerce, contact, socialLinks).

Derived fields: the public `unavailableSizes` / `lowStockSizes` are computed from `ProductSize` rows; `sizes[]` on `AdminProduct` is the write-side source.

## Endpoint surface

- **Auth** (cookie `uma_admin`, httpOnly, SameSite=Lax, JWT HS256, 7 d): `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. No registration endpoint.
- **Admin** (guarded, `Cache-Control: no-store`): products CRUD (`GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/:id`; PATCH replaces `i18n`/`sizes`/`mediaIds` wholesale when present), categories CRUD (`DELETE` → 409 if products exist), media (`GET` paginated, `POST` multipart jpeg/png/webp ≤10 MB magic-byte checked and hash-deduped, `PATCH :id` alt text, `DELETE` → 409 if referenced), pages (`GET`, `PUT /:slug`), ui-strings (`GET`, bulk `PUT`), settings (`GET`, `PUT`).
- **Public**: `GET /api/public/content` → `ContentBundle` with strong ETag (sha1 of body, in-memory cache invalidated on admin writes), 304 on `If-None-Match`, `Cache-Control: public, max-age=60, stale-while-revalidate=3600`, CORS `*`. *(Superseded by cms-v2: the header is now `Cache-Control: no-cache` so storefront reloads pick up edits immediately.)* `GET /media/:filename` and `/media/thumbs/:filename` static with `immutable` caching.

Media pipeline: uploads go through sharp — webp original capped at 1600 px plus a 400 px thumb, both on disk in `api/uploads/`. `MEDIA_BASE_URL` env prefixes image URLs in the bundle.

Tests: e2e/smoke suite in `api/test/app.e2e-spec.ts` (`npm test` in `api/`), 36 green at the final ruling.

## Import and snapshot scripts

`api/scripts/import.ts`, run as `npm run import` (fresh-DB seed) or `npm run snapshot` (`--snapshot-only`, regenerates `umabranduz/src/content-snapshot.json` from the current DB).

Import seeds: the admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env; 10 categories; 21 products read directly from `umabranduz/src/data.js` merged with `api/seed/copy.ts` (a one-time transcription of the App.jsx literals: uz/en product copy, the merged UI-string catalog, 5 info pages in three languages, commerce/contact/social settings). Images are downloaded from the legacy Unsplash URLs (3 retries, 15 s timeout, failures logged and skipped, never fatal) or copied from `umabranduz/public/assets/products/`, all through the sharp pipeline; re-runs are idempotent (dedup by `sourceUrl`/content hash). The script ends by writing the content snapshot.

Seeded ru/uz/en content is byte-identical to the legacy copy — no retranslation.

## Running everything in dev

- **API**: `cd api && npm run start:dev`. Reads `api/.env`: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `MEDIA_BASE_URL`, `PORT`. The contract default port is 3000, but **in this environment the API runs on 3001** (`PORT=3001` in `api/.env`, with `MEDIA_BASE_URL=http://localhost:3001` to match) because 3000 is occupied by another local service.
- **CMS**: `cd cms && npm run dev`. The vite dev proxy forwards `/api` and `/media/*` to `http://localhost:3000` by default; override with the `CMS_API_PROXY` env var (here: `CMS_API_PROXY=http://localhost:3001 npm run dev`). The proxy deliberately matches only `^/media/.+`, not bare `/media`, so the admin's own `/media` route survives hard navigation.
- **Storefront**: `cd umabranduz && npm run dev`. `VITE_API_URL` defaults to `http://localhost:3000` in dev and `https://api.umabrand.uz` in prod builds; override with the env var (here: `VITE_API_URL=http://localhost:3001 npm run dev`).

## Contract amendments (conflict log)

Three §3/§4 amendments came out of iteration-1 QC, all ruled contract faults and fixed by amendment on 15.08.2026:

1. **Tag wire casing** — `AdminProduct.tag` reads display casing (`'Sale'`) but the DB stores lowercase; the original schema wording made every save of a tagged product 400. Amended: the upsert accepts display casing on the wire and the backend normalizes to `new|sale|online-exclusive`.
2. **Pages PUT wire shape** — unspecified; UI sent `{i18n: {...}}`, backend expected flat. Amended: `PUT /api/admin/pages/:slug` body is flat `{ru, uz, en}`, no `i18n` wrapper; the UI unwraps.
3. **Settings screen** — §4 omitted a screen while criterion C10 required editing shipping settings "in the CMS". Amended: `/settings` route with a minimal «Доставка» card (commerce block only; contact/socialLinks not editable in v1).

## Iteration history

- **Iteration 1 — BLOCK.** Six failures: F1 tagged-product saves 400 (tag casing, contract fault), F2 page saves 400 (wire shape unspecified, contract fault), F3 C10 unsatisfiable (no settings screen, contract fault), F4 silent data loss (`sizes: []` emitted for sizeValues-null products, wholesale replace deleted ProductSize rows — UI fault), F5 server fieldErrors not surfaced on 4xx, F6 1024 px overflow. 17/23 criteria passed; blocked on broken saves plus data loss.
- **Iteration 2 — BLOCK (lightweight remedy only).** All six iteration-1 failures verified fixed. One new blocker: any save of a clothing product with legacy `sizeValues: null` materialized `sizeValues: ["XS".."XL"]`, which flipped the storefront PDP from the UMA clothing size chart to the EU chart (`App.jsx` guide derivation keys off `sizeValues` being set) — customer-facing wrong sizing data with no visible signal. Single cause in `cms/src/components/products/form.ts`.
- **Iteration 3 — ALLOW.** One-file fix: the form snapshots the category-derived size preset and keeps sending `sizeValues: null` while the grid is that unchanged preset; materialization happens only on an explicit preset switch or custom edit. Spot re-verify passed (byte-stable no-edit save, correct chart, shoes/custom-list products unaffected, per-size edits still persist). All 23 criteria graded PASS. Run total ≈ $174.5 against a 3-iteration grant (~$117/iteration yardstick); roughly one full iteration of headroom left unspent.

## Known limitations (documented, not bugs)

- Renaming categories or ru product names can empty legacy catalog pages (predicates compare literal Russian strings/regex on names).
- Storefront ignores API `uiStrings` in v1; site-copy edits affect future storefront versions only. *(Resolved in cms-v2: the storefront now merges `bundle.uiStrings` over its bundled literals.)*
- Old localStorage carts keep stale product snapshots (pre-existing behavior).
- `main.jsx` dynamic import of App.jsx is load-bearing; static import silently breaks content loading.
- First-ever visit with API down falls back to the committed snapshot (as fresh as the last `npm run snapshot`).

## Deferred work (court "later" list — next contract, not this run)

- ProductSize rows are not densified: only sizes with explicit state get rows (DB-shape cosmetic; derived output is correct).
- Settings save failure toast wording could name the retry path more precisely (network-failure case).
- Logout clears the session but does not navigate away from the current admin screen.
- Category delete is blocked when products exist (409), but the UI does not show the explanation text.
- «Скопировать с русского» in the product editor overwrites the target language without a confirm.
- `cms/index.html` tab title is still "vite-app".
- Product-list filter selects have no visible labels.
- Uzbek apostrophes are not normalized: some seeded text uses U+2018 (') where U+02BB (ʻ) is correct.
- One Unsplash source image 404s during import: nigora-mini's second photo; the product ships with one image.
- Dev port: contract assumes API on 3000; this environment runs it on 3001 (see "Running everything in dev").
