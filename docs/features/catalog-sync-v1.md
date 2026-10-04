# catalog-sync-v1 — API-driven storefront catalog

Contract: `.claude/contracts/catalog-sync-v1.md` (status: allowed; supreme-court
ALLOW with ship conditions, 04.10.2026, one iteration — round 1 plus a
lightweight assessor-prescribed rework counted together). Shipped: 04.10.2026,
commit `2115cf1`. Storefront only (`umabranduz/`); no API or shared changes.

## What shipped

The storefront's category plumbing no longer hardcodes the old 10 categories.
Menu, catalog routes, filter tabs, breadcrumbs, size logic, search, and
related-product suggestions all key on `categorySlug` and the public bundle's
`categories` array (`slug`, `nameRu`/`nameUz`/`nameEn`, `sortOrder`). A category
added or renamed in the CMS appears on the storefront after a reload with no
code change — verified live by renaming «Декор»→«Декор дома» and back through
the prod bundle.

- **content.js** exports mutable `categoriesData`, refilled in `applyContent`
  from `bundle.categories` (empty-array fallback for pre-catalog-sync cached
  bundles); `toLegacy` keeps `categorySlug` on each product. The three-tier
  fallback (API → localStorage → snapshot) is unchanged.
- **App.jsx** defines `WEAR_SLUGS` (dresses, trousers, blouses, skirts, tops,
  jackets, outerwear, shoes) and `ACC_SLUGS` (accessories, bags); any other slug
  — `decor` today — is "other". `categoryLabel(slug, lang)` resolves the
  category's name for the active language with uz/en→ru→raw-slug fallback and
  replaces the old hardcoded `categoryName` map in tabs and breadcrumbs. `cat`
  (the ru string) remains on products for backwards compatibility, but no new
  logic compares against it.
- **Routes**: special routes `sale`/`online`/`clothing` keep their predicates
  (`clothing` = slug ∈ WEAR_SLUGS); per-category routes `/catalog/<slug>` are
  generated from `categoriesData`. Legacy aliases still render mapped content:
  `jeans`→trousers, `polo`/`tshirts`→tops, `shirts`→blouses,
  `knitwear`→jackets+outerwear, `jewellery`/`scarves`→accessories narrowed by a
  ru-name regex. The jewellery/scarves regexes now test the RU base name, not
  the language-mutated `p.name`, so those pages are non-empty in uz/en. Unknown
  slugs fall back to «Новинки».
- **«Новинки» never empty**: the `new` predicate is `p.tag==='New'`; when no
  product carries the tag, the page shows the full catalog (bundle order)
  instead of an empty grid. Home rails are unchanged.
- **Catalog tabs** are built from the distinct `categorySlug`s of products
  matching the route predicate, ordered by category `sortOrder`, labelled via
  `categoryLabel`, «Все» first. Tab selection resets when the route key changes
  (`useEffect(()=>setCat('all'),[key])`) — previously the selected tab survived
  navigation between catalog routes.
- **Size behavior by slug**: `shoes` keeps numeric sizes (sizeValues override
  respected); ACC_SLUGS and "other" (vases included) get no size selector —
  `ONE SIZE` default, add-to-cart enabled, size finder hidden; wearable
  non-shoes keep XS–XL / sizeValues plus the size finder. Related rail and cart
  suggestions compare `categorySlug`.
- **Menu (MenuPanel)**: tabs built from `categoriesData` — «Женщинам»
  (WEAR_SLUGS in sortOrder), «Аксессуары» (ACC_SLUGS plus the curated
  украшения/шарфы links), and a third tab only when "other" categories exist,
  labelled with the single category's own name when there is exactly one
  («Декор» today) or `t('moreCategories')` when several. Category preview
  images fall back to the first product of that category when the curated id is
  absent. The `.shopmenu-tabs` row wraps (`flex-wrap:wrap`, tightened gap at
  ≤420px) instead of clipping — the one permitted `styles.css` change, added
  under the contract §5 rework amendment after QA found the third tab clipped
  under the desktop editorial preview and overflowed at 375px.
