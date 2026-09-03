import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { BillzShop, BillzSyncReport, BillzTestResult } from "./types"
import { apiFetch } from "./client"
import { qk } from "./keys"

/** `GET /api/admin/billz/status` — last persisted sync report, null before the first run. */
export function useBillzStatus() {
  return useQuery({
    queryKey: qk.billzStatus,
    queryFn: () =>
      apiFetch<BillzSyncReport | null>("/api/admin/billz/status"),
  })
}

/**
 * `GET /api/admin/billz/shops` — real shop names for the settings checkboxes.
 * Enabled only once a secret token is stored; a failure here is expected
 * (bad token, Billz down) and the card renders a muted line, not an error.
 */
export function useBillzShops(enabled: boolean) {
  return useQuery({
    queryKey: qk.billzShops,
    queryFn: () => apiFetch<BillzShop[]>("/api/admin/billz/shops"),
    enabled,
    retry: false,
  })
}

/** `POST /api/admin/billz/test` — credential check, returns the Billz row count. */
export function useBillzTest() {
  return useMutation({
    mutationFn: () =>
      apiFetch<BillzTestResult>("/api/admin/billz/test", { method: "POST" }),
  })
}

/**
 * `POST /api/admin/billz/sync` — runs the sync inline and returns the report.
 * The report becomes the new status, and products are refetched because the
 * sync rewrites prices and per-size availability.
 */
export function useBillzSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<BillzSyncReport>("/api/admin/billz/sync", { method: "POST" }),
    onSuccess: (report) => {
      queryClient.setQueryData(qk.billzStatus, report)
      void queryClient.invalidateQueries({ queryKey: qk.products })
    },
  })
}
