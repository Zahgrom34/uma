import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { PublicPage } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

export function usePages() {
  return useQuery({
    queryKey: qk.pages,
    queryFn: () => apiFetch<PublicPage[]>("/api/admin/pages"),
  })
}

export function useSavePage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, i18n }: PublicPage) =>
      apiFetch<PublicPage>(`/api/admin/pages/${encodeURIComponent(slug)}`, {
        method: "PUT",
        // Wire shape is FLAT {ru, uz, en} per contract §3 — no `i18n` wrapper.
        body: JSON.stringify(i18n),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.pages })
    },
  })
}
