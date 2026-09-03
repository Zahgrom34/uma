import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types (contract cms-v1 §3 — frozen boundary)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Billz POS sync (contracts billz-v1 §3, billz-v2 §3 — BILLZ 2 API)
// ---------------------------------------------------------------------------

export interface BillzSettings { secretKey: string; secretKeySet: boolean; shopIds: string[] }
export interface BillzShop { id: string; name: string }
export interface BillzSyncReport { startedAt: string; durationMs: number; totalRows: number; matchedProducts: number; updatedProducts: number; unmatchedSkus: string[]; warnings: string[]; error: string | null }
export interface BillzTestResult { ok: true; rows: number }

export type MediaKind = 'image' | 'video';

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

export interface UiStringDto { key: string; ru: string; uz: string; en: string; context?: string }
export interface CommerceSettings { freeShipThreshold: number; flatShipping: number }

// ---------------------------------------------------------------------------
// Zod schemas (admin-facing messages in Russian)
// ---------------------------------------------------------------------------

const req = (label: string) => z.string({ required_error: `Заполните поле «${label}»`, invalid_type_error: `Поле «${label}» должно быть строкой` }).min(1, `Заполните поле «${label}»`);

export const LoginSchema = z.object({
  email: req('Почта').email('Введите корректный адрес почты'),
  password: req('Пароль'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const LangEnum = z.enum(['ru', 'uz', 'en']);

export const ProductI18nSchema = z.object({
  name: req('Название'),
  color: req('Цвет'),
  material: req('Материал'),
  desc: req('Описание'),
});

export const ProductSizeSchema = z.object({
  size: req('Размер'),
  available: z.boolean({ invalid_type_error: 'Поле «В наличии» должно быть да/нет' }),
  lowStockQty: z.number().int('Остаток должен быть целым числом').positive('Остаток должен быть больше нуля').optional(),
});

export const TagEnum = z.enum(['new', 'sale', 'online-exclusive']);

// Wire shape (contract §3 pin, 15.08.2026): the admin UI sends display casing
// ('New' | 'Sale' | 'Online Exclusive' | null) — the same values AdminProduct.tag
// reads. The backend normalizes to DB values before persisting. Lowercase DB
// values are also accepted for compatibility with direct API clients.
const TAG_WIRE_TO_DB: Record<string, z.infer<typeof TagEnum>> = {
  'New': 'new',
  'Sale': 'sale',
  'Online Exclusive': 'online-exclusive',
  'new': 'new',
  'sale': 'sale',
  'online-exclusive': 'online-exclusive',
};

export const TagWireSchema = z
  .enum(['New', 'Sale', 'Online Exclusive', 'new', 'sale', 'online-exclusive'], {
    errorMap: () => ({ message: 'Метка: «New», «Sale» или «Online Exclusive»' }),
  })
  .transform((value) => TAG_WIRE_TO_DB[value]);

const productUpsertBase = z.object({
  id: z
    .string({ required_error: 'Укажите адрес товара (слаг)' })
    .min(1, 'Укажите адрес товара (слаг)')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Слаг может содержать только строчные латинские буквы, цифры и дефисы'),
  categorySlug: req('Категория'),
  price: z
    .number({ required_error: 'Укажите цену', invalid_type_error: 'Цена должна быть числом' })
    .int('Цена должна быть целым числом в сумах')
    .positive('Цена должна быть больше нуля'),
  oldPrice: z.number().int('Старая цена должна быть целым числом').positive('Старая цена должна быть больше нуля').nullable().optional(),
  sale: z.boolean().optional().default(false),
  tag: TagWireSchema.nullable().optional(),
  online: z.boolean().optional().default(false),
  outOfStock: z.boolean().optional().default(false),
  stock: z.number().int('Остаток должен быть целым числом').min(0, 'Остаток не может быть отрицательным').nullable().optional(),
  sizeGuide: z.string().nullable().optional(),
  sizeValues: z.array(z.string().min(1)).nullable().optional(),
  colorVariants: z
    .array(z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Цвет должен быть в формате #RRGGBB'))
    .nullable()
    .optional(),
  billzSku: z.string().trim().max(200, 'Слишком длинный артикул Billz').nullable().optional(),
  status: z.enum(['draft', 'published'], { invalid_type_error: 'Статус: «draft» или «published»' }).optional().default('published'),
  sortOrder: z.number().int().optional(),
  i18n: z.object({ ru: ProductI18nSchema, uz: ProductI18nSchema, en: ProductI18nSchema }, { required_error: 'Заполните переводы товара' }),
  sizes: z.array(ProductSizeSchema).optional().default([]),
  mediaIds: z.array(z.string().min(1)).min(1, 'Добавьте хотя бы одну фотографию'),
});

const saleRule = (data: { sale?: boolean; oldPrice?: number | null; price?: number }, ctx: z.RefinementCtx) => {
  if (data.sale) {
    if (data.oldPrice == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oldPrice'], message: 'Для скидки укажите старую цену' });
    } else if (data.price != null && data.oldPrice <= data.price) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oldPrice'], message: 'Старая цена должна быть выше текущей' });
    }
  }
};

export const ProductUpsertSchema = productUpsertBase.superRefine(saleRule);
export type ProductUpsertInput = z.infer<typeof ProductUpsertSchema>;

export const ProductPatchSchema = productUpsertBase.omit({ id: true }).partial().superRefine((data, ctx) => {
  if (data.sale && data.oldPrice != null && data.price != null && data.oldPrice <= data.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oldPrice'], message: 'Старая цена должна быть выше текущей' });
  }
});
export type ProductPatchInput = z.infer<typeof ProductPatchSchema>;

export const CategoryUpsertSchema = z.object({
  slug: z
    .string({ required_error: 'Укажите адрес категории (слаг)' })
    .min(1, 'Укажите адрес категории (слаг)')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Слаг может содержать только строчные латинские буквы, цифры и дефисы'),
  nameRu: req('Название (русский)'),
  nameUz: req('Название (узбекский)'),
  nameEn: req('Название (английский)'),
  sortOrder: z.number().int().optional(),
});
export type CategoryUpsertInput = z.infer<typeof CategoryUpsertSchema>;

export const CategoryPatchSchema = CategoryUpsertSchema.partial();
export type CategoryPatchInput = z.infer<typeof CategoryPatchSchema>;

const pageLangSchema = z.object({
  eyebrow: req('Надзаголовок'),
  heading: req('Заголовок'),
  body: req('Текст'),
});
export const PageUpsertSchema = z.object({ ru: pageLangSchema, uz: pageLangSchema, en: pageLangSchema });
export type PageUpsertInput = z.infer<typeof PageUpsertSchema>;

export const UiStringSchema = z.object({
  key: req('Ключ'),
  ru: z.string({ invalid_type_error: 'Русский текст должен быть строкой' }),
  uz: z.string({ invalid_type_error: 'Узбекский текст должен быть строкой' }),
  en: z.string({ invalid_type_error: 'Английский текст должен быть строкой' }),
  context: z.string().optional(),
});
export const UiStringsBulkSchema = z.array(UiStringSchema).min(1, 'Передайте хотя бы одну строку');
export type UiStringsBulkInput = z.infer<typeof UiStringsBulkSchema>;

export const CommerceSettingsSchema = z.object({
  freeShipThreshold: z
    .number({ required_error: 'Укажите порог бесплатной доставки', invalid_type_error: 'Порог должен быть числом' })
    .int('Порог должен быть целым числом в сумах')
    .min(0, 'Порог не может быть отрицательным'),
  flatShipping: z
    .number({ required_error: 'Укажите стоимость доставки', invalid_type_error: 'Стоимость должна быть числом' })
    .int('Стоимость должна быть целым числом в сумах')
    .min(0, 'Стоимость не может быть отрицательной'),
});

export const ContactSettingsSchema = z.object({
  phone: req('Телефон'),
  email: req('Почта').email('Введите корректный адрес почты'),
  hoursWeekdays: req('Часы (будни)'),
  hoursWeekend: req('Часы (выходные)'),
});

export const SocialLinkSchema = z.object({
  label: req('Название'),
  href: req('Ссылка').url('Введите корректную ссылку'),
});

// Slide count only; the backend additionally checks the resolved assets are
// exactly 1 video XOR 1–3 images (service-level, needs the DB).
export const HeroSettingsSchema = z.object({
  slides: z
    .array(z.object({ mediaId: req('Медиафайл') }))
    .min(1, 'Баннер — это одно видео или до трёх фотографий')
    .max(3, 'Баннер — это одно видео или до трёх фотографий'),
});
export type HeroSettingsInput = z.infer<typeof HeroSettingsSchema>;

export const BillzSettingsSchema = z.object({
  secretKey: z.string().max(2000, 'Слишком длинный токен'),                          // '' on PUT = keep stored value
  shopIds:   z.array(z.string().trim().min(1, 'Пустой ID магазина')).max(50, 'Слишком много магазинов'), // [] = все магазины
});
export type BillzSettingsInput = z.infer<typeof BillzSettingsSchema>;

export const SettingsSchema = z.object({
  commerce: CommerceSettingsSchema.optional(),
  contact: ContactSettingsSchema.optional(),
  socialLinks: z.array(SocialLinkSchema).optional(),
  hero: HeroSettingsSchema.nullable().optional(),   // null deletes the stored hero
  billz: BillzSettingsSchema.optional(),
});
export type SettingsInput = z.infer<typeof SettingsSchema>;
