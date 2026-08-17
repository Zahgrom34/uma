import { z } from "zod"

import type { AdminProduct, Lang, ProductI18nFields } from "@/lib/api/types"
import type { ProductPatch } from "@/lib/api/products"
import { t } from "@/lib/i18n/ru"

export const CLOTHES_SIZES = ["XS", "S", "M", "L", "XL"]
export const SHOES_SIZES = ["36", "37", "38", "39", "40", "41"]

export type SizePreset = "clothes" | "shoes" | "one" | "custom"
export type SizeState = "in" | "low" | "none"

export const LANGS: Lang[] = ["ru", "uz", "en"]

const langFields = z.object({
  name: z.string().min(1, t.editor.requiredName),
  color: z.string(),
  material: z.string(),
  desc: z.string(),
})

export const editorSchema = z
  .object({
    id: z
      .string()
      .min(1, t.editor.slugRequired)
      .regex(/^[a-z0-9-]+$/, t.editor.slugInvalid),
    categorySlug: z.string().min(1, t.editor.categoryRequired),
    tag: z.string(),
    price: z
      .number({ message: t.editor.priceRequired })
      .int()
      .min(1, t.editor.priceRequired)
      .nullable()
      .refine((v) => v != null && v > 0, t.editor.priceRequired),
    sale: z.boolean(),
    oldPrice: z.number().int().nullable(),
    online: z.boolean(),
    outOfStock: z.boolean(),
    status: z.enum(["draft", "published"]),
    sizeGuide: z.string(),
    sizePreset: z.enum(["clothes", "shoes", "one", "custom"]),
    customSizes: z.string(),
    /**
     * Snapshot of the size grid the editor derived from the category when the
     * product loaded with `sizeValues: null` (legacy products); null when the
     * product carried an explicit list. While the grid still matches this
     * snapshot, saves keep sending `sizeValues: null` so the storefront keeps
     * deriving the grid — and the size chart — from the category instead of
     * silently switching to the EU chart (`guide: p.sizeGuide || 'eu'`).
     */
    derivedSizes: z.array(z.string()).nullable(),
    sizes: z.array(
      z.object({
        size: z.string(),
        state: z.enum(["in", "low", "none"]),
        qty: z.number().int().min(0),
      })
    ),
    colors: z.array(
      z.string().regex(/^#[0-9a-fA-F]{6}$/, t.editor.colorHexInvalid)
    ),
    media: z
      .array(z.object({ mediaId: z.string(), thumbUrl: z.string() }))
      .min(1, t.editor.photoRequired),
    i18n: z.object({ ru: langFields, uz: langFields, en: langFields }),
  })
  .superRefine((v, ctx) => {
    if (v.sale && (v.oldPrice == null || v.oldPrice <= (v.price ?? 0))) {
      ctx.addIssue({
        code: "custom",
        path: ["oldPrice"],
        message: t.editor.oldPriceGreater,
      })
    }
  })

export type EditorForm = z.infer<typeof editorSchema>

const emptyLang: ProductI18nFields = {
  name: "",
  color: "",
  material: "",
  desc: "",
}

export function emptyForm(): EditorForm {
  return {
    id: "",
    categorySlug: "",
    tag: "",
    price: null,
    sale: false,
    oldPrice: null,
    online: false,
    outOfStock: false,
    status: "published",
    sizeGuide: "",
    sizePreset: "clothes",
    customSizes: "",
    derivedSizes: null,
    sizes: CLOTHES_SIZES.map((size) => ({
      size,
      state: "in" as const,
      qty: 0,
    })),
    colors: [],
    media: [],
    i18n: { ru: { ...emptyLang }, uz: { ...emptyLang }, en: { ...emptyLang } },
  }
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function detectPreset(sizeValues: string[] | null): SizePreset {
  if (!sizeValues || sizeValues.length === 0) return "one"
  if (sameList(sizeValues, CLOTHES_SIZES)) return "clothes"
  if (sameList(sizeValues, SHOES_SIZES)) return "shoes"
  return "custom"
}

/**
 * Legacy products store `sizeValues: null` — the storefront derives the grid
 * from the category (App.jsx `productOptions`): Обувь → 36–41,
 * Сумки/Аксессуары → ONE SIZE, everything else → XS–XL.
 */
export function categoryDefaultSizes(cat: string): string[] {
  if (cat === "Обувь") return SHOES_SIZES
  if (cat === "Сумки" || cat === "Аксессуары") return []
  return CLOTHES_SIZES
}

/**
 * The size grid the editor shows for a loaded product. When `sizeValues` is
 * null the grid comes from the category exactly as the storefront derives it,
 * plus any per-size rows the product already has — existing availability data
 * must stay visible and editable, never silently dropped.
 */
export function resolveSizeValues(p: AdminProduct): string[] {
  if (p.sizeValues) return p.sizeValues
  const base = categoryDefaultSizes(p.cat)
  const extras = p.sizes
    .map((s) => s.size)
    .filter((size) => !base.includes(size))
  return [...base, ...extras]
}

export function productToForm(p: AdminProduct): EditorForm {
  const sizeValues = resolveSizeValues(p)
  const preset = detectPreset(sizeValues.length > 0 ? sizeValues : null)
  const bySize = new Map(p.sizes.map((s) => [s.size, s]))
  return {
    id: p.id,
    categorySlug: p.categorySlug,
    tag: p.tag ?? "",
    price: p.price,
    sale: p.sale,
    oldPrice: p.oldPrice,
    online: p.online,
    outOfStock: p.outOfStock,
    status: p.status,
    sizeGuide: p.sizeGuide ?? "",
    sizePreset: preset,
    customSizes: preset === "custom" ? sizeValues.join(", ") : "",
    derivedSizes: p.sizeValues == null ? sizeValues : null,
    sizes: sizeValues.map((size) => {
      const s = bySize.get(size)
      const state: SizeState =
        s && !s.available ? "none" : s?.lowStockQty != null ? "low" : "in"
      return { size, state, qty: s?.lowStockQty ?? 0 }
    }),
    colors: p.colorVariants ?? [],
    media: p.mediaIds.map((id, i) => ({
      mediaId: id,
      thumbUrl: p.thumbs[i] ?? "",
    })),
    i18n: {
      ru: { ...emptyLang, ...p.i18n.ru },
      uz: { ...emptyLang, ...p.i18n.uz },
      en: { ...emptyLang, ...p.i18n.en },
    },
  }
}

export function formToPayload(v: EditorForm): ProductPatch {
  const sizeNames = v.sizes.map((s) => s.size)
  // Category-derived grid left untouched → keep `sizeValues: null` so the
  // storefront keeps deriving grid + size chart from the category. Only an
  // explicit preset switch / size-list edit materializes the list.
  const gridStillDerived =
    v.derivedSizes != null && sameList(sizeNames, v.derivedSizes)
  const sizeValues =
    v.sizePreset === "one" || gridStillDerived ? null : sizeNames
  return {
    categorySlug: v.categorySlug,
    price: v.price ?? 0,
    oldPrice: v.sale ? v.oldPrice : null,
    sale: v.sale,
    tag: v.tag === "" ? null : (v.tag as AdminProduct["tag"]),
    online: v.online,
    outOfStock: v.outOfStock,
    status: v.status,
    sizeGuide: v.sizeGuide === "" ? null : v.sizeGuide,
    sizeValues,
    colorVariants: v.colors.length > 0 ? v.colors : null,
    i18n: v.i18n,
    sizes: v.sizes.map((s) => ({
      size: s.size,
      available: s.state !== "none",
      ...(s.state === "low" ? { lowStockQty: s.qty } : {}),
    })),
    mediaIds: v.media.map((m) => m.mediaId),
  }
}

export function presetSizes(
  preset: SizePreset,
  customSizes: string
): string[] {
  switch (preset) {
    case "clothes":
      return CLOTHES_SIZES
    case "shoes":
      return SHOES_SIZES
    case "one":
      return []
    case "custom":
      return customSizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
  }
}
