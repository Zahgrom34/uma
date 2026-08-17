import * as React from "react"

import type { MediaAssetDto, MediaKind } from "@/lib/api/types"
import { MEDIA_PAGE_SIZE, useMedia } from "@/lib/api/media"
import { countNoun } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataState, EmptyState } from "@/components/shared/data-state"
import { MediaDetailsSheet } from "@/components/media/media-details-sheet"
import {
  IMAGE_ACCEPT,
  UploadDropzone,
  VIDEO_ACCEPT,
} from "@/components/media/upload-dropzone"
import { useUploads } from "@/components/media/use-uploads"
import { VideoTileContent } from "@/components/media/video-tile"

type KindFilter = "all" | MediaKind

export function MediaPage() {
  const [page, setPage] = React.useState(1)
  const [filter, setFilter] = React.useState<KindFilter>("all")
  const media = useMedia(page)
  const { uploads, addFiles, retry, dismiss } = useUploads()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const pageItems = media.data?.items ?? []
  const items =
    filter === "all" ? pageItems : pageItems.filter((a) => a.kind === filter)
  const total = media.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE))
  const selected: MediaAssetDto | null =
    pageItems.find((a) => a.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold">{t.media.title}</h1>
          {media.data ? (
            <span className="text-sm text-muted-foreground">
              {countNoun(total, t.media.countForms)}
            </span>
          ) : null}
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as KindFilter)}
          className="ml-auto"
        >
          <TabsList>
            <TabsTrigger value="all">{t.media.filterAll}</TabsTrigger>
            <TabsTrigger value="image">{t.media.filterImages}</TabsTrigger>
            <TabsTrigger value="video">{t.media.filterVideos}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <UploadDropzone
        uploads={uploads}
        onFiles={addFiles}
        onRetry={retry}
        onDismiss={dismiss}
        accept={`${IMAGE_ACCEPT},${VIDEO_ACCEPT}`}
        formatsHint={t.media.dropFormats}
      />

      <DataState
        isLoading={media.isPending}
        isError={media.isError}
        onRetry={() => void media.refetch()}
        isEmpty={items.length === 0}
        skeleton={<MediaSkeleton />}
        empty={
          filter === "all" ? (
            <EmptyState
              title={t.media.emptyTitle}
              description={t.media.emptyDesc}
            />
          ) : (
            <EmptyState
              title={t.media.filteredEmptyTitle}
              description={t.media.filteredEmptyDesc}
            />
          )
        }
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((a) => (
            <button
              key={a.id}
              type="button"
              className="group relative aspect-square overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={a.alt ?? a.originalName}
              onClick={() => setSelectedId(a.id)}
            >
              {a.kind === "video" ? (
                <VideoTileContent name={a.originalName} />
              ) : (
                <>
                  <img
                    src={a.thumbUrl ?? a.url}
                    alt={a.alt ?? a.originalName}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {a.originalName}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

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
      </DataState>

      <MediaDetailsSheet
        asset={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )
}

function MediaSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}