- **Search** matches the localized category label in addition to name and `cat`.
- **i18n**: one new key, `moreCategories` (ru «Ещё», uz «Yana», en "More"), in
  all three built-in tables and overridable via `uiStrings` like its siblings.

## Conflict (contract §8)

The contract originally named the third-tab key `more`, which already exists in
all three translation tables as the notice-bar «Подробнее →» link; redefining it
would have renamed that link site-wide. ui-developer stopped per process; the
orchestrator renamed the key to `moreCategories` in the contract and re-ran the
agent.

## QC

Full trio: playwright-qa drove §6.1–6.6 in a real browser (port 5175, prod API)
with screenshots and clean console; bug-hunter swept ru/uz comprehension and
visual regressions; planner-assessor assessed all criteria. The two in-scope UI
bugs (desktop menu tab clip, 375px tab-row overflow) were fixed by the 3-line
`.shopmenu-tabs` change and re-verified by playwright-qa at 1440x900 and 375x812
in ru and uz with no regressions. supreme-court ruled ALLOW on the evidence.

## Data incidents found and fixed during QC (prod, not code)

bug-hunter's blocker-level findings were all data/config, remediated and
verified live by the orchestrator:

- Prod Billz `shopIds` pointed at the empty «Website» shop, so the sync had
  zeroed all stock. Switched to all-shops and re-synced — stock restored.
- 4 stale `Sale` tags cleared (products no longer discounted).
- 26 freshly imported products tagged `New` (27 total with the existing one),
  so «Новинки» shows real new arrivals rather than relying on the fallback.
- Naming fixes in the live data, including the uz «Uchli balet tuflisi».

## Deploy

- Commit `2115cf1` pushed to `main`; the GitHub Pages workflow (repo var
  `VITE_API_URL`) rebuilt the mirror green.
- **Live server path (live-verified, required by the verdict):** the production
  storefront at https://uma.findex.uz is static files served by Caddy from
  `/var/www/uma` on 49.13.106.185; the previous build is kept at
  `/var/www/uma.prev`. Deploy procedure: build `umabranduz` with
  `VITE_API_URL=https://uma.findex.uz`, tar the `dist` to the server, swap the
  directories. §6.8 re-verified live after the swap.
- `umabranduz/src/content-snapshot.json` is now regenerated from the live prod
  bundle (https://uma.findex.uz/api/public/content), so the offline fallback
  carries prod image URLs instead of broken localhost links. Re-regenerate it
  on future content milestones.

## Known limitations / later list (court-recorded, unfunded)

Storefront, pre-existing or cosmetic:

- Decor catalog page shows the clothing-manifesto subtitle (`t('statement')`).
- Sale rail hardcodes «до» in the discount line.
- uz apostrophe glyphs are not normalized (mixed `'`/`ʻ`/`ʼ`).
- Quick-add from product cards ignores `outOfStock`.
- Dead accordions / empty «МАТЕРИАЛ» section on product pages.
- `ONE SIZE` token appears verbatim in cart lines for size-less products.
- Desktop menu: the third tab wraps to a second line at 1440px — correct but a
  single-line layout would be nicer (cosmetic).

Admin data (fix in the CMS, per contract §2):

- Category translation oddities: `jackets` nameEn="Knitwear", `outerwear`
  nameEn="Clothing", `dresses` and `blouses` share a nameUz.
- Some vases use the spec-sheet photo as the primary image.
- Chinese spec overlays on some Billz-imported photos.

Carried over from billz-v3 (merchant catalog restructure):

- Per-size stock is limited to one Billz row per артикул, so size-level
  grouping degrades to groups of one.
- ~80 photo-less Billz items are off the storefront (CMS product creation
  requires at least one photo).
