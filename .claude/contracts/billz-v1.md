---
feature: billz-v1 — Billz POS stock + price sync
status: allowed
budget:
  iterations_allowed: 1.5       # 1 full dev→QC→court loop + 0.5 fix-only pass
  iterations_used: 1.5
  usd_at_start: 29.98
created: 03.09.2026
---

## 1. Scope

Manual stock + price synchronization from BILLZ 1 (api.billz.uz, JSON-RPC 2.0) into the UMA content API, plus a new «Интеграции» section on the CMS Settings page holding the Billz credentials (SECRET_KEY, username, issuer, office filter), a «Проверить подключение» test action, a «Синхронизировать» trigger with a last-run report, and a per-product «Артикул Billz» field in the product editor used as the match key. The Billz secret and sync report are stored as Setting rows and must never appear in the public content bundle. Reference API docs: `docs/reference/billz-v1-auth.md`, `docs/reference/billz-v1-methods.md` (trust these over memory).

## 2. Out of scope

- Cron / automatic scheduled sync (manual trigger only).
- Order push to Billz (`orders.create`), client sync, reports.
- Catalog import / product auto-creation from Billz; touching translations, media, categories, `tag`, `online`, `status`, `sortOrder`.
- Pagination / `LastUpdatedDate` incremental sync (single full `products.get` fetch).
- Storefront (`umabranduz/`) changes of any kind.
- Deleting the stored secret from the UI (replace only).
- Env-var-based credentials.

## 3. Data & API contract

### shared/src/index.ts (backend-owned; verbatim copy to cms/src/lib/api/types.ts)

```ts
export const BillzSettingsSchema = z.object({
  secretKey: z.string().max(500, 'Слишком длинный ключ'),          // '' on PUT = keep stored value
  username:  z.string().trim().max(200, 'Слишком длинное имя пользователя'),
  issuer:    z.string().trim().max(200, 'Слишком длинный адрес сайта'),
  officeIds: z.array(z.number().int('ID магазина — целое число').positive('ID магазина — положительное число')).max(50),
});
// SettingsSchema gains: billz: BillzSettingsSchema.optional()
// product upsert/patch schemas gain: billzSku: z.string().trim().max(200).nullable().optional()

export interface BillzSettings { secretKey: string; secretKeySet: boolean; username: string; issuer: string; officeIds: number[] }
export interface BillzSyncReport { startedAt: string; durationMs: number; totalRows: number; matchedProducts: number; updatedProducts: number; unmatchedSkus: string[]; warnings: string[]; error: string | null }
export interface BillzTestResult { ok: true; rows: number }
```

`ContentBundle` is UNCHANGED. `AdminProduct` gains `billzSku: string | null`; `PublicProduct` does NOT.

### Storage

- Prisma `Product` gains `billzSku String?` (nullable, no unique index) + migration.
- Setting rows: `billz` (credentials JSON, real secret at rest) and `billzSync` (last `BillzSyncReport` JSON). Neither may be added to the public allowlist in `content.service.ts buildBundle()`.

### Endpoints (all `@Controller('api/admin/billz')`, class-level `@UseGuards(AdminGuard)`)

- `POST /api/admin/billz/test` → 200 `BillzTestResult`; 400 «Укажите данные Billz в настройках» when creds incomplete; 400 «Неверные данные Billz» on RPC auth failure; 502 «Billz недоступен, попробуйте позже» on network/timeout.
- `POST /api/admin/billz/sync` → runs inline, 200 `BillzSyncReport`; same 400/502 semantics; 409 «Синхронизация уже выполняется» (in-memory flag).
- `GET /api/admin/billz/status` → 200 `BillzSyncReport | null`.

### Settings endpoint behavior (settings.controller.ts)

- GET: `billz` always returned with `secretKey: ''` and `secretKeySet` reflecting whether a non-empty secret is stored; DEFAULTS `{secretKey:'', username:'', issuer:'', officeIds:[]}`.
- PUT: incoming `billz.secretKey === ''` → keep stored secret; non-empty → replace. `secretKeySet` from the client is ignored/stripped. Other billz fields saved as sent.

### Outbound Billz call (api/src/billz/billz.client.ts)

