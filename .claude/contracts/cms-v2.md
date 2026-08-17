---
feature: cms-v2 — full storefront pairing (ui-strings, footer, homepage hero, freshness fix)
status: allowed
budget:
  iterations_allowed: 2
  iterations_used: 1
  usd_at_start: 7.39
created: 16.08.2026
---

## 1. Scope

Close the pairing gap between CMS and storefront found after cms-v1: (A) fix content
staleness — the public bundle is currently served with `stale-while-revalidate=3600`, so
edits lag up to an hour behind reloads; (B) make the storefront consume `bundle.uiStrings`
(all 199 keys already match the storefront `translations` keys by name), which makes the
footer labels and hero overlay text editable via the existing «Тексты сайта» screen;
(C) make the homepage hero media manageable (1 uploaded mp4 video XOR 1–3 images) plus a
CMS screen «Главная страница» that edits hero media and the three overlay strings; make
footer/contact social links editable via a «Соцсети» card in Настройки; (D) regenerate the
snapshot and extend the api e2e suite. Approved plan: `/home/zahcoder34/.claude/plans/merry-squishing-bengio.md`.

## 2. Out of scope

Orders/checkout backend, video transcoding/poster frames, image cropping, contact-page
phone/email/hours editing (only its social-links block goes live), catalogConfig/mega-menu/
size-finder editing, new info pages (footer «Новости» → `/info/news` fallback stays as-is —
goes to the «later» list), deployment automation, uz/en admin chrome, drag-and-drop
reordering (up/down buttons suffice).

## 3. Data & API contract

**Shared (`shared/src/index.ts`, backend-owned; `cms/src/lib/api/types.ts` copied verbatim):**

```ts
export type MediaKind = 'image' | 'video';

// MediaAssetDto CHANGES (breaking for cms copy — update verbatim):
export interface MediaAssetDto {
  id: string; url: string; thumbUrl: string | null;      // null for video (no thumb)
  kind: MediaKind;
  originalName: string;
  width: number | null; height: number | null;           // null for video
  sizeBytes: number;
  alt: string | null; usedByProductIds: string[];
  usedByHero: boolean;                                   // referenced by settings.hero
  createdAt: string;
}

export interface HeroSlideInput { mediaId: string }
export const HeroSettingsSchema = z.object({
  slides: z.array(z.object({ mediaId: req('Медиафайл') })).min(1).max(3),
});
// Service-level validation (not pure zod): resolved assets must be
// exactly 1 video XOR 1–3 images; anything else → 400
// «Баннер — это одно видео или до трёх фотографий». Unknown mediaId → 400
// «Медиафайл не найден».

// SettingsSchema gains: hero: HeroSettingsSchema.optional()
// SocialLinkSchema unchanged: { label: req('Название'), href: url }.

// ContentBundle.settings CHANGES:
settings: {
  commerce: { freeShipThreshold: number; flatShipping: number };
  hero: { type: MediaKind; src: string }[];   // resolved absolute URLs; [] when unset
  socialLinks: { label: string; href: string }[];
}
```

**Endpoints (no new routes):**
- `GET /api/public/content`: `Cache-Control: no-cache` (strong ETag + 304 kept). Bundle
  settings extended as above; `version` still bumps on any content write (hero/socialLinks
  edits included).
- `POST /api/admin/media` (multipart, unchanged route): now also accepts `video/mp4`.
  Magic-byte check (`ftyp` box at offset 4). Limits: images ≤10 MB (unchanged, unchanged
  errors), video ≤50 MB → 400 «Видео больше 50 МБ». Multer raw limit 52 MB. Video stored
  verbatim (original bytes, content-hash name `<sha1-12>.mp4`), no sharp, no thumb;
  response is the MediaAssetDto with `kind:'video'`, `thumbUrl/width/height` null.
- `DELETE /api/admin/media/:id`: 409 when referenced by products (existing) OR by
  `settings.hero` → message «Файл используется в баннере главной страницы».
- `PUT /api/admin/settings`: read-modify-write semantics unchanged; accepts partial
  `{hero}` / `{socialLinks}`; unknown stored keys preserved.
