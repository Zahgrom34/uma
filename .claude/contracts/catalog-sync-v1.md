---
feature: catalog-sync-v1 — API-driven storefront catalog (seamless Billz→CMS→storefront)
status: allowed
budget:
  iterations_allowed: 2         # user-granted 04.10.2026
  iterations_used: 1            # round 1 + lightweight §5 rework, counted as one by the court
  usd_at_start: 12.55
created: 04.10.2026
---

## 1. Scope

Replace the storefront's hardcoded category plumbing with the API's `categories`
(slug + nameRu/nameUz/nameEn + sortOrder, already in the public bundle) so that catalog changes made
in the CMS — including the new «Декор» category imported from Billz — appear on the storefront
without code edits. Storefront only (`umabranduz/`); no API changes. Context: prod now serves 32
Billz-backed products in 11 categories; the storefront menu/filters only know the old 10 and show
almost nothing («Новинки» filters `tag==='New'`, which no product has).

Architecture constraint: keep the legacy structure (data.js globals, content.js applyContent,
hash routing, module-load ordering per docs/features/cms-v1.md). Do NOT extend `LocalizedInterface`
/ `legacyPhrases` / `lockSizeFinderToWomen`. All new logic keys on `categorySlug`, never on
localized names.

## 2. Out of scope

