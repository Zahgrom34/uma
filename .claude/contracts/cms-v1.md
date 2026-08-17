---
feature: cms-v1
status: allowed
budget:
  iterations_allowed: 3
  iterations_used: 2
  usd_at_start: 30.30
created: 15.08.2026
---

# CMS v1 — full content management, admin panel, live API storefront integration

## 1. Scope

A NestJS API (`api/`, SQLite via Prisma) that is the source of truth for all storefront content: products with first-class ru/uz/en translations, categories, sale & per-size stock, media library (local disk, sharp pipeline), 5 info pages, the ~186-key UI-string catalog, and commerce/contact/social settings. Cookie-JWT admin auth with one seeded admin, no registration. An idempotent import script seeds everything from the legacy sources and localizes the Unsplash images. A shadcn admin panel in `cms/` (Russian chrome) manages all of it. The storefront (`umabranduz/`) loads content at runtime from the public API with a three-tier fallback (live API → localStorage cache → committed snapshot) via a bootstrap-then-dynamic-import of App.jsx; legacy code otherwise untouched.

## 2. Out of scope

Building any of these is a contract violation:
- Orders/checkout backend (cart/orders stay in localStorage).
- Size-finder, mega-menu, or catalogConfig editing; redesign of catalog predicates.
- Storefront consumption of API UI strings (LocalizedInterface/legacyPhrases/translations objects stay untouched; the API serves `uiStrings` but the storefront ignores them in v1).
- Rich text/markdown, image cropping, drag-reorder of products.
- Multi-user, roles, password reset, audit log, dashboards, registration.
- uz/en admin chrome (content FIELDS are 3-lang; admin UI text is ru-only).
- Draft/publish workflow beyond the `status` field.
- Deployment automation; phone-width (<1024px) admin layout.
- Any edit to `umabranduz/src/data.js`, `styles.css`, or the i18n hack functions (`LocalizedInterface`, `syncProductLanguage`, `lockSizeFinderToWomen`, `legacyPhrases`).

## 3. Data & API contract

### Shared types (`shared/src/index.ts` — backend-owned; ui-developer copies into `cms/src/lib/api/types.ts` verbatim, imports never modify)

```ts
export type Lang = 'ru' | 'uz' | 'en';
export interface ProductI18nFields { name: string; color: string; material: string; desc: string }

export interface PublicProduct {
  id: string;                          // legacy slug ('uma-sequin-dress')
  categorySlug: string;
  cat: string;                         // Category.nameRu — EXACT legacy Russian strings (predicates compare literally)
  price: number; oldPrice: number | null; sale: boolean;
  tag: 'New' | 'Sale' | 'Online Exclusive' | null;   // legacy display casing
  online: boolean; outOfStock: boolean; stock: number | null;   // null → storefront keeps fake-hash display
  sizeGuide: string | null; sizeValues: string[] | null;
  colorVariants: string[] | null;
  unavailableSizes: string[];          // derived: sizes where available=false
  lowStockSizes: Record<string, number>; // derived: sizes with lowStockQty
  images: string[];                    // absolute URLs, >=1; [0]→img, [1]→img2
  thumbs: string[];                    // same order
  i18n: Record<Lang, ProductI18nFields>; // ru always present
}

export interface PublicCategory { slug: string; nameRu: string; nameUz: string; nameEn: string; sortOrder: number }
export interface PublicPage { slug: string; i18n: Record<Lang, { eyebrow: string; heading: string; body: string }> }

export interface ContentBundle {
  version: string;                     // ISO timestamp of last content write
  products: PublicProduct[];           // published only, sortOrder asc
  categories: PublicCategory[];
  pages: PublicPage[];
  uiStrings: Record<string, Record<Lang, string>>;
  settings: { commerce: { freeShipThreshold: number; flatShipping: number } };
}

export interface AdminProduct extends PublicProduct {
  status: 'draft' | 'published';
  updatedAt: string;                   // ISO
  sizes: { size: string; available: boolean; lowStockQty?: number }[];  // write-side source of the derived fields
  mediaIds: string[];                  // ordered
}

export interface MediaAssetDto {
  id: string; url: string; thumbUrl: string;
  originalName: string; width: number; height: number; sizeBytes: number;
  alt: string | null; usedByProductIds: string[]; createdAt: string;
}

export interface UiStringDto { key: string; ru: string; uz: string; en: string; context?: string }
export interface CommerceSettings { freeShipThreshold: number; flatShipping: number }
```

