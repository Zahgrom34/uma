import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { CommerceSettings, HeroSettings, SocialLink } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

/**
 * `GET /api/admin/settings` — commerce, socialLinks and hero are editable,
 * contact is carried through untouched.
 */
export interface AdminSettings {
  commerce: CommerceSettings
  contact: unknown
  socialLinks: SocialLink[]
  /** Absent/undefined when never set; explicit null deletes the stored hero. */
  hero?: HeroSettings | null
}

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () => apiFetch<AdminSettings>("/api/admin/settings"),
  })
}

/**
 * PUT is read-modify-write: the caller sends the full loaded settings object
 * with only its own card changed, so the other keys are preserved.
 */
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AdminSettings) =>
      apiFetch<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.settings })
    },
  })
}
