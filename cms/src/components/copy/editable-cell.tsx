import * as React from "react"

import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n/ru"

/**
 * Inline-editable table cell: click or Enter to edit; Enter saves,
 * Esc discards, Tab saves and lets focus move on.
 */
export function EditableCell({
  value,
  onSave,
  ariaLabel,
}: {
  value: string
  onSave: (next: string) => void
  ariaLabel: string
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const cancelledRef = React.useRef(false)

  const start = () => {
    setDraft(value)
    cancelledRef.current = false
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (!cancelledRef.current && draft !== value) {
      onSave(draft)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full min-w-32 rounded-md border border-ring bg-background px-2 py-1 text-sm outline-none ring-3 ring-ring/50"
        aria-label={ariaLabel}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          } else if (e.key === "Escape") {
            cancelledRef.current = true
            setEditing(false)
          }
          // Tab: let focus move; blur handler saves
        }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={t.copy.cellHint}
      className={cn(
        "-mx-2 w-[calc(100%+1rem)] cursor-text rounded-md px-2 py-1 text-left text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        value === "" && "text-muted-foreground italic"
      )}
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          start()
        }
      }}
    >
      {value === "" ? t.copy.noTranslation : value}
    </button>
  )
}
