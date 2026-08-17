import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { PublicCategory } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => apiFetch<PublicCategory[]>("/api/admin/categories"),
    staleTime: 60 * 1000,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<PublicCategory, "sortOrder"> & { sortOrder?: number }) =>
      apiFetch<PublicCategory>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.categories })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      slug,
      patch,
    }: {
      slug: string
      patch: Partial<PublicCategory>
    }) =>
      apiFetch<PublicCategory>(
        `/api/admin/categories/${encodeURIComponent(slug)}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.categories })
      void queryClient.invalidateQueries({ queryKey: qk.products })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) =>
      apiFetch<void>(`/api/admin/categories/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.categories })
    },
  })
}
