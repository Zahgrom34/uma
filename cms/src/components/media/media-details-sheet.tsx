import * as React from "react"
import { Link } from "react-router"
import { LinkIcon, Trash2Icon } from "lucide-react"

import type { MediaAssetDto } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useDeleteMedia, useUpdateMediaAlt } from "@/lib/api/media"
import { useProducts } from "@/lib/api/products"
import { formatBytes, formatDate } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "@/components/ui/toast"

export function MediaDetailsSheet({
  asset,
  onOpenChange,
}: {
  asset: MediaAssetDto | null
  onOpenChange: (open: boolean) => void
}) {
  const updateAlt = useUpdateMediaAlt()
  const deleteMedia = useDeleteMedia()
  const products = useProducts()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  if (!asset) return null

  const usedBy = (products.data ?? []).filter((p) =>
    asset.usedByProductIds.includes(p.id)
  )
  const isUsed = asset.usedByProductIds.length > 0 || asset.usedByHero
  const usageHint = asset.usedByHero
    ? t.media.usedInHero
    : t.media.deleteBlocked

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      new URL(asset.url, window.location.origin).href
    )
    toast.add({ type: "success", title: t.toasts.copied })
  }

  const saveAlt = (alt: string) => {
    if (alt === (asset.alt ?? "")) return
    updateAlt.mutate(
      { id: asset.id, alt },
      {
        onSuccess: () => toast.add({ type: "success", title: t.toasts.saved }),
        onError: () =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: t.toasts.saveFailedDesc,
          }),
      }
    )
  }

  const confirmDelete = () => {
    deleteMedia.mutate(asset.id, {
      onSuccess: () => {
        toast.add({ type: "success", title: t.toasts.deleted })
        onOpenChange(false)
      },
      onError: (err) =>
        toast.add({
          type: "error",
          title: t.toasts.deleteFailed,
          description:
            err instanceof ApiError && err.status === 409 && err.message
              ? err.message
              : t.media.deleteBlocked,
        }),
    })
    setConfirmOpen(false)
  }

  return (
    <Sheet open={asset !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate">{asset.originalName}</SheetTitle>
          <SheetDescription className="sr-only">
            {t.media.details}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          {asset.kind === "video" ? (
            <video
              src={asset.url}
              muted
              controls
              className="max-h-72 w-full rounded-lg border bg-muted"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.alt ?? asset.originalName}
              className="max-h-72 w-full rounded-lg border object-contain"
            />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {asset.width != null && asset.height != null ? (
              <>
                <dt className="text-muted-foreground">{t.media.dimensions}</dt>
                <dd className="tabular-nums">
                  {asset.width} × {asset.height}
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">{t.media.fileSize}</dt>
            <dd className="tabular-nums">{formatBytes(asset.sizeBytes)}</dd>
            <dt className="text-muted-foreground">{t.media.uploadedAt}</dt>
            <dd className="tabular-nums">{formatDate(asset.createdAt)}</dd>
          </dl>
          <AltField
            key={asset.id}
            initial={asset.alt ?? ""}
            onSave={saveAlt}
          />
          <Separator />
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t.media.usedIn}</h3>
            {asset.usedByHero ? (
              <p className="text-sm">
                <Link
                  to="/home-page"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {t.media.usedInHero}
                </Link>
              </p>
            ) : null}
            {asset.usedByProductIds.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {(usedBy.length > 0
                  ? usedBy.map((p) => ({ id: p.id, name: p.i18n.ru.name }))
                  : asset.usedByProductIds.map((id) => ({ id, name: id }))
                ).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/products/${p.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {!isUsed ? (
              <p className="text-sm text-muted-foreground">
                {t.media.usedNowhere}
              </p>
            ) : null}
          </div>
        </div>
        <SheetFooter className="flex-row justify-between">
          <Button variant="outline" size="sm" onClick={() => void copyLink()}>
            <LinkIcon data-icon="inline-start" />
            {t.media.copyLink}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isUsed}
            title={isUsed ? usageHint : undefined}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            {t.common.delete}
          </Button>
        </SheetFooter>
        {isUsed ? (
          <p className="px-4 pb-4 text-right text-xs text-muted-foreground">
            {usageHint}
          </p>
        ) : null}
      </SheetContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.media.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {asset.originalName}. {t.media.deleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

function AltField({
  initial,
  onSave,
}: {
  initial: string
  onSave: (alt: string) => void
}) {
  const [alt, setAlt] = React.useState(initial)
  return (
    <Field>
      <FieldLabel htmlFor="media-alt">{t.media.altLabel}</FieldLabel>
      <Input
        id="media-alt"
        value={alt}
        placeholder={t.media.altPlaceholder}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={() => onSave(alt)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(alt)
        }}
      />
    </Field>
  )
}
