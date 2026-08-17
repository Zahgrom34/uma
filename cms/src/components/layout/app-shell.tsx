import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import { SearchIcon } from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { useMe } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { AppBreadcrumbs } from "./app-breadcrumbs"
import { AppSidebar } from "./app-sidebar"
import { NavigationGuardProvider } from "@/components/shared/navigation-guard"
import { CommandPalette } from "./command-palette"

export function AppShell() {
  const location = useLocation()
  const me = useMe()
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  if (me.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  if (me.isError) {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?from=${from}`} replace />
  }

  return (
    <NavigationGuardProvider>
      <SidebarProvider>
      <AppSidebar />
      {/* min-w-0: без него flex-элемент растягивается под широкую таблицу и вся страница скроллится горизонтально */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4!" />
          <AppBreadcrumbs />
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
            >
              <SearchIcon data-icon="inline-start" />
              {t.common.search}
              <kbd className="ml-2 rounded border bg-muted px-1 font-sans text-[10px] text-muted-foreground">
                {t.palette.hint}
              </kbd>
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-6">
          <Outlet />
        </main>
      </SidebarInset>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </SidebarProvider>
    </NavigationGuardProvider>
  )
}