- Hero overlay strings are ordinary ui-strings (`heroSeason`, `heroCollection`,
  `heroShop`) via existing `PUT /api/admin/ui-strings` bulk endpoint — no new API.

**Prisma:** `MediaAsset` gains `kind String @default("image")` (migration backfills
existing rows to `image`); width/height become nullable if currently required.

**Storefront wiring (backend-owned files):**
- `content.js`: `loadContent()` fetch gets `cache: 'no-cache'`. New mutable exports filled
  by `applyContent`: `uiStrings = {}` (raw `bundle.uiStrings`), `heroMedia = []`
  (`bundle.settings.hero` mapped to legacy `{type, src}`), `socialLinksData = []`
  (`bundle.settings.socialLinks`).
- `App.jsx` — exactly these edits, nothing else:
  1. Extend the content.js import with `uiStrings, heroMedia, socialLinksData`.
  2. After the last `Object.assign(translations…)` (~line 69): merge — for each key/lang,
     `if (uiStrings[key]?.[lang]) translations[lang][key] = uiStrings[key][lang]`.
     Bundled literals remain the API-down fallback.
  3. `homeHeroMedia` (line 114): use `heroMedia` when non-empty, else the committed
     `${BASE_URL}assets/hero/uma-hero.mp4` default. Render logic (video XOR ≤3 images)
     untouched.
  4. `socialLinks` (line 22): when `socialLinksData` is non-empty, build the list from it —
     icon looked up by exact `label` from the existing five Tb icon components
     (Instagram, Telegram, Facebook, YouTube, Pinterest); labels without an icon are
     skipped. Empty data → hardcoded list unchanged. Footer and ContactPage keep consuming
     `socialLinks` as today.
- `LocalizedInterface` / `legacyPhrases` / `data.js` / catalog predicates: untouched.

## 4. UI surface (cms/, ui-developer)

- **Sidebar**: new first item «Главная страница» → route `/home-page` (icon consistent
  with existing set).
- **/home-page**: two Cards.
  - «Баннер»: ToggleGroup «Видео» / «Фотографии». Video mode: one slot; Photo mode: up to
    3 ordered slots (up/down + remove). Slot opens the existing media-picker dialog
    pattern, filtered by `kind` (upload allowed inside, mp4 accepted in video mode).
    Preview: `<video muted controls>` for video (src = asset url), thumbs for images.
    Empty state text: hero unset → storefront shows the built-in default video.
    Helper text: «MP4 (H.264), до 50 МБ». Save → `PUT /api/admin/settings` `{hero}`;
    clearing all slots saves `{hero: null}`? — NO: send `{hero: {slides: []}}` is invalid
    (min 1); clearing = save `{hero: null}` explicitly allowed: `SettingsSchema.hero` is
    `.nullable().optional()`, `null` deletes the stored hero (storefront default returns).
  - «Текст на баннере»: three labeled fields — «Сезон» (heroSeason), «Заголовок»
    (heroCollection), «Кнопка» (heroShop) — with the ru/uz/en tab pattern from the product
    editor. Save via ui-strings bulk PUT (3 keys × 3 langs). Dirty guard + ⌘S consistent
    with existing screens.
- **/settings**: new Card «Соцсети» — rows: Select «Платформа» (exactly: Instagram,
  Telegram, Facebook, YouTube, Pinterest), Input «Ссылка» (URL), remove button; «Добавить
  ссылку»; up/down reorder. Save merges into settings (read-modify-write preserving
  commerce/contact/hero). Zod URL error shown inline in Russian.
- **/media**: filter «Все / Фотографии / Видео» (Select or Tabs, match existing chrome).
  Video tiles: neutral tile, type label «Видео» as text Badge + original name (no thumb,
  no fake preview). Details sheet: size, no dimensions; delete-in-use 409 message surfaced.
- All states: skeleton on load, error+retry, never blank. No status dots, no
  animate-pulse/ping decoration, no emoji icons.

## 5. i18n