Zod schemas in `shared/`: `LoginSchema {email, password}`, `ProductUpsertSchema` (all AdminProduct write fields + `i18n` + `sizes[]` + `mediaIds: string[].min(1)`, `oldPrice > price` when sale), `CategoryUpsertSchema`, `PageUpsertSchema {eyebrow, heading, body} × lang`, `UiStringsBulkSchema (UiStringDto[])`, `SettingsSchema`.

Wire-shape pins (iteration-2 amendments per court ruling 15.08.2026):
- `ProductUpsertSchema.tag` accepts display casing `'New' | 'Sale' | 'Online Exclusive' | null` on the wire; backend normalizes to DB values (`'new'|'sale'|'online-exclusive'`). The UI sends display casing (same as `AdminProduct.tag` reads).
- `PUT /api/admin/pages/:slug` wire body is FLAT: `{ru: {eyebrow, heading, body}, uz: {...}, en: {...}}` — no `i18n` wrapper. The UI unwraps before sending.

### Prisma models

AdminUser(id, email unique, passwordHash argon2); Category(id, slug unique, nameRu unique = legacy strings: Платья, Брюки, Блузы, Юбки, Топы, Жакеты, Верхняя одежда, Аксессуары, Сумки, Обувь; nameUz, nameEn, sortOrder); Product(id = legacy slug, categoryId FK, price Int UZS, oldPrice?, sale, tag? 'new'|'sale'|'online-exclusive' (public API maps to display casing), online, outOfStock, stock?, sizeGuide?, sizeValues? JSON, colorVariants? JSON, status default 'published', sortOrder, timestamps); ProductTranslation(@@id [productId, lang], name/color/material/desc); ProductSize(@@id [productId, size], available, lowStockQty?); MediaAsset(id, filename unique = sha1-12 content hash + .webp, originalName, mimeType, width, height, sizeBytes, sourceUrl?, alt?); ProductImage(@@id [productId, mediaId], sortOrder); InfoPage(@@id [slug, lang], slugs EXACTLY: about, delivery, returns, payment, contact; eyebrow/heading/body); UiString(key @id, ru, uz, en, context?); Setting(key @id, value JSON string; keys: commerce, contact, socialLinks).

### Endpoints

Auth (cookie `uma_admin`, httpOnly, SameSite=Lax, Secure in prod, JWT HS256 7d):
- `POST /api/auth/login {email, password}` → 200 `{user:{id,email}}` + Set-Cookie | 401
- `POST /api/auth/logout` → 204, clears cookie
- `GET /api/auth/me` → `{user}` | 401

Admin (guard: 401 without valid cookie; `Cache-Control: no-store`):
- `GET /api/admin/products?search=&category=&status=` → `AdminProduct[]`
- `GET /api/admin/products/:id` → `AdminProduct` | 404
- `POST /api/admin/products` (`ProductUpsert`, client supplies slug id) → 201 | 409 duplicate
- `PATCH /api/admin/products/:id` (partial; `i18n`/`sizes`/`mediaIds` replace wholesale when present) → 200
- `DELETE /api/admin/products/:id` → 204
- `GET /api/admin/categories` → `PublicCategory[]`; `POST` → 201; `PATCH /:slug`; `DELETE /:slug` → 409 if products exist
- `GET /api/admin/media?page=&limit=` → `{items: MediaAssetDto[], total}`
- `POST /api/admin/media` multipart `files[]` (jpeg/png/webp, ≤10MB each, magic-byte checked, dedup by hash) → `MediaAssetDto[]`
- `PATCH /api/admin/media/:id {alt}` → 200; `DELETE /api/admin/media/:id` → 204 | 409 if referenced
- `GET /api/admin/pages` → `PublicPage[]`; `PUT /api/admin/pages/:slug` → 200
- `GET /api/admin/ui-strings` → `UiStringDto[]`; `PUT /api/admin/ui-strings` (bulk array, one-item allowed) → 200
- `GET /api/admin/settings` → `{commerce, contact, socialLinks}`; `PUT /api/admin/settings` → 200

