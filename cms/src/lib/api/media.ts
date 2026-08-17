import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { MediaAssetDto } from "./types"
import { apiFetch, uploadFiles } from "./client"
import { qk } from "./keys"

export interface MediaPage {
  items: MediaAssetDto[]
  total: number
}

export const MEDIA_PAGE_SIZE = 48

export function useMedia(page: number) {
  return useQuery({
    queryKey: qk.media(page),
    queryFn: () =>
      apiFetch<MediaPage>(
        `/api/admin/media?page=${page}&limit=${MEDIA_PAGE_SIZE}`
      ),
  })
}

/**
 * Resolves specific asset ids (hero slides) to full DTOs. There is no
 * `GET /media/:id`, so this pulls one large page and indexes it — the UMA
 * library is small, and hero references always live in it.
 */
export function useMediaLookup(ids: string[]) {
  const key = [...ids].sort().join(",")
  return useQuery({
    queryKey: qk.mediaLookup(key),
    enabled: ids.length > 0,
    queryFn: async () => {
      const page = await apiFetch<MediaPage>("/api/admin/media?page=1&limit=1000")
      const byId = new Map(page.items.map((a) => [a.id, a]))
      return ids
        .map((id) => byId.get(id))
        .filter((a): a is MediaAssetDto => a !== undefined)
    },
  })
}

export function uploadMedia(
  files: File[],
  onProgress: (percent: number) => void
) {
  return uploadFiles<MediaAssetDto[]>("/api/admin/media", files, onProgress)
}

export function useUpdateMediaAlt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) =>
      apiFetch<MediaAssetDto>(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ alt }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mediaAll })
    },
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.mediaAll })
    },
  })
}
