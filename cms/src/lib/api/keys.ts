export const qk = {
  me: ["auth", "me"] as const,
  products: ["products"] as const,
  product: (id: string) => ["products", id] as const,
  categories: ["categories"] as const,
  media: (page: number) => ["media", page] as const,
  mediaLookup: (key: string) => ["media", "lookup", key] as const,
  mediaAll: ["media"] as const,
  pages: ["pages"] as const,
  uiStrings: ["ui-strings"] as const,
  settings: ["settings"] as const,
}