Public:
- `GET /api/public/content` → `ContentBundle`; strong ETag (sha1 of body, in-memory cache invalidated on admin writes), `If-None-Match` → 304, `Cache-Control: public, max-age=60, stale-while-revalidate=3600`, `Access-Control-Allow-Origin: *`
- `GET /media/:filename`, `GET /media/thumbs/:filename` → static, `public, max-age=31536000, immutable`

Validation errors: 400 with `{message, fieldErrors: Record<string, string>}`; admin-facing messages in Russian. CORS: credentialed for `http://localhost:5173`/`5174` + GH Pages origin; `*` on public GET. `MEDIA_BASE_URL` env prefixes image URLs in the bundle. Every endpoint gets a smoke test; suite runs green before backend reports done.

### Import script (`api/scripts/import.ts`, `npm run import`)

Fresh-DB seed: admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env; 10 categories; 21 products from `umabranduz/src/data.js` (imported directly — data.js NOT edited) + `api/seed/copy.ts` (one-time transcription of App.jsx literals: productCopy uz/en, merged ~186 UI keys ×3, pageCopy 5×3, commerce {1500000, 35000}, contact, socialLinks); tag mapping 'New'→'new' etc.; unavailableSizes/lowStockSizes → ProductSize rows. Images: download Unsplash URLs (retry ×3, 15s timeout, failure logged and skipped, never fatal), copy the 2 local products' files from `umabranduz/public/assets/products/`, all through the sharp pipeline; `sourceUrl` kept; idempotent re-run (dedup by sourceUrl/hash). Ends by writing `umabranduz/src/content-snapshot.json` via the same bundle builder (also `npm run snapshot`).

### Storefront integration

- `umabranduz/src/content.js` (new): exports mutable `productCopy`, `pageCopy`, `commerce`; `loadContent()` — fetch `VITE_API_URL + /api/public/content` with stored ETag, 3s timeout; 200 → cache `{etag, bundle}` in `localStorage['uma-content-cache']`; 304/error → cache; no cache → `import('./content-snapshot.json')`; always resolves. `applyContent(bundle)` — in-place: `products.length = 0; products.push(...bundle.products.map(toLegacy))` (toLegacy spreads i18n.ru to top level, images[0]→img, images[1]→img2, keeps images array); fills productCopy from i18n.uz/en; pageCopy in exact legacy shape `{lang: {slug: [eyebrow, heading, body]}}`; Object.assign commerce.
- `umabranduz/src/main.jsx`: `loadContent().then(bundle => { applyContent(bundle); const {default: App} = await import('./App.jsx'); render... })`. App.jsx MUST be dynamically imported after applyContent (module-eval side effects); a static import silently breaks products — do not "clean up".
- `umabranduz/src/App.jsx`: EXACTLY three edits — (1) delete inline `productCopy` literal, import from content.js; (2) delete inline `pageCopy` literal, import from content.js; (3) replace literals 1500000/35000 in shipping logic with `commerce.freeShipThreshold`/`commerce.flatShipping`. Nothing else changes.
- `umabranduz/vite.config.js`: expose `VITE_API_URL` (default prod URL; `http://localhost:3000` dev).

## 4. UI surface

`cms/` deps to add: react-router v7 (declarative), @tanstack/react-query v5, react-hook-form + @hookform/resolvers + zod. Dev proxy in `cms/vite.config.ts`: `/api` and `/media` → `http://localhost:3000` (cookies same-origin). Prod build served at `/admin` (router basename).

