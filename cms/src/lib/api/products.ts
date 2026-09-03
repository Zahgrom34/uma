import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { AdminProduct } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

export function useProducts() {
  return useQuery({
    queryKey: qk.products,
    queryFn: () => apiFetch<AdminProduct[]>("/api/admin/products"),
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: qk.product(id ?? ""),
    queryFn: () =>
      apiFetch<AdminProduct>(`/api/admin/products/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
  })
}

export type ProductPatch = Partial<
  Pick<
    AdminProduct,
    | "categorySlug"
    | "price"
    | "oldPrice"
    | "sale"
    | "tag"
    | "online"
    | "outOfStock"
    | "billzSku"
    | "stock"
    | "sizeGuide"
    | "sizeValues"
    | "colorVariants"
    | "status"
    | "i18n"
    | "sizes"
    | "mediaIds"
  >
>

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProductPatch & { id: string }) =>
      apiFetch<AdminProduct>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.products })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProductPatch }) =>
      apiFetch<AdminProduct>(
        `/api/admin/products/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.product(updated.id), updated)
      void queryClient.invalidateQueries({ queryKey: qk.products, exact: true })
    },
  })
}

/** Optimistic patch of list rows (sale toggle, hide/show, bulk sale). Rolls back on error. */
export function useOptimisticListPatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: ProductPatch }) =>
      Promise.all(
        ids.map((id) =>
          apiFetch<AdminProduct>(
            `/api/admin/products/${encodeURIComponent(id)}`,
            { method: "PATCH", body: JSON.stringify(patch) }
          )
        )
      ),
    onMutate: async ({ ids, patch }) => {
      await queryClient.cancelQueries({ queryKey: qk.products, exact: true })
      const previous = queryClient.getQueryData<AdminProduct[]>(qk.products)
      if (previous) {
        queryClient.setQueryData<AdminProduct[]>(
          qk.products,
          previous.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p))
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.products, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.products, exact: true })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.products })
    },
  })
}
