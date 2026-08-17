import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { MediaAssetDto, MediaKind } from "@/lib/api/types"
import { MEDIA_PAGE_SIZE, useMedia } from "@/lib/api/media"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { DataState, EmptyState } from "@/components/shared/data-state"
import {
  IMAGE_ACCEPT,
  UploadDropzone,
  VIDEO_ACCEPT,
} from "./upload-dropzone"
import { useUploads } from "./use-uploads"
import { VideoTileContent } from "./video-tile"

export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  excludeIds = [],
  kind,
  multiple = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (assets: MediaAssetDto[]) => void
  excludeIds?: string[]
  /** Restrict the library and the inline upload to one media kind. */
  kind?: MediaKind
  /** false → picking replaces the selection (single slot). */
  multiple?: boolean
}) {
  const [page, setPage] = React.useState(1)
  const media = useMedia(page)
  const [selected, setSelected] = React.useState<Map<string, MediaAssetDto>>(
    new Map()
  )
  const { uploads, addFiles, retry, dismiss, clearDone } = useUploads(
    (assets) => {
      const usable = assets.filter((a) => kind === undefined || a.kind === kind)
      if (usable.length === 0) return
      setSelected((prev) => {
        const next = multiple ? new Map(prev) : new Map<string, MediaAssetDto>()
        const list = multiple ? usable : usable.slice(0, 1)
        list.forEach((a) => next.set(a.id, a))
        return next
      })
    }
  )

  const items = (media.data?.items ?? []).filter(
    (a) =>
      !excludeIds.includes(a.id) && (kind === undefined || a.kind === kind)
  )
  const pageCount = Math.max(
    1,
    Math.ceil((media.data?.total ?? 0) / MEDIA_PAGE_SIZE)
  )

  const toggle = (a: MediaAssetDto) => {
    setSelected((prev) => {
      if (!multiple) {
        return prev.has(a.id)
          ? new Map<string, MediaAssetDto>()
          : new Map([[a.id, a]])
      }
      const next = new Map(prev)
      if (next.has(a.id)) next.delete(a.id)
      else next.set(a.id, a)
      return next
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(new Map())
      clearDone()
    }
    onOpenChange(next)
  }

  const confirm = () => {
    onPick([...selected.values()])
    handleOpenChange(false)
  }

  const title = kind === "video" ? t.media.pickerTitleVideo : t.media.pickerTitle
  const confirmLabel = multiple ? t.media.pickerConfirm : t.media.pickerConfirmOne

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <UploadDropzone
            compact
            uploads={uploads}
            onFiles={addFiles}
            onRetry={retry}
            onDismiss={dismiss}
            accept={kind === "video" ? VIDEO_ACCEPT : IMAGE_ACCEPT}
            formatsHint={
              kind === "video"
                ? t.media.dropFormatsVideo
                : t.media.dropFormatsImages
            }
          />
          <ScrollArea className="h-80">
            <DataState
              isLoading={media.isPending}
              isError={media.isError}
              onRetry={() => void media.refetch()}
              isEmpty={items.length === 0}
              skeleton={<PickerSkeleton />}
              empty={
                <EmptyState
                  title={t.media.emptyTitle}
                  description={t.media.dropHint}
                />
              }
            >
              <div className="grid grid-cols-4 gap-2 pr-3 sm:grid-cols-6">
                {items.map((a) => {
                  const isSelected = selected.has(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        isSelected && "border-primary ring-2 ring-primary/40"
                      )}
                      aria-pressed={isSelected}
                      aria-label={a.alt ?? a.originalName}
                      onClick={() => toggle(a)}
                    >
                      {a.kind === "video" ? (
                        <VideoTileContent name={a.originalName} />
                      ) : (
                        <img
                          src={a.thumbUrl ?? a.url}
                          alt={a.alt ?? a.originalName}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {isSelected ? (
                        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-3.5" />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </DataState>
          </ScrollArea>
          {pageCount > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">
                {t.products.pageOf(page, pageCount)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t.products.prevPage}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                {t.products.nextPage}
              </Button>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button disabled={selected.size === 0} onClick={confirm}>
            {confirmLabel}
            {multiple && selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PickerSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2 pr-3 sm:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}
