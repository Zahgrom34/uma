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

export type MediaKind = 'image' | 'video';

export interface ContentBundle {
  version: string;                     // ISO timestamp of last content write
  products: PublicProduct[];           // published only, sortOrder asc
  categories: PublicCategory[];
  pages: PublicPage[];
  uiStrings: Record<string, Record<Lang, string>>;
  settings: {
    commerce: { freeShipThreshold: number; flatShipping: number };
    hero: { type: MediaKind; src: string }[];   // resolved absolute URLs; [] when unset
    socialLinks: { label: string; href: string }[];
  };
}

export interface AdminProduct extends PublicProduct {
  status: 'draft' | 'published';
  updatedAt: string;                   // ISO
  sizes: { size: string; available: boolean; lowStockQty?: number }[];  // write-side source of the derived fields
  mediaIds: string[];                  // ordered
  billzSku: string | null;             // match key for Billz stock+price sync (billz-v1)
}

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
export interface HeroSettings { slides: HeroSlideInput[] }
export interface SocialLink { label: string; href: string }

export interface UiStringDto { key: string; ru: string; uz: string; en: string; context?: string }
export interface CommerceSettings { freeShipThreshold: number; flatShipping: number }

export interface BillzSettings { secretKey: string; secretKeySet: boolean; shopIds: string[] }
export interface BillzShop { id: string; name: string }
export interface BillzSyncReport { startedAt: string; durationMs: number; totalRows: number; matchedProducts: number; updatedProducts: number; unmatchedSkus: string[]; warnings: string[]; error: string | null; importedPhotos?: number /* photos attached this run; absent in pre-v3 stored reports */ }
export interface BillzTestResult { ok: true; rows: number }
