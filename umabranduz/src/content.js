// Runtime content layer (contract cms-v1): the storefront loads its content from the
// CMS API with a three-tier fallback — live API → localStorage cache → committed snapshot.
// App.jsx must only be imported (dynamically) AFTER applyContent() has run: its module
// evaluation reads `products` and `productCopy` at import time.
import { products } from './data.js';

// Mutable exports — App.jsx imports these bindings; applyContent fills them in place.
export const productCopy = {};
export const pageCopy = { ru: {}, uz: {}, en: {} };
export const commerce = { freeShipThreshold: 1500000, flatShipping: 35000 };
export const uiStrings = {};
export const heroMedia = [];
export const socialLinksData = [];
export const categoriesData = [];

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const CACHE_KEY = 'uma-content-cache';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch { return null; }
};

const toLegacy = p => ({
  id: p.id,
  cat: p.cat,
  categorySlug: p.categorySlug,
  price: p.price,
  ...(p.oldPrice != null ? { oldPrice: p.oldPrice } : {}),
  ...(p.sale ? { sale: true } : {}),
  ...(p.tag ? { tag: p.tag } : {}),
  ...(p.online ? { online: true } : {}),
  ...(p.outOfStock ? { outOfStock: true } : {}),
  ...(p.stock != null ? { stock: p.stock } : {}),
  ...(p.sizeGuide ? { sizeGuide: p.sizeGuide } : {}),
  ...(p.sizeValues ? { sizeValues: p.sizeValues } : {}),
  ...(p.colorVariants ? { colorVariants: p.colorVariants } : {}),
  ...(p.unavailableSizes && p.unavailableSizes.length ? { unavailableSizes: p.unavailableSizes } : {}),
  ...(p.lowStockSizes && Object.keys(p.lowStockSizes).length ? { lowStockSizes: p.lowStockSizes } : {}),
  ...p.i18n.ru,
  img: p.images[0],
  img2: p.images[1] || p.images[0],
  images: p.images,
});

export function applyContent(bundle) {
  // Products: replace the legacy array IN PLACE — App.jsx holds this exact reference.
  products.length = 0;
  products.push(...bundle.products.map(toLegacy));

  // uz/en product copy in the legacy productCopy shape.
  for (const key of Object.keys(productCopy)) delete productCopy[key];
  for (const p of bundle.products) {
    productCopy[p.id] = { uz: p.i18n.uz, en: p.i18n.en };
  }

  // Info pages in the exact legacy shape: { lang: { slug: [eyebrow, heading, body] } }.
  for (const lang of ['ru', 'uz', 'en']) {
    pageCopy[lang] = pageCopy[lang] || {};
    for (const key of Object.keys(pageCopy[lang])) delete pageCopy[lang][key];
    for (const page of bundle.pages) {
      const copy = page.i18n[lang];
      if (copy) pageCopy[lang][page.slug] = [copy.eyebrow, copy.heading, copy.body];
    }
  }

  Object.assign(commerce, bundle.settings.commerce);

  // ui-strings, hero and social links (cms-v2). Older cached bundles may lack these keys.
  for (const key of Object.keys(uiStrings)) delete uiStrings[key];
  Object.assign(uiStrings, bundle.uiStrings || {});
  heroMedia.length = 0;
  heroMedia.push(...(bundle.settings.hero || []).map(({ type, src }) => ({ type, src })));
  socialLinksData.length = 0;
  socialLinksData.push(...(bundle.settings.socialLinks || []));
  categoriesData.length = 0;
  categoriesData.push(...(bundle.categories || []));
  return bundle;
}

export async function loadContent() {
  const cached = readCache();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    // No manual If-None-Match: that would force a CORS preflight, which the public
    // endpoint's plain `ACAO: *` cannot answer for arbitrary origins (e.g. GH Pages).
    // `cache: 'no-cache'` makes the browser's own HTTP cache revalidate against the
    // strong ETag instead — a simple GET, valid from any origin.
    const res = await fetch(`${API_URL}/api/public/content`, {
      signal: controller.signal,
      cache: 'no-cache',
    });
    clearTimeout(timer);
    if (res.status === 200) {
      const bundle = await res.json();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ bundle })); } catch { /* quota — non-fatal */ }
      return bundle;
    }
    // Unexpected status → fall through to cache/snapshot.
  } catch { /* offline / timeout — fall through */ }
  if (cached?.bundle) return cached.bundle;
  const snapshot = await import('./content-snapshot.json');
  return snapshot.default;
}
