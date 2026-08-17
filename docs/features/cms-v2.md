# cms-v2 — full storefront pairing: ui-strings, hero management, social links, freshness fix

Contract: `.claude/contracts/cms-v2.md` (status: allowed; supreme-court BLOCK converted to
ALLOW after the prescribed fix round, 16.08.2026). Shipped: 16.08.2026.

## What shipped

cms-v2 closes the pairing gap left after cms-v1: CMS edits now actually reach the
storefront on the next reload. Four pieces:

- **Freshness** — the public content bundle is served `Cache-Control: no-cache` with a
  strong ETag; the storefront revalidates on every load instead of lagging up to an hour
  behind `stale-while-revalidate`.
- **UI-string pairing** — the storefront merges `bundle.uiStrings` (all 199 keys) over its
  bundled `translations`, so footer labels, hero overlay text, and the rest of the site
  copy are editable in the existing «Тексты сайта» screen and go live in ru/uz/en.
- **Hero management** — mp4 upload joins the media library (`MediaAsset.kind`
  `image | video`), `settings.hero` holds 1 video XOR 1–3 images, and a new CMS screen
  «Главная страница» edits the hero media plus the three overlay strings. Footer/contact
  social links become editable via a «Соцсети» card in Настройки.
- **Coverage** — snapshot regenerated; api e2e suite extended to 47 specs, all green.

## Freshness: how the storefront stays current

`GET /api/public/content` responds `Cache-Control: no-cache` with a strong ETag (sha1 of
the body) and 304 on a matching `If-None-Match` (`api/src/content/content.controller.ts`).
The storefront's `loadContent()` (`umabranduz/src/content.js`) sends a **simple GET** with
`cache: 'no-cache'` and deliberately **no manual `If-None-Match` header**.

That last point is the outcome of the run's one BLOCK: the first implementation attached
`If-None-Match` by hand, which turned the request into a preflighted CORS request; the
API's admin allowlist (localhost 5173/5174 only) rejected the OPTIONS, and every reload
silently fell back to the stale localStorage cache — the exact bug the feature existed to
fix, reproduced in the GH Pages topology. The fix removes the manual header and lets the
browser's own HTTP cache do the conditional revalidation against the ETag. The request is
a simple GET, valid from any origin under the endpoint's plain `ACAO: *`.

Consequences worth knowing:

- **Production works from any origin.** `CORS_ORIGIN` is no longer needed for the public
  endpoint; it still governs the credentialed admin routes only. Verified by a dedicated
  e2e spec that sends `Origin: https://example.github.io` and asserts 200 + usable ACAO.
- **localStorage cache is the offline tier only.** The cache stores `{bundle}` without an
  ETag; conditional revalidation lives entirely in the browser HTTP cache. Order:
  live API (revalidated) → localStorage cache → committed snapshot, as in cms-v1.
- A comment in `content.js` explains the no-header decision — do not "restore" it.

## UI-string pairing

`applyContent` fills a mutable `uiStrings` export with the raw `bundle.uiStrings`;
`App.jsx` merges it over the bundled literals after the last `Object.assign(translations…)`:

```js
if (uiStrings[key]?.[lang]) translations[lang][key] = uiStrings[key][lang];
```

Bundled literals remain the API-down fallback. Note the guard: an **empty string is
treated as absent** — clearing a string in the CMS saves `""` but the storefront silently
keeps showing the bundled literal (known limitation B1, contract-pinned behavior).

The three hero overlay keys (`heroSeason`, `heroCollection`, `heroShop`) are ordinary
ui-strings; no new API was added for them.

## Hero and social links

**Data.** `MediaAsset` gains `kind String @default("image")`; width/height/thumbUrl are
null for video. `settings.hero` stores `{slides: [{mediaId}]}` (1–3 slides via Zod);
service-level validation resolves the assets and enforces exactly 1 video XOR 1–3 images —
anything else is 400 «Баннер — это одно видео или до трёх фотографий», unknown id 400
«Медиафайл не найден» (`api/src/settings/settings.controller.ts`). `PUT
/api/admin/settings` with `hero: null` deletes the stored hero (storefront default
returns). The public bundle resolves `settings.hero` to `{type, src}[]` with absolute
URLs and exposes `settings.socialLinks`.

**Video upload.** `POST /api/admin/media` (same multipart route) accepts `video/mp4`:
magic-byte check (`ftyp` box at offset 4), limit 50 MB → 400 «Видео больше 50 МБ»
(images keep the cms-v1 10 MB pipeline byte-identically; the image magic-byte error now
also mentions MP4). Video is stored verbatim — original bytes, content-hash name
`<sha1-12>.mp4`, no sharp, no thumbnail, no transcoding. Deleting media referenced by the
hero is 409 «Файл используется в баннере главной страницы» (products 409 unchanged).

