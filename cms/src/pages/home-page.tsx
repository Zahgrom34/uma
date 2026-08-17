import * as React from "react"

import { useSettings } from "@/lib/api/settings"
import { useUiStrings } from "@/lib/api/ui-strings"
import { t } from "@/lib/i18n/ru"
import { Skeleton } from "@/components/ui/skeleton"
import { DataState } from "@/components/shared/data-state"
import { useDirtyGuard } from "@/components/shared/navigation-guard-context"
import type { CardController } from "@/components/home/card-controller"
import { HeroCard } from "@/components/home/hero-card"
import { OverlayCard } from "@/components/home/overlay-card"

export function HomePageEditorPage() {
  const settings = useSettings()
  const uiStrings = useUiStrings()

  const heroCtrl = React.useRef<CardController | null>(null)
  const overlayCtrl = React.useRef<CardController | null>(null)

  const registerHero = React.useCallback((c: CardController | null) => {
    heroCtrl.current = c
  }, [])
  const registerOverlay = React.useCallback((c: CardController | null) => {
    overlayCtrl.current = c
  }, [])

  useDirtyGuard(
    () =>
      Boolean(heroCtrl.current?.isDirty()) ||
      Boolean(overlayCtrl.current?.isDirty())
  )

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (heroCtrl.current?.isDirty()) heroCtrl.current.save()
        if (overlayCtrl.current?.isDirty()) overlayCtrl.current.save()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const isLoading = settings.isPending || uiStrings.isPending
  const isError = settings.isError || uiStrings.isError

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-semibold">{t.home.title}</h1>
      <DataState
        isLoading={isLoading}
        isError={!isLoading && isError}
        onRetry={() => {
          if (settings.isError) void settings.refetch()
          if (uiStrings.isError) void uiStrings.refetch()
        }}
        skeleton={<HomePageSkeleton />}
      >
        {settings.data && uiStrings.data ? (
          <div className="flex flex-col gap-6">
            <HeroCard settings={settings.data} register={registerHero} />
            <OverlayCard rows={uiStrings.data} register={registerOverlay} />
          </div>
        ) : null}
      </DataState>
    </div>
  )
}

function HomePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
