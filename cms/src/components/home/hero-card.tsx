import * as React from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FilmIcon,
  ImagePlusIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"

import type { MediaAssetDto, MediaKind } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { useMediaLookup } from "@/lib/api/media"
import { useSaveSettings, type AdminSettings } from "@/lib/api/settings"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { DataState } from "@/components/shared/data-state"
import { MediaPickerDialog } from "@/components/media/media-picker-dialog"
import type { CardController } from "./card-controller"

function saveErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return t.toasts.saveFailedDesc
}

export function HeroCard({
  settings,
  register,
}: {
  settings: AdminSettings
  register: (c: CardController | null) => void
}) {
  const saveSettings = useSaveSettings()
  const heroIds = React.useMemo(
    () => (settings.hero?.slides ?? []).map((s) => s.mediaId),
    [settings.hero]
  )
  const lookup = useMediaLookup(heroIds)

  const [mode, setMode] = React.useState<MediaKind>("video")
  const [videoSlot, setVideoSlot] = React.useState<MediaAssetDto | null>(null)
  const [photos, setPhotos] = React.useState<MediaAssetDto[]>([])
  const [initialSig, setInitialSig] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // One-time init from the stored hero once its assets resolve.
  React.useEffect(() => {
    if (initialSig !== null) return
    if (heroIds.length === 0) {
      setInitialSig("")
      return
    }
    if (!lookup.data) return
    const assets = lookup.data
    if (assets[0]?.kind === "video") {
      setMode("video")
      setVideoSlot(assets[0])
    } else {
      setMode("image")
      setPhotos(assets.slice(0, 3))
    }
    setInitialSig(assets.map((a) => a.id).join(","))
  }, [initialSig, heroIds, lookup.data])

  const current = mode === "video" ? (videoSlot ? [videoSlot] : []) : photos
  const currentSig = current.map((a) => a.id).join(",")
  const dirty = initialSig !== null && currentSig !== initialSig
  const saving = saveSettings.isPending

  const save = React.useCallback(() => {
    if (initialSig === null) return
    const ids = current.map((a) => a.id)
    saveSettings.mutate(
      {
        ...settings,
        hero: ids.length > 0 ? { slides: ids.map((mediaId) => ({ mediaId })) } : null,
      },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          setInitialSig(ids.join(","))
        },
        onError: (err) =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: saveErrorDescription(err),
          }),
      }
    )
  }, [current, initialSig, saveSettings, settings])

  React.useEffect(() => {
    register({ isDirty: () => dirty && !saving, save })
    return () => register(null)
  }, [register, dirty, saving, save])

  const movePhoto = (index: number, delta: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })
  }

  const loadingAssets = heroIds.length > 0 && initialSig === null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.home.bannerCard}</CardTitle>
        <CardDescription>{t.home.bannerDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataState
          isLoading={loadingAssets && lookup.isPending}
          isError={loadingAssets && lookup.isError}
          onRetry={() => void lookup.refetch()}
          skeleton={<Skeleton className="h-48 rounded-lg" />}
        >
          <div className="flex flex-col gap-4">
            <ToggleGroup
              value={[mode]}
              onValueChange={(groupValue) => {
                const next = (groupValue as string[])[0]
                if (next) setMode(next as MediaKind)
              }}
            >
              <ToggleGroupItem value="video">{t.home.modeVideo}</ToggleGroupItem>
              <ToggleGroupItem value="image">{t.home.modePhotos}</ToggleGroupItem>
            </ToggleGroup>

            {current.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                {t.home.emptyHint}
              </p>
            ) : null}

            {mode === "video" ? (
              <div className="flex flex-col gap-3">
                {videoSlot ? (
                  <>
                    <video
                      key={videoSlot.id}
                      src={videoSlot.url}
                      muted
                      controls
                      className="max-h-64 w-full rounded-lg border bg-muted"
                    />
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {videoSlot.originalName}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPickerOpen(true)}
                      >
                        <RefreshCwIcon data-icon="inline-start" />
                        {t.home.replaceVideo}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVideoSlot(null)}
                      >
                        <XIcon data-icon="inline-start" />
                        {t.home.slotRemove}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() => setPickerOpen(true)}
                  >
                    <FilmIcon data-icon="inline-start" />
                    {t.home.pickVideo}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {t.home.videoHint}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {photos.length > 0 ? (
                  <ul className="flex flex-col divide-y rounded-lg border">
                    {photos.map((a, index) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <img
                          src={a.thumbUrl ?? a.url}
                          alt={a.alt ?? a.originalName}
                          className="size-14 shrink-0 rounded-md border object-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {a.originalName}
                        </span>
                        <span className="flex shrink-0 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t.home.moveUp}
                            disabled={index === 0}
                            onClick={() => movePhoto(index, -1)}
                          >
                            <ChevronUpIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t.home.moveDown}
                            disabled={index === photos.length - 1}
                            onClick={() => movePhoto(index, 1)}
                          >
                            <ChevronDownIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t.home.slotRemove}
                            onClick={() =>
                              setPhotos((prev) =>
                                prev.filter((p) => p.id !== a.id)
                              )
                            }
                          >
                            <XIcon />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {photos.length < 3 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() => setPickerOpen(true)}
                  >
                    <ImagePlusIcon data-icon="inline-start" />
                    {t.home.addPhoto}
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t.home.photosHint}
                </p>
              </div>
            )}
          </div>
        </DataState>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          disabled={!dirty || saving || initialSig === null}
          onClick={save}
        >
          {saving ? t.common.saving : t.common.save}
        </Button>
      </CardFooter>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        kind={mode === "video" ? "video" : "image"}
        multiple={mode !== "video"}
        excludeIds={mode === "video" ? [] : photos.map((a) => a.id)}
        onPick={(assets) => {
          if (mode === "video") {
            const video = assets.find((a) => a.kind === "video")
            if (video) setVideoSlot(video)
          } else {
            const images = assets.filter((a) => a.kind === "image")
            setPhotos((prev) => [...prev, ...images].slice(0, 3))
          }
        }}
      />
    </Card>
  )
}
