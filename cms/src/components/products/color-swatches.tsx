import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { PlusIcon, XIcon } from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { EditorForm } from "./form"

export function ColorSwatches() {
  const { control, formState, register, setValue } =
    useFormContext<EditorForm>()
  const { fields, append, remove } = useFieldArray({
    control,
    // RHF's types expect object arrays; colors is a validated string array
    name: "colors" as never,
  })

  const colors = useWatch({ control, name: "colors" }) ?? []

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {fields.map((field, index) => {
          const error = formState.errors.colors?.[index]
          return (
            <li key={field.id} className="flex items-center gap-2">
              <label className="relative">
                <span
                  className="block size-7 rounded-md border"
                  style={{ backgroundColor: colors[index] }}
                />
                <input
                  type="color"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={t.editor.fieldColor}
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(colors[index] ?? "")
                      ? colors[index]
                      : "#000000"
                  }
                  onChange={(e) =>
                    setValue(`colors.${index}`, e.target.value, {
                      shouldDirty: true,
                      shouldValidate: formState.isSubmitted,
                    })
                  }
                />
              </label>
              <Input
                className="w-28 font-mono text-xs"
                aria-invalid={error ? true : undefined}
                {...register(`colors.${index}`)}
              />
              {error?.message ? (
                <FieldError className="text-xs">{error.message}</FieldError>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ml-auto"
                aria-label={t.editor.colorRemove}
                onClick={() => remove(index)}
              >
                <XIcon />
              </Button>
            </li>
          )
        })}
      </ul>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append("#1a1a1a" as never)}
        >
          <PlusIcon data-icon="inline-start" />
          {t.editor.colorAdd}
        </Button>
      </div>
    </div>
  )
}