Admin chrome stays ru-only in `cms/src/lib/i18n/ru.ts` (zero hardcoded Cyrillic in
components). New keys (ui-developer, final wording native ru): nav «Главная страница»;
hero card «Баннер», «Видео», «Фотографии», «MP4 (H.264), до 50 МБ», empty-hero hint;
overlay card «Текст на баннере», «Сезон», «Заголовок», «Кнопка»; settings «Соцсети»,
«Платформа», «Ссылка», «Добавить ссылку»; media filter «Все», «Фотографии», «Видео».
Storefront: no new keys — existing `heroSeason/heroCollection/heroShop` and footer keys
become live via uiStrings pairing. Backend error strings (Russian) pinned in §3.

## 6. File ownership

- **backend-developer**: `api/**`, `shared/**`, `umabranduz/src/content.js`,
  `umabranduz/src/App.jsx` (ONLY the four edits in §3), `umabranduz/src/content-snapshot.json`.
- **ui-developer**: `cms/**` only (incl. verbatim refresh of `cms/src/lib/api/types.ts`
  from §3). Needs a type/API change → STOP and report; do not edit shared/.
- Contradiction with reality → STOP, report to orchestrator; only orchestrator edits this file.

## 7. Acceptance criteria

1. `GET /api/public/content` responds `Cache-Control: no-cache` with strong ETag; 304 on
   matching If-None-Match. A CMS page/string edit is visible on the storefront after one
   reload (≤5 s), verified in a real browser.
2. Editing a footer label (e.g. «Общие услуги») and hero overlay text in «Тексты сайта»
   changes the storefront in all of ru/uz/en.
3. With the API blocked, the storefront still renders fully (bundled translations, default
   hero video, hardcoded social links; cache/snapshot for content) — no blank page.
4. mp4 upload ≤50 MB succeeds with magic-byte validation; renamed non-mp4 → 400 with the
   pinned Russian message; >50 MB video → 400 «Видео больше 50 МБ»; image pipeline
   byte-identical behavior to cms-v1.
5. Hero validation enforced: 1 video XOR 1–3 images (mixed/empty → 400 with pinned
   message); deleting media referenced by hero → 409 with pinned message.
6. «Главная страница»: pick video → storefront hero plays it; pick 2 images → storefront
   shows a 2-slide hero carousel; clear hero → committed default video returns.
7. The three overlay strings edited on «Главная страница» persist, survive reload, and
   render on the storefront ×3 langs.
8. «Соцсети» edits appear in the storefront footer and contact page; platform Select
   limited to the five icon-backed platforms; invalid URL blocked inline in Russian.
9. Snapshot regenerated; with API down and clean localStorage the storefront shows
   snapshot-time values incl. uiStrings/hero/socialLinks.
10. Anti-slop: no glowing/pulsing status dots or dot-prefixed pills, no animate-pulse/ping
    decoration, no emoji icons, no gradient-SaaS chrome; admin chrome native Russian via
    `ru.ts` only (grep-verified no hardcoded Cyrillic in components).
11. Legacy intact: language switching, LocalizedInterface DOM replacement, cart, PDP size
    guide, size finder all behave as before, including after editing ru values of paired
    strings.
12. `cd api && npm test` green, including new specs: video upload, hero validation,
    hero-in-use 409, no-cache header, bundle settings shape.

## 8. Conflict log

- 16.08.2026, dev phase: no STOP conflicts reported by either agent. Recorded deviations
  (accepted): backend widened the image magic-byte error to mention MP4 («…Поддерживаются
  JPEG, PNG, WebP и MP4.»); ui kept `cms/src/lib/api/types.ts` field-for-field identical
  to §3 but not byte-verbatim (cms-v1 convention: zod stripped, helper interfaces added).

## 9. Verdict

**Ruling:** BLOCK — remedy tier: lightweight targeted fix (no full iteration 2).

**Grounds:**
1. §7-1 fails in substance in the canonical topology (playwright-qa F1; planner-assessor
   criterion 1 FAIL). The storefront's manual `If-None-Match` header turns the public
   content GET into a preflighted request; the API's CORS allowlist (5173/5174 only)
   rejects it, so out of the box every reload silently serves the stale localStorage
   cache. Part (A) of §1 — the staleness fix that motivated this feature — does not work
   unless `CORS_ORIGIN` happens to be set exactly right, and would fail on production
   GH Pages. The user's original bug survives; that is "contract violated in substance",
   not cosmetic.
