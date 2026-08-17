import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon } from "lucide-react"

import type { SocialLink } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"

/** The storefront maps labels to icons literally — only these five exist. */
const PLATFORMS = [
  "Instagram",
  "Telegram",
  "Facebook",
  "YouTube",
  "Pinterest",
] as const

const platformItems = PLATFORMS.map((p) => ({ value: p, label: p }))

interface Row {
  key: string
  label: string
  href: string
}

let rowSeq = 0
const nextKey = () => `sl${++rowSeq}`

function toRows(links: SocialLink[]): Row[] {
  return links.map((l) => ({ key: nextKey(), label: l.label, href: l.href }))
}

function urlError(href: string): string | null {
  const trimmed = href.trim()
  if (trimmed === "") return t.settings.socialUrlRequired
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return t.settings.socialUrlInvalid
    }
  } catch {
    return t.settings.socialUrlInvalid
  }
  return null
}

function saveErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return t.toasts.saveFailedDesc
}

export function SocialLinksCard({ settings }: { settings: AdminSettings }) {
  const saveSettings = useSaveSettings()
  const initialLinks = React.useMemo(
    () => (Array.isArray(settings.socialLinks) ? settings.socialLinks : []),
    [settings.socialLinks]
  )
  const [rows, setRows] = React.useState<Row[]>(() => toRows(initialLinks))
  const [showErrors, setShowErrors] = React.useState(false)

  const links: SocialLink[] = rows.map((r) => ({
    label: r.label,
    href: r.href.trim(),
  }))
  const dirty = JSON.stringify(links) !== JSON.stringify(initialLinks)
  const saving = saveSettings.isPending
  const hasErrors = rows.some((r) => urlError(r.href) !== null)

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    )

  const move = (index: number, delta: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  const save = () => {
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    saveSettings.mutate(
      { ...settings, socialLinks: links },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          setShowErrors(false)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.socialCard}</CardTitle>
        <CardDescription>{t.settings.socialDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const error = showErrors ? urlError(row.href) : null
            return (
              <div key={row.key} className="flex items-start gap-2">
                <Field className="w-36 shrink-0">
                  <FieldLabel
                    htmlFor={`social-platform-${row.key}`}
                    className="sr-only"
                  >
                    {t.settings.socialPlatform}
                  </FieldLabel>
                  <Select
                    items={platformItems}
                    value={row.label === "" ? null : row.label}
                    onValueChange={(v) => update(row.key, { label: v ?? "" })}
                  >
                    <SelectTrigger
                      id={`social-platform-${row.key}`}
                      className="w-full"
                    >
                      <SelectValue placeholder={t.settings.socialPlatform} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {platformItems.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  className="min-w-0 flex-1"
                  data-invalid={error ? true : undefined}
                >
                  <FieldLabel
                    htmlFor={`social-url-${row.key}`}
                    className="sr-only"
                  >
                    {t.settings.socialUrl}
                  </FieldLabel>
                  <Input
                    id={`social-url-${row.key}`}
                    type="url"
                    inputMode="url"
                    placeholder={t.settings.socialUrlPlaceholder}
                    value={row.href}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) =>
                      update(row.key, { href: e.target.value })
                    }
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
                <span className="flex shrink-0 gap-0.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t.settings.socialMoveUp}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t.settings.socialMoveDown}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t.settings.socialRemove}
                    onClick={() =>
                      setRows((prev) => prev.filter((r) => r.key !== row.key))
                    }
                  >
                    <XIcon />
                  </Button>
                </span>
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { key: nextKey(), label: "Instagram", href: "" },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            {t.settings.socialAdd}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          disabled={!dirty || saving || (showErrors && hasErrors)}
          onClick={save}
        >
          {saving ? t.common.saving : t.common.save}
        </Button>
      </CardFooter>
    </Card>
  )
}