**CMS.** New first sidebar item «Главная страница» → `/home-page`
(`cms/src/pages/home-page.tsx`): a «Баннер» card (Видео/Фотографии toggle, media-picker
slots filtered by kind, up/down reorder, `<video muted controls>` preview, «MP4 (H.264),
до 50 МБ» helper) and a «Текст на баннере» card (Сезон/Заголовок/Кнопка with the ru/uz/en
tab pattern, saved via the ui-strings bulk PUT). Настройки gains a «Соцсети» card
(`cms/src/components/settings/social-links-card.tsx`): platform Select limited to the
five icon-backed platforms (Instagram, Telegram, Facebook, YouTube, Pinterest), URL
validated inline in Russian, read-modify-write preserving the other settings keys. The
media library gains a Все/Фотографии/Видео filter; video tiles are neutral with a text
«Видео» badge (no fake preview), and the details sheet shows size without dimensions.

## Storefront edits (App.jsx)

Exactly four contract-pinned edits, nothing else:

1. The `content.js` import extended with `uiStrings, heroMedia, socialLinksData`.
2. The translations merge described above.
3. `homeHeroMedia` uses `heroMedia` when non-empty, else the committed
   `${BASE_URL}assets/hero/uma-hero.mp4` default; the render logic (video XOR ≤3 images)
   is untouched, so clearing the hero in the CMS brings the default video back.
4. `socialLinks` is built from `socialLinksData` when non-empty — icon looked up by exact
   label against the five existing Tb icon components, labels without an icon skipped;
   empty data keeps the hardcoded list. Footer and ContactPage consume it as before.

`LocalizedInterface`, `legacyPhrases`, `data.js`, and the catalog predicates are untouched.

## Tests and QC evidence

`cd api && npm test` — 47/47 e2e specs green, including new specs for video upload, hero
validation, hero-in-use 409, the `no-cache` header + ETag/304 behavior, bundle settings
shape, and the foreign-origin (`https://example.github.io`) simple-GET spec added in the
fix round. QC: playwright-qa verified the acceptance criteria in a real browser across
ru/uz/en at three viewports; bug-hunter ran a full legacy regression sweep (language
switching, cart, PDP size guide, size finder) clean. The fix-round acceptance check
reproduced the GH Pages topology (no `CORS_ORIGIN`, storefront on a non-allowlisted port,
clean localStorage): zero OPTIONS preflights, a CMS edit visible 381 ms after one reload.

## Running and verifying

Dev commands are unchanged (see cms-v1 record and CLAUDE.md; API on 3001 in this
environment). Quick verification loop: edit a footer label or hero overlay string in the
CMS «Тексты сайта»/«Главная страница», reload the storefront once — the change must
appear within seconds in all three languages. With the API stopped, the storefront still
renders fully from cache/snapshot with the default hero video and hardcoded social links.

## Known limitations

- **B1 — empty-string trap.** Clearing a paired UI string in the CMS saves `""`, but the
  storefront merge skips empty values, so the bundled literal silently comes back. To
  intentionally hide text, this is not the mechanism; the fix needs a contract amendment
  to the pinned merge logic.
- Video is stored verbatim: no poster frame, no transcoding, no thumbnail. A non-H.264
  mp4 will upload fine but may not play in every browser.
- F3 — the CMS fires an expected 401 on `/api/auth/me` before login, which shows up as
  console noise.
- B9 — minor polish: settings dirty-state behavior is not fully consistent between cards,
  and the media filter does not show a filtered count.

## Backlog (court "later" list and pre-existing legacy)

Engineering, next contract:

- B1, F3, B9 above.
- Pre-existing storefront legacy, untouched by contract scope: size-finder units stay
  Russian («см»/«кг») and the privacy footer stays Russian in uz/en; checkout month
  abbreviations are ru-only; the orders page header/CTA is ru-only; the hardcoded
  «SALE · до −30%» band drifts from the real maximum discount; footer «Новости» still
  falls back to `/info/news`.

Content, editable in the CMS today (no engineering round needed):

- uz: «Платья» and «Рубашки» both translate to «Koʻylaklar» — ambiguous category names.
- uz: 57 values mix U+2018 (') with the correct U+02BB (ʻ) apostrophe.
- en: the notice string uses comma digit grouping where the site convention is spaces.