Hero/campaign hardcoded Unsplash imagery; SizeFinder internals; checkout/cart logic beyond what
size-less products require; category CRUD UI in CMS; renaming the odd category data
(jackets/nameEn="Knitwear", outerwear/nameEn="Clothing", dresses+blouses sharing nameUz) — flag in
docs, admin fixes data in CMS; api/** and shared/** (no wire changes; `categorySlug` and
`categories` are already public); orders/Billz push; the uz/en jewellery/scarves curation beyond
the ru-name fix in §3.6.

## 3. Design (umabranduz/src — exact requirements)

Define once in App.jsx:
`WEAR_SLUGS = ['dresses','trousers','blouses','skirts','tops','jackets','outerwear','shoes']`
(wearable), `ACC_SLUGS = ['accessories','bags']`. Any other slug (e.g. `decor`, future ones) is
"other". Shoes sizing = slug `shoes`.

1. **content.js**: export mutable `categoriesData` (array of `{slug,nameRu,nameUz,nameEn,sortOrder}`),
   filled in `applyContent` from `bundle.categories` (empty array fallback for old cached bundles).
   `toLegacy` keeps `categorySlug` on each product. Snapshot tier keeps working.
2. **Category names**: new helper `categoryLabel(slug, lang)` → category's name for the current
   language, fallback chain uz/en→ru→raw slug. Replaces the hardcoded `categoryName` map everywhere
   it is used (catalog tabs, product breadcrumb). `cat` (ru string) stays on products for backwards
   compat but no NEW comparisons against it.
3. **catalogConfig → dynamic**: special routes keep working — `sale` (`p.sale`), `online`
   (`p.online`), `clothing` (slug ∈ WEAR_SLUGS), `new` (see §3.5). Per-category routes are generated
   from `categoriesData`: `/catalog/<slug>` → `p.categorySlug===slug`, title `categoryLabel`.
   Legacy aliases must not 404-to-Новинки: `jeans`,`polo`,`tshirts`,`shirts`,`knitwear`,
   `jewellery`,`scarves` map to {trousers, tops, tops, blouses, jackets+outerwear, accessories+ru-name
   regex, accessories+ru-name regex} respectively. Unknown slug still falls back to `new`.
4. **Catalog tabs**: built from distinct `categorySlug` of products passing the route predicate,
   ordered by category sortOrder, labelled via `categoryLabel`; «Все» first. Tab selection RESETS
   when the route key changes (fix the carry-over bug — selected tab currently survives navigation).
5. **«Новинки» never empty**: `new` predicate = `p.tag==='New'`; if no product carries the tag, the
   page shows ALL products (newest-first per bundle order) instead of an empty grid. Home rails
   unchanged.
6. **ru-string predicate fixes**: `jewellery`/`scarves` regexes test the RU name (productBase), not
   the language-mutated `p.name`, so uz/en pages stop being empty. Search (l.288) matches localized
   category label in addition to what it does now.
7. **Size behavior by slug** (`productOptions`, `canFindSize`):
   - slug `shoes` → numeric sizes as now (sizeValues override respected);
   - slug ∈ ACC_SLUGS or "other" (incl. `decor`) → no size choice, `ONE SIZE` default, add-to-cart
     enabled, size finder hidden;
   - wearable non-shoes → as now (sizeValues else XS–XL), size finder offered.
   Related rail / cart suggestions compare `categorySlug`.
8. **Menu (MenuPanel)**: three tabs — «Женщинам» (WEAR_SLUGS present in categoriesData, in
   sortOrder), «Аксессуары» (ACC_SLUGS plus the two curated links украшения/шарфы as today), and a
   third tab shown ONLY when "other" categories exist, labelled with the single category's own name
   when there is exactly one (i.e. «Декор» today) or a new key `t('moreCategories')`
   («Ещё»/«Yana»/"More") when several — NOT `more`, which already exists as the notice-bar
   «Подробнее →» link. Category buttons navigate to `/catalog/<slug>` and are labelled `categoryLabel`.
   `previews`: keep the curated map but fall back to the first product OF THAT category (not
   `products[0]`) when the hardcoded id is absent/unpublished.
9. **i18n keys**: new `moreCategories` key added to the three built-in translation tables
   (ru «Ещё», uz «Yana», en "More") and overridable via uiStrings like its siblings. No Cyrillic literals in
   JSX outside the translation tables. Run `antislop` on any new user-visible string.

## 4. Data/deploy steps (orchestrator, after ALLOW)

1. Regenerate `umabranduz/src/content-snapshot.json` from the LIVE prod bundle
   (https://uma.findex.uz/api/public/content) so the offline fallback carries prod image URLs
   (the committed one has localhost:3001 links — broken).
2. Commit + push → GitHub Pages workflow rebuilds the mirror (repo var VITE_API_URL).
3. Build `umabranduz` with `VITE_API_URL=https://uma.findex.uz` and replace `/var/www/uma` on the
   server (Caddy serves it; path is live-verified, not in repo docs — document it in the feature record).

## 5. File ownership

**ui-developer** — `umabranduz/src/App.jsx`, `umabranduz/src/content.js` ONLY. Do not touch
`main.jsx`, `data.js`, `styles.css` (new styles may reuse existing classes; if a style addition is
unavoidable, report instead of editing). REWORK AMENDMENT (04.10, assessor-prescribed): for the
menu-tab-row fix ONLY, ui-developer may add/adjust the minimal rule(s) for the menu tabs row in
`styles.css` so three tabs fit — wrap or horizontal scroll at ≤375px, no clip under the desktop
editorial preview. Nothing else in styles.css may change. **orchestrator** — snapshot, build, deploy, contract.
No backend-developer this run.

## 6. Acceptance criteria

1. Local build (`npm run build`) succeeds; dev run against the prod API shows: menu has «Декор»
   (third tab or entry), `/catalog/decor` lists the 22 vases with correct ru/uz/en labels, prices
   `1 500 000 UZS`-style formatting intact.
2. «Новинки» page is not empty (fallback shows the catalog); «Одежда» contains no vases; vases
   show no XS–XL selector, no «Подобрать размер», and can be added to the cart and checked out
   with no size; shoes keep numeric sizes; dresses keep XS–XL + size finder.
3. Switching uz/en: menu + catalog tabs + breadcrumbs show nameUz/nameEn («Dekor»/"Decor");
   украшения/шарфы pages are non-empty in uz/en (ru-name regex fix).
4. Legacy routes `/catalog/jeans|polo|tshirts|shirts|knitwear|jewellery|scarves` still render their
   mapped content; unknown slugs fall back to Новинки. Tab selection resets between catalog routes.
5. A category added/renamed in the CMS appears/renames on the storefront after reload with NO
   storefront code change (verify by renaming «Декор»→«Декор дома» via API and back).
6. Existing flows intact: sale page, product page for a dress (sizes, size guide), cart drawer,
   favourites, search, checkout form, orders page. No console errors on home/catalog/product/cart.
7. Anti-slop: no new emoji/AI-tells; copy in all three languages reads natively.
8. After deploy (§4): https://uma.findex.uz shows the same behavior live, and the GH Pages mirror
   build goes green.

## 7. QC

Full trio this run (budget allows): playwright-qa drives §6.1–6.6 in a real browser against a local
storefront on **port 5175** (NEVER 5173/3000 — user's unrelated processes) with the PROD API;
bug-hunter sweeps ru/uz comprehension + visual regressions; planner-assessor assesses all criteria.
supreme-court rules on the evidence. Orchestrator does the deploy only after ALLOW, then re-verifies
§6.8 live.

## 8. Conflict log

- 04.10.2026 ui-developer: §3.8/§3.9 named the new tab key `more`, which already exists in all
  three translation tables as the notice-bar «Подробнее →» link (App.jsx l.57-59, rendered in
  Header l.102); redefining it would rename that link site-wide. Resolution: key renamed to
  `moreCategories`. Contract updated, agent re-run.

## 9. Verdict

**Ruling: ALLOW** (with conditions) — 04.10.2026, supreme-court

**Grounds:**
1. §6.1–6.4, §6.6 PASS per playwright-qa full pass with screenshots and clean console (report B); §6.5 PASS via orchestrator rename round-trip through the live bundle; §6.7 PASS per planner-assessor (report D). §6.8 is pending deploy by design (§4/§7) — not a ground to block.
2. The only bugs found in-scope (B1 desktop menu tab clip, B2 mobile 375px tab-row overflow) were fixed under the §5 rework amendment (3-line .shopmenu-tabs change) and re-verified by playwright-qa at 1440x900 and 375x812 in ru+uz, no regressions (report E).
3. bug-hunter blockers (report C) were all data/config, remediated and verified live by the orchestrator: shopIds→all-shops re-sync (stock live), stale Sale tags cleared, 27 products tagged New, uz/en/ru naming fixes in the live bundle. Remaining majors are pre-existing legacy explicitly outside §2 (diff-verified untouched).
4. The one contract conflict (`more` key collision) was handled per process: STOP, §8 log, `moreCategories` resolution, re-run (report A).
5. No evidence of slop; no blocker-severity finding remains in any report.

**Budget state:** iterations 1/2 used (round 1 + lightweight §5 rework). usd_at_start 12.55; daily now $85.80 → ~$73.25 spent this run. 5h block: $74.77 active (projection $419 if burn continues). Weekly well within historical norms. One full iteration remains affordable but is not needed.

**Remedy:**
1. SHIP: orchestrator executes §4 (snapshot from prod bundle, commit/push for GH Pages, VITE_API_URL build → /var/www/uma), then live-verifies §6.8. If §6.8 fails live, that is a deploy defect — targeted fix only, no re-run of §3.
2. Documentor records as later items (not conditions of this ship): decor-page clothing-manifesto subtitle; sale-rail hardcoded «до»; uz apostrophe glyph normalization; quick-add ignores outOfStock; dead accordions / empty МАТЕРИАЛ; ONE SIZE token in cart lines; single-line desktop tabs nicety (third tab wraps at 1440, cosmetic); admin data: category nameUz/nameEn oddities (jackets/outerwear/dresses+blouses per §2), vase spec-sheet photo used as primary, Chinese spec overlays on some Billz photos.
3. Feature record must document the live-verified /var/www/uma Caddy path per §4.3.