Routes: `/login`; `/` → redirect `/products`; `/products`; `/products/new`; `/products/:id`; `/categories`; `/media`; `/pages`; `/pages/:slug`; `/copy`; `/settings`. All but `/login` inside `AppShell` (sidebar icon-collapsible + breadcrumb header + ⌘K command palette); 401 anywhere → `/login?from=<path>`.

Screens (shadcn components by name; full composition per the approved plan):
1. **Login** — centered `card`, `field` ×2, «Войти» with `spinner`; inline error «Неверная почта или пароль»; Enter submits.
2. **Товары** (`/products`) — header + count with ru pluralization + «Добавить товар»; filters (`input-group` search, `select` Категория, `select` Метка, `toggle-group` Наличие); `table`: checkbox | thumb | Название | Категория | Цена (`1 150 000 UZS`, old price struck when sale) | Скидка `switch` (optimistic, rollback+toast on failure) | Наличие `badge` (text variants — no dots) | Метка `badge` | row `dropdown-menu` (Изменить / Скрыть с сайта / Удалить via `alert-dialog`); bulk bottom bar on selection; `pagination` 20/page.
3. **Product editor** — two columns (stack <1280px); `tabs` Русский/Oʻzbekcha/English with error dots + «Скопировать с русского»; photo strip + MediaPickerDialog (min 1 image, warn <2); right cards: Цена (`input-group` UZS suffix, live grouping, Скидка switch reveals Старая цена, zod oldPrice>price), Организация (`select` Категория/Метка, `switch` Только онлайн/Нет в наличии), Размеры (`select` size grid: Одежда XS–XL / Обувь 36–41 / Один размер / Свой список; per-size row → В наличии/Мало(+qty)/Нет), Цвета (hex swatches); sticky footer Сохранить(⌘S)/Отмена; dirty-navigation `alert-dialog`.
4. **Медиатека** — square grid 6-up, dropzone + «Загрузить» (per-file progress + retry), details `sheet` (preview, meta, «Скопировать ссылку», «Удалить» with usage list from `usedByProductIds`, `alert-dialog`); MediaPickerDialog reused.
5. **Страницы** — list of 5 + editor with ru/uz/en `tabs`, `field` + `textarea`, sticky save.
6. **Тексты сайта** (`/copy`) — search over key+values, `select` Раздел (prefix), `checkbox` «Только непереведённые»; `table` Ключ(mono)|Русский|Oʻzbekcha|English, no pagination; inline cell edit (Enter saves optimistic per-cell, Esc cancels, Tab saves+moves); empty cells «— нет перевода».
7. **Категории** — minimal `table` + rename/delete dialogs (delete blocked with explanation if used).
8. **Настройки** (`/settings`, added iteration 2 per court ruling) — sidebar item «Настройки»; single `card` «Доставка»: `field` Порог бесплатной доставки + `field` Стоимость доставки (both `input-group` with UZS suffix and live grouping), «Сохранить» with success toast. Reads/writes `GET|PUT /api/admin/settings` commerce block only (contact/socialLinks not editable in v1).

States: every list has column-shaped `skeleton` loading, designed `empty` («Ничего не нашлось…» + reset), destructive `alert` + «Повторить» on error — never a blank body or raw error. Toasts: successes two words («Сохранено»); errors name the retry path. `DataState` wrapper standardizes this.

## 5. i18n

Admin chrome ru-only in v1: all strings in `cms/src/lib/i18n/ru.ts` (typed `as const`, namespaced `t.nav.products` etc.); zero hardcoded Cyrillic in components. Content fields always ru/uz/en (from API). Seeded content values are byte-identical to legacy App.jsx/data.js copy — no retranslation, no new user-facing storefront strings in this feature. Formatting via `cms/src/lib/format.ts`: `money()` NBSP-grouped ru-RU + ` UZS`, dates dd.mm.yyyy, ru plural helper.

