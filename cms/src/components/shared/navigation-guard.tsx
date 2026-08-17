import * as React from "react"
import { useNavigate } from "react-router"

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
import { GuardContext } from "./navigation-guard-context"

/**
 * Dirty-navigation guard for declarative-mode react-router (no useBlocker
 * there): intercepts internal anchor clicks in capture phase and guards
 * programmatic navigation + tab close.
 */
export function NavigationGuardProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const guardRef = React.useRef<(() => boolean) | null>(null)
  const [pendingPath, setPendingPath] = React.useState<string | null>(null)

  const register = React.useCallback(
    (isDirty: (() => boolean) | null) => {
      guardRef.current = isDirty
    },
    []
  )

  const guardedNavigate = React.useCallback(
    (to: string) => {
      if (guardRef.current?.()) {
        setPendingPath(to)
      } else {
        navigate(to)
      }
    },
    [navigate]
  )

  React.useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "")

    const onClickCapture = (e: MouseEvent) => {
      if (!guardRef.current?.()) return
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement).closest?.("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.origin !== window.location.origin) return
      e.preventDefault()
      e.stopPropagation()
      const path =
        anchor.pathname.startsWith(base) && base
          ? anchor.pathname.slice(base.length) || "/"
          : anchor.pathname
      setPendingPath(path + anchor.search)
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (guardRef.current?.()) {
        e.preventDefault()
      }
    }

    document.addEventListener("click", onClickCapture, true)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("click", onClickCapture, true)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [])

  const value = React.useMemo(
    () => ({ register, guardedNavigate }),
    [register, guardedNavigate]
  )

  return (
    <GuardContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pendingPath !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPath(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.editor.dirtyTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.editor.dirtyDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.editor.dirtyStay}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const to = pendingPath
                setPendingPath(null)
                guardRef.current = null
                if (to) navigate(to)
              }}
            >
              {t.editor.dirtyLeave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GuardContext.Provider>
  )
}