2. Everything else substantially passes: §7-2..9 verified in a real browser ×3 langs ×3
   viewports (playwright-qa), full legacy regression clean (bug-hunter), 11/12 criteria
   PASS with evidence (planner-assessor), api e2e 46/46 green. A full re-run would redo
   work that is already proven good — disproportionate.
3. planner-assessor's own judgment: the defect fits a lightweight fix round; two minimal
   options identified. Evidence-backed and uncontested by the other reports.

**Budget state:** iterations 1/2 used. Iteration 1 cost ≈ $47.94 (block $55.33 − usd_at_start
$7.39). 5h block: $55.33 spent, projection $234 if burn continues; weekly $988.78. A second
full iteration (~$48) would fit the grant, but the lightweight fix (est. well under $15)
is the proportionate remedy and is what this court prescribes. The remaining grant is the
ceiling, not a target.

**Remedy (targeted fix, backend-developer only, then playwright-qa spot-check):**
1. `umabranduz/src/content.js` — remove the manual `If-None-Match` header from
   `loadContent()`; keep `cache: 'no-cache'` and let the browser HTTP cache do conditional
   revalidation (assessor option (b)). This eliminates the preflight entirely: the request
   becomes a simple GET, valid from any origin under plain `ACAO: *`. No CMS/admin CORS
   change; credentialed admin routes keep the allowlist untouched.
2. `api` e2e — new spec: `GET /api/public/content` with `Origin: https://example.github.io`
   (not in allowlist) returns 200 with a usable `Access-Control-Allow-Origin`; and assert
   the response still carries `Cache-Control: no-cache` + strong ETag with 304 on
   If-None-Match (server behavior unchanged).
3. Regenerate nothing else; snapshot and App.jsx stay as shipped.

**Acceptance check for the fix round:** playwright-qa re-verifies §7-1 ONLY, with the API
started with NO `CORS_ORIGIN` set and the storefront on a port outside the allowlist
(simulating the GH Pages topology): a CMS edit is visible on the storefront after one
reload ≤5 s; network panel shows no OPTIONS preflight for `/api/public/content`; api
`npm test` green including the new spec. On pass → ALLOW stands, orchestrator invokes
documentor; `iterations_used` stays 1 (fix round, not an iteration).

**Ride-along ruling for "later" items:**
- **F2** (generic upload-error text in the media picker) — MAY ride along: single-file
  ru copy fix in cms/, verified by eyeball in the same QA pass. Nothing else rides.
- **B1** (clearing an overlay field saves "" but storefront keeps old text) — backlog with
  a note. The behavior follows the contract's own pinned merge logic
  (`if (uiStrings[key]?.[lang])` treats "" as absent); changing it means amending frozen
  contract text, which is not a fix-round action. Document as known limitation.
- **F3** (pre-login 401 console noise), **B9** (polish) — backlog.
- **B2/B3/B8** (uz/en copy issues) — content, not code; editable in the CMS today by an
  admin, no engineering round needed. Excluded from the fix round.

— supreme-court, 16.08.2026

**Fix-round outcome (orchestrator, 16.08.2026):** remedy executed exactly as prescribed —
`If-None-Match` header removed from `content.js` (localStorage keeps the bundle-only
offline tier), new foreign-origin e2e spec added, `api npm test` 47/47 green; F2 ride-along
shipped (server 4xx message surfaced under the failed upload row, generic text kept for
network/5xx). Acceptance check PASSED by playwright-qa in the prescribed GH Pages
simulation: API with no `CORS_ORIGIN`, storefront on non-allowlisted :5181, clean
localStorage — zero OPTIONS preflights on both loads, CMS marker edit visible 381 ms after
one reload, content restored, F2 message verified on-screen. Per the court's terms the
verdict converts to **ALLOW**; `iterations_used` stays 1. Status → allowed.