## 6. File ownership

**backend-developer**: `api/**`, `shared/**`, `umabranduz/src/content.js`, `umabranduz/src/content-snapshot.json`, `umabranduz/src/main.jsx`, `umabranduz/src/App.jsx` (the 3 edits only), `umabranduz/vite.config.js`, `umabranduz/package.json`.
**ui-developer**: `cms/**` only (incl. `cms/package.json`, `cms/vite.config.ts`). Reads `shared/` types; copies them to `cms/src/lib/api/types.ts` verbatim; may not modify `shared/` — a needed type change is a contract conflict: STOP and report.
No other files change. No two agents share a file.

## 7. Acceptance criteria

Backend/integration:
1. `POST /api/auth/login` with seeded env credentials sets httpOnly cookie; `/api/auth/me` returns user; any `/api/admin/*` without cookie → 401; no registration endpoint exists.
2. Product CRUD round-trips every §3 field incl. per-size availability/lowStockQty and all 3 languages; invalid bodies → 400 with Russian field-level messages.
3. Media upload (JPEG) produces webp original ≤1600px + 400px thumb on disk, fetchable under `/media/*` with immutable headers; deleting referenced media → 409.
4. Fresh `npm run import` seeds 21 products, 10 categories, 5 info pages, all UI-string keys, settings, admin user; ≥38/42 product images localized as MediaAssets; re-run idempotent (no duplicates).
5. `GET /api/public/content` matches `ContentBundle`, absolute image URLs, ETag with working 304, max-age=60; only published products.
6. Editing a product name in the CMS shows on the storefront ≤60s later in all three languages via the language switcher.
7. Storefront with API unreachable renders fully from cache/snapshot: no blank page, no uncaught fetch error, grid populated.
8. Legacy behaviors intact: sale/new/online-exclusive catalog predicates, per-size unavailable/low-stock badges, colour variants, cart add + language-switch renaming, jewellery/scarves regex catalogs non-empty, all 18 catalog slugs render.
9. Info-page edit appears on `/info/<slug>` in all 3 languages.
10. Changing freeShipThreshold/flatShipping in the CMS changes storefront checkout totals.

Admin UI (browser-verified):
11. Unauthed `/products` → `/login`; valid login returns to origin; wrong password → inline «Неверная почта или пароль», no reload.
12. `/products` lists 21 products; price cells exactly `1 150 000 UZS` style; sale rows show struck old price.
13. Sale toggle updates instantly; with API stopped it visibly reverts + explanatory toast.
14. Category filter + search narrow correctly; no-match shows designed empty state with working «Сбросить фильтры».
15. Bulk «Включить скидку» on 3 selected rows updates all 3.
16. Submitting with empty English name switches to English tab, focuses field, shows inline error + tab error dot.
17. Dirty navigation raises «Изменения не сохранены»; ⌘S saves + «Сохранено» toast.
18. «Добавить фото» → media picker; JPEG upload shows per-file progress; image lands in the product's strip; saves.
19. `/copy`: search «корзина» filters by ru value; uz cell edit + Enter persists across reload; Esc discards; «Только непереведённые» hides fully-translated rows.
20. Shoes product shows 36–41 size grid (not XS–XL); «Мало, 2 шт» on size 42 survives reload.
21. Every list screen: skeletons while loading; API-down shows alert + working «Повторить»; never a blank body.

