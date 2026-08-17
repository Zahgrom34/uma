import type { Category, MediaAsset, Product, ProductImage, ProductSize, ProductTranslation } from '@prisma/client';
import type { AdminProduct, Lang, ProductI18nFields, PublicProduct } from '@uma/shared';
import { mediaUrl, thumbUrl } from '../content/media-url';

export type ProductWithRelations = Product & {
  category: Category;
  translations: ProductTranslation[];
  sizes: ProductSize[];
  images: (ProductImage & { media: MediaAsset })[];
};

export const productInclude = {
  category: true,
  translations: true,
  sizes: true,
  images: { include: { media: true }, orderBy: { sortOrder: 'asc' as const } },
};

const TAG_DISPLAY: Record<string, PublicProduct['tag']> = {
  new: 'New',
  sale: 'Sale',
  'online-exclusive': 'Online Exclusive',
};

export const tagToDisplay = (tag: string | null): PublicProduct['tag'] => (tag ? (TAG_DISPLAY[tag] ?? null) : null);

const parseJsonArray = (value: string | null): string[] | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
};

const emptyI18n: ProductI18nFields = { name: '', color: '', material: '', desc: '' };

export function toPublicProduct(p: ProductWithRelations): PublicProduct {
  const i18n = {} as Record<Lang, ProductI18nFields>;
  for (const lang of ['ru', 'uz', 'en'] as const) {
    const t = p.translations.find((x) => x.lang === lang);
    i18n[lang] = t ? { name: t.name, color: t.color, material: t.material, desc: t.desc } : { ...emptyI18n };
  }
  const unavailableSizes = p.sizes.filter((s) => !s.available).map((s) => s.size);
  const lowStockSizes: Record<string, number> = {};
  for (const s of p.sizes) {
    if (s.available && s.lowStockQty != null && s.lowStockQty > 0) lowStockSizes[s.size] = s.lowStockQty;
  }
  return {
    id: p.id,
    categorySlug: p.category.slug,
    cat: p.category.nameRu,
    price: p.price,
    oldPrice: p.oldPrice,
    sale: p.sale,
    tag: tagToDisplay(p.tag),
    online: p.online,
    outOfStock: p.outOfStock,
    stock: p.stock,
    sizeGuide: p.sizeGuide,
    sizeValues: parseJsonArray(p.sizeValues),
    colorVariants: parseJsonArray(p.colorVariants),
    unavailableSizes,
    lowStockSizes,
    images: p.images.map((img) => mediaUrl(img.media.filename)),
    thumbs: p.images.map((img) => thumbUrl(img.media.filename)),
    i18n,
  };
}

export function toAdminProduct(p: ProductWithRelations): AdminProduct {
  return {
    ...toPublicProduct(p),
    status: p.status === 'draft' ? 'draft' : 'published',
    updatedAt: p.updatedAt.toISOString(),
    sizes: p.sizes.map((s) => ({
      size: s.size,
      available: s.available,
      ...(s.lowStockQty != null ? { lowStockQty: s.lowStockQty } : {}),
    })),
    mediaIds: p.images.map((img) => img.mediaId),
  };
}
