import * as React from "react"

import type { BillzSettings, BillzSyncReport } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { qk } from "@/lib/api/keys"
import {
  useBillzShops,
  useBillzStatus,
  useBillzSync,
  useBillzTest,
} from "@/lib/api/billz"
import { useSaveSettings, type AdminSettings } from "@/lib/api/settings"
import { countNoun, formatDate } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { DataState } from "@/components/shared/data-state"

const NBSP = " "

const EMPTY_BILLZ: BillzSettings = {
  secretKey: "",
  secretKeySet: false,
  shopIds: [],
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

function saveErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return t.toasts.saveFailedDesc
}

/** Server sends actionable Russian messages for 400/409/502 — surface them. */
function actionErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message
  return t.billz.networkDesc
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${formatDate(d)} ${hh}:${mm}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return t.billz.underSecond
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}${NBSP}${t.billz.secShort}`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec > 0
    ? `${min}${NBSP}${t.billz.minShort} ${sec}${NBSP}${t.billz.secShort}`
    : `${min}${NBSP}${t.billz.minShort}`
}

export function BillzCard({ settings }: { settings: AdminSettings }) {
  const queryClient = useQueryClient()
  const saveSettings = useSaveSettings()
  const status = useBillzStatus()
  const test = useBillzTest()
  const sync = useBillzSync()

  const billz = settings.billz ?? EMPTY_BILLZ
  const shops = useBillzShops(billz.secretKeySet)
  const [secret, setSecret] = React.useState("")
  const [shopIds, setShopIds] = React.useState<string[]>(billz.shopIds)

  const toggleShop = (id: string, checked: boolean) =>
    setShopIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    )

  const dirty = secret !== "" || !sameIds(shopIds, billz.shopIds)

  const saving = saveSettings.isPending
  const actionPending = test.isPending || sync.isPending

  const save = () => {
    saveSettings.mutate(
      {
        ...settings,
        billz: {
          secretKey: secret,
          secretKeySet: billz.secretKeySet,
          shopIds,
        },
      },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          setSecret("")
          // A fresh token may unlock (or fix) the shop list — refetch it.
          void queryClient.invalidateQueries({ queryKey: qk.billzShops })
        },
        onError: (err) =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: saveErrorDescription(err),
          }),
      }
    )
  }

  const runTest = () =>
    test.mutate(undefined, {
      onSuccess: (result) =>
        toast.add({
          type: "success",
          title: t.billz.testOk,
          description: t.billz.testOkDesc(
            countNoun(result.rows, t.billz.rowForms)
          ),
        }),
      onError: (err) =>
        toast.add({
          type: "error",
          title: t.billz.testFailed,
          description: actionErrorDescription(err),
        }),
    })

  const runSync = () =>
    sync.mutate(undefined, {
      onSuccess: (report) => {
        if (report.error) {
          toast.add({
            type: "error",
            title: t.billz.syncFailed,
            description: report.error,
          })
        } else {
          toast.add({
            type: "success",
            title: t.billz.syncDone,
            description: t.billz.syncDoneDesc(
              report.matchedProducts,
              report.updatedProducts
            ),
          })
        }
      },
      onError: (err) =>
        toast.add({
          type: "error",
          title: t.billz.syncFailed,
          description: actionErrorDescription(err),
        }),
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.billz.card}</CardTitle>
        <CardDescription>{t.billz.desc}</CardDescription>
        <p className="text-sm text-muted-foreground">{t.billz.credsHint}</p>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="billz-secret">
              {t.billz.secretKey}
            </FieldLabel>
            <Input
              id="billz-secret"
              type="password"
              autoComplete="new-password"
              placeholder={
                billz.secretKeySet
                  ? t.billz.secretKeyStoredPlaceholder
                  : undefined
              }
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </Field>
          <FieldSet>
            <FieldLegend variant="label">{t.billz.shops}</FieldLegend>
            {!billz.secretKeySet ? (
              <p className="text-sm text-muted-foreground">
                {t.billz.shopsNoToken}
              </p>
            ) : shops.isPending ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
            ) : shops.isError || !shops.data ? (
              <p className="text-sm text-muted-foreground">
                {t.billz.shopsUnavailable}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {shops.data.map((shop) => (
                    <Field
                      key={shop.id}
                      orientation="horizontal"
                      className="w-auto"
                    >
                      <Checkbox
                        id={`billz-shop-${shop.id}`}
                        checked={shopIds.includes(shop.id)}
                        onCheckedChange={(checked) =>
                          toggleShop(shop.id, checked === true)
                        }
                      />
                      <FieldLabel
                        htmlFor={`billz-shop-${shop.id}`}
                        className="font-normal"
                      >
                        {shop.name}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
                <FieldDescription>{t.billz.shopsHint}</FieldDescription>
              </>
            )}
          </FieldSet>
        </FieldGroup>

        <Separator className="my-6" />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={actionPending}
            onClick={runTest}
          >
            {test.isPending ? <Spinner data-icon="inline-start" /> : null}
            {t.billz.test}
          </Button>
          <Button type="button" disabled={actionPending} onClick={runSync}>
            {sync.isPending ? <Spinner data-icon="inline-start" /> : null}
            {t.billz.sync}
          </Button>
        </div>

        <div className="mt-6">
          <DataState
            isLoading={status.isPending}
            isError={status.isError}
            onRetry={() => void status.refetch()}
            skeleton={<Skeleton className="h-10 rounded-md" />}
          >
            {status.data ? (
              <SyncSummary report={status.data} />
            ) : (
              <p className="text-sm text-muted-foreground">{t.billz.never}</p>
            )}
          </DataState>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving ? t.common.saving : t.common.save}
        </Button>
      </CardFooter>
    </Card>
  )
}

function SyncSummary({ report }: { report: BillzSyncReport }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground">{t.billz.lastRun}</span>
        <span className="tabular-nums">
          {formatDateTime(report.startedAt)}
          {" · "}
          {formatDuration(report.durationMs)}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground">{t.billz.matched}</span>
        <span className="tabular-nums">{report.matchedProducts}</span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground">{t.billz.updated}</span>
        <span className="tabular-nums">{report.updatedProducts}</span>
      </div>
      {report.unmatchedSkus.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">{t.billz.unmatched}</span>
          <span className="break-words font-mono text-xs">
            {report.unmatchedSkus.join(", ")}
          </span>
        </div>
      ) : null}
      {report.warnings.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">
            {t.billz.warningsLabel}
          </span>
          <ul className="flex flex-col gap-1">
            {report.warnings.map((w, i) => (
              <li key={i} className="break-words text-xs">
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.error ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">{t.billz.errorLabel}</span>
          <span className="break-words text-destructive">{report.error}</span>
        </div>
      ) : null}
    </div>
  )
}