Cross-cutting:
22. **Anti-slop**: no emoji-as-icons, no gradient-SaaS chrome, no placeholder copy; NO glowing/pulsing status dots or dot-prefixed pill badges anywhere (user rule 15.08.2026) — status/stock are text `Badge` variants or typographic labels; no `animate-pulse`/`animate-ping` as decoration (skeletons' built-in shimmer is fine); grep finds no hardcoded Cyrillic outside `lib/i18n/ru.ts` and seed data; seeded ru/uz content byte-identical to legacy copy.
23. **CIS comprehension**: admin chrome is native Russian a Tashkent shop manager understands without a tutorial (Медиатека, Нет в наличии; no calques: Продукты, Ассеты, Контент); dates dd.mm.yyyy; UZS formatting per §5; bug-hunter audits every visible string.

## 8. Conflict log

- 15.08.2026 — playwright-qa/bug-hunter/planner-assessor (QC stage) — **Tag write-casing contradiction in §3**: `AdminProduct.tag` is display-cased (`'Sale'`) but the Prisma paragraph specifies lowercase DB values; `ProductUpsertSchema` says "all AdminProduct write fields". Backend implemented lowercase enum, UI sent display casing → every save of a tagged product 400s (fails C2 write-path, C6, C17, C18-save). Resolution (court ruling 15.08.2026): §3 amended — upsert accepts display casing, backend normalizes to DB values.
- 15.08.2026 — playwright-qa/bug-hunter (QC stage) — **Pages PUT wire shape unspecified in §3**: UI sent `{i18n:{ru,uz,en}}` (matching `PublicPage`), backend's `PageUpsertSchema` expects flat `{ru,uz,en}` → every page save 400s (fails C9). Resolution (court ruling 15.08.2026): §3 amended — flat `{ru, uz, en}` pinned as the wire shape; UI unwraps.
- 15.08.2026 — playwright-qa/bug-hunter (QC stage) — **§4 omits a settings screen** while C10 requires changing shipping settings "in the CMS" → criterion unsatisfiable by an admin (fails C10). Resolution (court ruling 15.08.2026): §4 amended — `/settings` route with minimal Доставка card added.

## 9. Verdict

### Iteration 1 — supreme-court, 15.08.2026: **BLOCK**

**Grounds:**
1. **Core save flow broken (F1).** Every save of a tagged product returns 400 — tag write-casing contradiction inside §3 (conflict log 1). Fails C2 write-path, C6, C17, C18-save (planner-assessor; playwright-qa blocker 1; bug-hunter blocker 1). Contract fault, not agent negligence — but the editor cannot save the majority of real catalog items, which is unshippable regardless of fault.
2. **Pages unsaveable (F2).** PUT wire shape unspecified — every page save 400s, fails C9 (both QC blockers 2; conflict log 2). Contract ambiguity.
3. **C10 unsatisfiable (F3).** §4 omitted a settings screen while C10 requires changing shipping settings "in the CMS". Pure contract fault (conflict log 3; both QC blockers 3).
4. **Silent data loss (F4).** sizeValues-null products: editor derives «Один размер», save emits `sizes: []`, wholesale replace deletes ProductSize rows — reproduced by bug-hunter on `malika`. Data loss is per-se blocker severity. UI implementation fault (form derivation).
5. Counterweight noted but insufficient for ALLOW: 17/23 criteria PASS, api tests 34/34 green re-verified, C8 legacy-regression sweep FULL PASS, C22/C23 clean, file ownership and out-of-scope compliant both sides. Close — but broken saves plus reproducible data loss is not shippable.

**Budget state:** iterations used 1/3. USD this iteration ≈ $116.81 (5h block $147.11 − usd_at_start $30.30). ccusage at ruling: 5h block $147.11, day $153.72, week ≈ $876. A full iteration 2 (~$117 at iteration-1 cost) fits within the 2 remaining granted iterations; the prescribed targeted fix pass is ≈⅓ of a full iteration — comfortably inside budget.

**Remedy — targeted re-run as iteration 2:** (1) orchestrator amends contract per conflict-log resolutions (done — §3 tag casing + pages wire shape, §4 `/settings`); (2) backend-developer: tag normalization in upsert, accept pinned pages shape, smoke tests for both, suite green; (3) ui-developer: F4 size-preset derivation from `sizes[]` (never silently emit `sizes: []`), `/settings` screen, pages payload alignment, F5 surface server fieldErrors on 4xx toasts, F6 1024px overflow; (4) focused QC re-verify of C2/C6/C9/C10/C17/C18/C20 + save-path regression only (C8/C22/C23 evidence stands); planner-assessor re-grades the six; back to court. The "later" list (logout navigation, category-delete explanation, copy-from-Russian confirm, tab title, filter labels, uz apostrophes, port note) is excluded from this remedy — document, do not fix in this run.

---

### Iteration 2 — supreme-court, 15.08.2026: **BLOCK** (lightweight remedy only — no full re-run)

**Grounds:**
1. **Iteration-1 remedy executed in full and verified.** All six iteration-1 failures (F1 tag casing, F2 pages wire shape, F3 settings screen/C10, F4 sizes:[] data loss, F5 4xx toast messages, F6 1024px overflow) confirmed fixed with evidence: playwright-qa PASS 0 blockers with screenshots per criterion (C2/C17 tagged save persists; C18 upload-save; C20 malika 36–41 + low-stock persists, no `sizes: []` emitted anywhere; C9 pages → storefront 3 langs; C10 settings → checkout 50 000 with contact/socialLinks preserved; C6 ≤7s propagation); bug-hunter confirmed all six FIXED incl. sqlite-level tag round-trips (4 states), 5-page multiline round-trips, no phantom writes on preset-switch/cancel; api suite 36/36 green re-verified independently by planner-assessor; all six re-graded criteria PASS with file:line evidence. This work stands and is NOT re-run.
2. **One remaining blocker bars ALLOW (bug-hunter new finding, independently reproduced and graded blocker-severity against C8 by planner-assessor).** Any save — including a no-edit save — of a clothing product with legacy `sizeValues: null` materializes `sizeValues: ["XS".."XL"]` while `sizeGuide` stays null; storefront PDP (`umabranduz/src/App.jsx:12`, `guide: p.sizeValues ? p.sizeGuide||'eu' : ...'clothing'`) then silently swaps the UMA XS–XL chest/waist size chart for the EU 32–46 waist/hips chart. Customer-facing wrong sizing information on a fashion store, triggered by normal admin use, with no visible signal — blocker-severity data corruption under C8 (legacy behaviors intact). Decision rule 3 requires "no blocker remains" for ALLOW; one remains.
3. **Severity is real but the defect is narrow and fully diagnosed:** single cause in `cms/src/components/products/form.ts` (category-derived size preset is sent as an explicit `sizeValues` list instead of preserving `null` when unchanged). A full development re-run would be disproportionate; evidence for everything else stands.

**Budget state:** iterations used 2/3 (this ruling closes iteration 2). Iteration-2 cost ≈ $40.3 (day $194.00 at ruling − $153.72 at iteration-1 ruling); run total since `usd_at_start` ≈ $163.7 of a 3-iteration grant (iteration-1 full cost ≈ $116.81 sets the full-iteration yardstick). ccusage at ruling: active 5h block (18:00) $22.70 with high burn rate; day $194.00; week (10.08) ≈ $916. One full iteration (~$117) still fits the grant; the prescribed remedy is far smaller (est. well under half an iteration, ~$20–40 by iteration-2 analogy).

**Remedy — targeted fix as iteration 3 (lightweight; a full re-run is explicitly NOT authorized):**
1. **ui-developer only:** one localized change in `cms/src/components/products/form.ts` — track the "derived" origin of the size grid; when the grid is the unchanged category-derived preset, keep sending `sizeValues: null` (never materialize the preset into an explicit list). No other files; backend untouched.
2. **Spot re-verify (single QC agent, playwright-qa or bug-hunter — not both):** (a) no-edit save of a legacy `sizeValues: null` clothing product → public bundle byte-stable and PDP shows the UMA clothing chart; (b) malika and one custom-list product unaffected; (c) per-size availability edits still persist (C20 regression guard).
3. **planner-assessor:** paper re-grade of C8 (and C20 spot) on the QC evidence only.
4. Back to court for a paper ruling. All other iteration-2 evidence (C2/C6/C9/C10/C17/C18, C22/C23, api 36/36) stands and is not re-tested.
5. Filed as "later", excluded from this remedy (document, do not fix): ProductSize row densification (DB-shape only), settings toast wording, dev-port note, the iteration-1 "later" list.

---

### Iteration 3 — supreme-court, 15.08.2026: **ALLOW**

**Grounds:**
1. **The iteration-2 remedy was executed to the letter and the sole remaining blocker is fixed with evidence.** ui-developer changed exactly one file (`cms/src/components/products/form.ts` — `derivedSizes` snapshot; `sizeValues: null` preserved on the wire when the grid is the unchanged category-derived preset; materialization only on explicit preset switch or custom edit), typecheck+build green, scope compliance verified by planner-assessor. This matches remedy step 1 precisely — no other files, backend untouched.
2. **Spot re-verify (playwright-qa, single QC agent per remedy step 2): PASS, 0 blockers, all 5 checks VERIFIED with screenshots.** No-edit save of a legacy `sizeValues: null` clothing product is byte-stable with `sizeValues: null` on the wire, and the storefront PDP shows the UMA clothing chart, not the EU chart — the C8 blocker of iteration 2 (customer-facing wrong size chart) is gone. malika (shoes) unaffected; guipure custom list + `sizeGuide: 'eu'` preserved; F4 regression guard passes (per-size «Нет» persists with sizeValues still null, restore byte-identical). Zero console errors, no DB residue.
3. **planner-assessor paper re-grade (remedy step 3): C8 PASS, C20 PASS → all 23 contract criteria now graded PASS, zero blockers remain.** All other iteration-2 evidence (C2/C6/C9/C10/C17/C18, C22/C23, api suite 36/36) stands per the remedy and was not re-tested — a paper review was the prescribed and correct procedure.
4. Decision rule 3 is satisfied: acceptance criteria substantially (here: fully) pass and no blocker remains. The outstanding "later" list is cosmetic/deferred work, explicitly excluded from this run's remedies, and is not grounds to withhold ALLOW.

**Budget state:** iterations used 2/3 plus this prescribed lightweight completion of iteration 2's remedy (not a full iteration 3 — one full iteration of headroom remains unspent). Remedy cost ≈ $10.8 (day $204.82 at ruling − $194.00 at iteration-2 ruling), well under the ~$20–40 estimate. Run total since `usd_at_start` ($30.30) ≈ $174.5, inside the 3-iteration grant (full-iteration yardstick ≈ $117). ccusage at ruling: active 5h block (18:00) $33.50; day $204.82; week (10.08) ≈ $926.74.

**Remedy — ship; close out via documentor:**
1. Orchestrator invokes `documentor`: feature record in `docs/features/` for cms-v1 (scope, architecture, the three contract amendments from the conflict log, the iteration history F1–F6 + sizeValues fix), changelog entry, contract closed out to status `allowed` with final budget numbers.
2. Record the "later" list as known limitations / deferred work — NOT bugs to fix in this run: ProductSize row densification (DB-shape only), settings toast wording, logout navigation, category-delete explanation text, copy-from-Russian confirm, vite-app tab title, filter select labels, uz apostrophe normalization, dev-port note.
3. Keep the existing "Known limitations" section below in the shipped documentation verbatim (legacy predicate fragility, uiStrings ignored in v1, stale localStorage carts, load-bearing dynamic import, snapshot freshness).
4. No conditions attached — no further code changes are authorized under this contract's budget.

---

### Known limitations (documented, not bugs)

- Renaming categories or ru product names can empty legacy catalog pages (predicates compare literal Russian strings/regex on names).
- Storefront ignores API `uiStrings` in v1; site-copy edits affect future storefront versions only.
- Old localStorage carts keep stale product snapshots (pre-existing behavior).
- `main.jsx` dynamic import of App.jsx is load-bearing; static import silently breaks content loading.
- First-ever visit with API down falls back to the committed snapshot (as fresh as the last `npm run snapshot`).
