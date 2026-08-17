import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { UiStringDto } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

export function useUiStrings() {
  return useQuery({
    queryKey: qk.uiStrings,
    queryFn: () => apiFetch<UiStringDto[]>("/api/admin/ui-strings"),
  })
}

/** Optimistic single-cell save; rolls back the cell on failure. */
export function useSaveUiStrings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: UiStringDto[]) =>
      apiFetch<void>("/api/admin/ui-strings", {
        method: "PUT",
        body: JSON.stringify(rows),
      }),
    onMutate: async (rows) => {
      await queryClient.cancelQueries({ queryKey: qk.uiStrings })
      const previous = queryClient.getQueryData<UiStringDto[]>(qk.uiStrings)
      if (previous) {
        const byKey = new Map(rows.map((r) => [r.key, r]))
        queryClient.setQueryData<UiStringDto[]>(
          qk.uiStrings,
          previous.map((r) => byKey.get(r.key) ?? r)
        )
      }
      return { previous }
    },
    onError: (_err, _rows, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk.uiStrings, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.uiStrings })
    },
  })
}