`BillzClient.call(method, params, creds)`: HS256 JWT via `@nestjs/jwt` `JwtService.sign({ iss: creds.issuer, sub: creds.username.toLowerCase() }, { secret: creds.secretKey, algorithm: 'HS256', expiresIn: '5m' })`; POST JSON-RPC 2.0 `{jsonrpc:'2.0', method, params, id}` to `https://api.billz.uz/v1/` with `Authorization: Bearer <token>`, global fetch + AbortController 30s. Typed errors: auth vs network vs RPC. Injectable so e2e overrides the provider.

### Sync semantics (BillzService.sync)

1. `products.get` with `IncludeEmptyStocks: 1`, plus `offices: officeIds` when non-empty.
2. Group rows by normalized sku (trim, lowercase compare). Match against `Product.billzSku` (same normalization). Duplicate billzSku across UMA products → all update, warning added.
3. Per row: size = `properties.SIZE` trimmed+uppercased; duplicate sku+SIZE rows sum qty; rows without SIZE add qty to product total only.
4. Office filter set → qty summed over configured offices from `row.offices`, price/discount from the first configured office present (warning when configured offices disagree on price); empty filter → top-level row fields.
5. Pricing per product (from the grouped rows' shared price; disagreement between size rows → first row wins + warning): `discountAmount > 0` → `sale=true, oldPrice=Math.round(price), price=Math.round(price−discountAmount)`; if rounded `oldPrice <= price` → treat as no discount; `discountAmount <= 0` → `sale=false, oldPrice=null, price=Math.round(price)`. Sale coherence is thus guaranteed; `tag` never modified.
6. Stock: matched UMA size → `available = qty>0`, `lowStockQty = qty` when `0<qty<=3` else `null` (threshold constant `LOW_STOCK_THRESHOLD = 3`). UMA sizes with no Billz row: untouched + warning. Billz sizes absent in UMA: ignored + warning. `product.stock = totalQty`; `product.outOfStock = totalQty === 0`.
7. Writes: one `prisma.$transaction` of targeted `product.update` + per-size `productSize.update` ops (NEVER replace-all `sizes`), then ONE `content.invalidate()` after commit. Per-product failures → report `warnings`/`error`, not thrown.
8. Report persisted to Setting `billzSync`, returned as response. `unmatchedSkus` = UMA billzSku values with no Billz rows, capped at 50.

## 4. UI surface

Route `/settings` only (no new route). After the existing cards, a section heading «Интеграции» and one `BillzCard` (`cms/src/components/settings/billz-card.tsx`), following the `social-links-card.tsx` pattern (Card > CardHeader(CardTitle «Billz» + CardDescription) > CardContent > CardFooter):

- Fields: секретный ключ (`Input type="password"`, placeholder «•••••• (сохранён)» when `secretKeySet`, empty input on save = keep), имя пользователя, адрес сайта (issuer), магазины (single `Input`, comma-separated IDs parsed to `number[]` on save; non-numeric → inline field error, no PUT).
- Save via existing `useSaveSettings()` read-modify-write; dirty-compare disable; `t.common.saving` label swap; success/error toasts via `toast.add` + `saveErrorDescription` pattern.
- Actions row: «Проверить подключение» (secondary/outline Button, Spinner-in-button while pending, success toast with row count / error toast) and «Синхронизировать» (default Button, Spinner while pending; disabled while either action runs).
- Last-run summary under the actions (from `useBillzStatus()`): дата (dd.mm.yyyy HH:mm), длительность, товаров совпало/обновлено, список ненайденных артикулов, предупреждения; «Синхронизация ещё не запускалась» empty state; `DataState` for loading/error.
- Product editor: text `Input` «Артикул Billz» with muted hint («Артикул товара в Billz для синхронизации остатков и цен» or tighter), wired through `form.ts` mapping; persists via existing product save.
- Products list unchanged.
- Responsive: card behaves like existing settings cards at ≤768px (max-w-2xl stack).

shadcn components: Card, Input, Label, Button, Spinner, existing toast, DataState, Field error styling as used in social-links-card.

## 5. i18n

CMS chrome is ru-only (`cms/src/lib/i18n/ru.ts`, no cyrillic in JSX). New `t.billz.*` namespace: section «Интеграции», card title «Billz», description (quiet, factual — e.g. «Синхронизация остатков и цен с кассой Billz»), field labels «Секретный ключ», «Имя пользователя», «Адрес сайта (issuer)», «Магазины (ID через запятую)», secret placeholder «сохранён», buttons «Проверить подключение», «Синхронизировать», status labels «Последняя синхронизация», «Товаров совпало», «Обновлено», «Не найдены в Billz», «Предупреждения», empty «Синхронизация ещё не запускалась», toasts («Подключение работает», «Синхронизация завершена», error titles reuse `t.toasts.*` where possible). Plus `t.products.billzSku` = «Артикул Billz» + `t.products.billzSkuHint`. API error messages (Russian) are defined in §3 and come from the server. ui-developer runs `antislop` over the new copy.

## 6. File ownership

**backend-developer**: `shared/src/index.ts`; `api/**` (schema.prisma + migration, `src/billz/*` new, `src/settings/settings.controller.ts`, `src/products/*` billzSku passthrough + AdminProduct mapping, `src/app.module.ts`, `test/app.e2e-spec.ts`); `cms/src/lib/api/types.ts` (verbatim type copy).

**ui-developer**: `cms/**` EXCEPT `cms/src/lib/api/types.ts`. Specifically: `src/lib/api/billz.ts` (new), `src/lib/api/keys.ts`, `src/lib/api/settings.ts`, `src/components/settings/billz-card.tsx` (new), `src/pages/settings.tsx`, `src/components/products/form.ts`, product editor page, `src/lib/i18n/ru.ts`.

No other files. An agent needing a file it doesn't own STOPS and reports.

## 7. Acceptance criteria

1. /settings shows «Интеграции» → Billz card; filling credentials and saving shows a success toast; after a full page reload the secret input is empty with the «сохранён» placeholder and the other fields persist.
2. Saving a DIFFERENT settings card (e.g. соцсети) does not wipe the stored secret — «Проверить подключение» still succeeds afterwards.
3. «Проверить подключение»: with bad credentials → Russian error toast; with valid credentials → success toast.
4. Product editor has «Артикул Billz»; a value entered there survives save + reload.
5. «Синхронизировать» on a product mapped to a real Billz sku updates its price/sale/oldPrice and per-size availability, visible in the products list and editor; the card shows the last-run summary (date, counts, unmatched skus, warnings) and it persists across reload (status endpoint).
6. `GET /api/public/content` contains no `billz` key, no `billzSync`, and no `billzSku` on any product (curl/network-tab evidence).
7. `cd api && npm test` green, including the new Billz specs (stubbed BillzClient; §3 semantics: secret sentinel round-trip, 400-no-creds, 502-network, happy-path counts + pricing + sizes, officeIds Zod rejection, public-bundle leak check).
8. Anti-slop / CIS comprehension: all new chrome via `t.*`, copy reads natively in Russian (bug-hunter audits), no emoji, no status-dot/pulse decoration, error messages actionable Russian.
9. Legacy intact: existing settings cards, product editor save, products list, and storefront behavior unchanged.

## 8. Conflict log

(empty)

## 9. Verdict

**ALLOW** (supreme-court, 03.09.2026). Criteria 1–2, 3(bad-creds), 4, 5(UI), 6–9 verified (criterion 6 and 7 double-verified independently); criteria 3(valid-creds) and 5(real-data) PENDING-EXTERNAL on the user's BILLZ SECRET_KEY — judged non-blocking since the client is built strictly to the vendored reference docs and no agent can produce that evidence. No blocker findings.

Remedy funded from the remaining 0.5 fix-only pass:
1. ui-developer: card hint that credentials come from the BILLZ company; de-jargon «(issuer)» (ru.ts + billz-card.tsx copy, antislop).
2. backend-developer: sync warnings name products by ru name (fallback slug) in `src/billz/*`, tests stay green.
3. When SECRET_KEY arrives: live smoke of criteria 3/5; live-API deviation from docs = new finding for the user, not silent scope.

Later-list (unfunded): toast stack briefly covers last card's save button; all-empty billz save looks half-configured; pre-existing social-card mobile input squeeze.

Budget: iterations used 1 → 1.5 after fix pass; usd_at_start 29.98, at verdict 68.87 (≈38.89 spent, 5h block); weekly 725.69. Second full iteration explicitly not prescribed.
