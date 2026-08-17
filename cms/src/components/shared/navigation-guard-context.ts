import * as React from "react"

export interface GuardContextValue {
  /** Editor registers a fn returning true while it has unsaved changes. */
  register: (isDirty: (() => boolean) | null) => void
  /** Programmatic navigation that respects the guard (palette, menus). */
  guardedNavigate: (to: string) => void
}

export const GuardContext = React.createContext<GuardContextValue | null>(null)

export function useNavigationGuardContext() {
  const ctx = React.useContext(GuardContext)
  if (!ctx) {
    throw new Error(
      "useNavigationGuardContext must be used within NavigationGuardProvider"
    )
  }
  return ctx
}

/** Register/unregister a dirty check for the lifetime of an editor screen. */
export function useDirtyGuard(isDirty: () => boolean) {
  const { register } = useNavigationGuardContext()
  const ref = React.useRef(isDirty)
  React.useEffect(() => {
    ref.current = isDirty
  })
  React.useEffect(() => {
    register(() => ref.current())
    return () => register(null)
  }, [register])
}
