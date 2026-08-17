import * as React from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

import { t } from "@/lib/i18n/ru"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { EditorForm, SizePreset } from "./form"
import { presetSizes } from "./form"

const presetOptions = [
  { value: "clothes", label: t.editor.presetClothes },
  { value: "shoes", label: t.editor.presetShoes },
  { value: "one", label: t.editor.presetOne },
  { value: "custom", label: t.editor.presetCustom },
]

const guideOptions = [
  { value: "", label: t.editor.sizeGuideNone },
  { value: "eu", label: t.editor.sizeGuideEu },
]

export function SizeEditor() {
  const { control, register, setValue, getValues } =
    useFormContext<EditorForm>()
  const { fields, replace, update } = useFieldArray({ control, name: "sizes" })
  const preset = useWatch({ control, name: "sizePreset" })
  const sizeGuide = useWatch({ control, name: "sizeGuide" })

  const rebuild = React.useCallback(
    (nextPreset: SizePreset, custom: string) => {
      const wanted = presetSizes(nextPreset, custom)
      const current = getValues("sizes")
      const byName = new Map(current.map((s) => [s.size, s]))
      replace(
        wanted.map(
          (size) => byName.get(size) ?? { size, state: "in" as const, qty: 0 }
        )
      )
    },
    [getValues, replace]
  )

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="size-preset">{t.editor.sizePreset}</FieldLabel>
        <Select
          items={presetOptions}
          value={preset}
          onValueChange={(v) => {
            const next = v as SizePreset
            setValue("sizePreset", next, { shouldDirty: true })
            rebuild(next, getValues("customSizes"))
          }}
        >
          <SelectTrigger id="size-preset" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {presetOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {preset === "custom" ? (
        <Field>
          <FieldLabel htmlFor="custom-sizes">
            {t.editor.customSizesLabel}
          </FieldLabel>
          <Input
            id="custom-sizes"
            placeholder={t.editor.customSizesPlaceholder}
            {...register("customSizes", {
              onChange: (e) => rebuild("custom", e.target.value),
            })}
          />
        </Field>
      ) : null}

      {fields.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-lg border">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="flex min-h-11 items-center gap-3 px-3 py-1.5"
            >
              <span className="w-10 shrink-0 text-sm font-medium tabular-nums">
                {field.size}
              </span>
              <ToggleGroup
                className="ml-auto"
                value={[field.state]}
                onValueChange={(groupValue) => {
                  const next = (groupValue as string[])[0]
                  if (!next) return
                  update(index, {
                    ...getValues(`sizes.${index}`),
                    state: next as "in" | "low" | "none",
                  })
                }}
              >
                <ToggleGroupItem value="in" className="text-xs">
                  {t.editor.sizeAvailable}
                </ToggleGroupItem>
                <ToggleGroupItem value="low" className="text-xs">
                  {t.editor.sizeLow}
                </ToggleGroupItem>
                <ToggleGroupItem value="none" className="text-xs">
                  {t.editor.sizeNone}
                </ToggleGroupItem>
              </ToggleGroup>
              {field.state === "low" ? (
                <span className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-16 text-right tabular-nums"
                    aria-label={`${field.size} — ${t.editor.sizeLow}`}
                    {...register(`sizes.${index}.qty`, {
                      valueAsNumber: true,
                    })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t.editor.sizeLowQty}
                  </span>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Field>
        <FieldLabel htmlFor="size-guide">{t.editor.sizeGuideLabel}</FieldLabel>
        <Select
          items={guideOptions}
          value={sizeGuide}
          onValueChange={(v) =>
            setValue("sizeGuide", v as string, { shouldDirty: true })
          }
        >
          <SelectTrigger id="size-guide" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {guideOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
