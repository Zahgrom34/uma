import * as React from "react"
import { SearchIcon } from "lucide-react"

import type { UiStringDto } from "@/lib/api/types"
import { useSaveUiStrings, useUiStrings } from "@/lib/api/ui-strings"
import { countNoun } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { DataState, EmptyState } from "@/components/shared/data-state"
import { EditableCell } from "@/components/copy/editable-cell"

const ALL = "__all__"

function sectionOf(key: string): string {
  const dot = key.indexOf(".")
  return dot === -1 ? key : key.slice(0, dot)
}

export function CopyPage() {
  const strings = useUiStrings()
  const save = useSaveUiStrings()

  const [search, setSearch] = React.useState("")
  const [section, setSection] = React.useState(ALL)
  const [untranslatedOnly, setUntranslatedOnly] = React.useState(false)

  const sections = React.useMemo(() => {
    const set = new Set((strings.data ?? []).map((r) => sectionOf(r.key)))
    return [...set].sort()
  }, [strings.data])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (strings.data ?? []).filter((r) => {
      if (section !== ALL && sectionOf(r.key) !== section) return false
      if (untranslatedOnly && r.uz !== "" && r.en !== "") return false
      if (
        q &&
        !`${r.key} ${r.ru} ${r.uz} ${r.en}`.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [strings.data, search, section, untranslatedOnly])

  const filtersActive = search !== "" || section !== ALL || untranslatedOnly

  const saveCell = (row: UiStringDto, lang: "ru" | "uz" | "en", value: string) => {
    save.mutate([{ ...row, [lang]: value }], {
      onError: () =>
        toast.add({
          type: "error",
          title: t.toasts.saveFailed,
          description: t.toasts.saveFailedDesc,
        }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">{t.copy.title}</h1>
        {strings.data ? (
          <span className="text-sm text-muted-foreground">
            {countNoun(filtered.length, t.copy.countForms)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <InputGroup className="w-72">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t.copy.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select
          items={[
            { value: ALL, label: t.copy.sectionAll },
            ...sections.map((s) => ({ value: s, label: s })),
          ]}
          value={section}
          onValueChange={(v) => setSection(v as string)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t.copy.sectionFilter} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t.copy.sectionAll}</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Field orientation="horizontal" className="w-auto">
          <Checkbox
            id="untranslated-only"
            checked={untranslatedOnly}
            onCheckedChange={(checked) =>
              setUntranslatedOnly(checked === true)
            }
          />
          <FieldLabel htmlFor="untranslated-only" className="font-normal">
            {t.copy.untranslatedOnly}
          </FieldLabel>
        </Field>
      </div>

      <DataState
        isLoading={strings.isPending}
        isError={strings.isError}
        onRetry={() => void strings.refetch()}
        isEmpty={filtered.length === 0}
        skeleton={<CopySkeleton />}
        empty={
          <EmptyState
            action={
              filtersActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setSection(ALL)
                    setUntranslatedOnly(false)
                  }}
                >
                  {t.common.resetFilters}
                </Button>
              ) : undefined
            }
          />
        }
      >
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">{t.copy.colKey}</TableHead>
                <TableHead>{t.copy.colRu}</TableHead>
                <TableHead>{t.copy.colUz}</TableHead>
                <TableHead>{t.copy.colEn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="align-top font-mono text-xs text-muted-foreground">
                    {row.key}
                  </TableCell>
                  {(["ru", "uz", "en"] as const).map((lang) => (
                    <TableCell key={lang} className="align-top">
                      <EditableCell
                        value={row[lang]}
                        ariaLabel={`${row.key} — ${lang}`}
                        onSave={(next) => saveCell(row, lang, next)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataState>
    </div>
  )
}

function CopySkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
