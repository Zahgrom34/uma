import * as React from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagePlusIcon,
  XIcon,
} from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { MediaPickerDialog } from "@/components/media/media-picker-dialog"
import type { EditorForm } from "./form"

export function MediaStrip() {
  const { control, formState } = useFormContext<EditorForm>()
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "media",
  })
  const [pickerOpen, setPickerOpen] = React.useState(false)

  const error = formState.errors.media

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {fields.map((field, index) => (
          <figure key={field.id} className="group relative">
            <img
              src={field.thumbUrl}
              alt=""
              className="size-28 rounded-lg border object-cover"
            />
            {index === 0 ? (
              <figcaption className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                {t.editor.photoCover}
              </figcaption>
            ) : null}
            <span className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              {index > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  aria-label={t.editor.photoMoveLeft}
                  onClick={() => move(index, index - 1)}
                >
                  <ChevronLeftIcon />
                </Button>
              ) : null}
              {index < fields.length - 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  aria-label={t.editor.photoMoveRight}
                  onClick={() => move(index, index + 1)}
                >
                  <ChevronRightIcon />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="icon-xs"
                aria-label={t.editor.photoRemove}
                onClick={() => remove(index)}
              >
                <XIcon />
              </Button>
            </span>
          </figure>
        ))}
        <button
          type="button"
          className="flex size-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors outline-none hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setPickerOpen(true)}
        >
          <ImagePlusIcon className="size-5" />
          <span className="text-xs">{t.editor.addPhoto}</span>
        </button>
      </div>
      {error?.message ? <FieldError>{error.message}</FieldError> : null}
      {!error && fields.length === 1 ? (
        <FieldDescription>{t.editor.photoFewWarn}</FieldDescription>
      ) : null}
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        kind="image"
        excludeIds={fields.map((f) => f.mediaId)}
        onPick={(assets) =>
          append(
            assets.map((a) => ({ mediaId: a.id, thumbUrl: a.thumbUrl ?? a.url }))
          )
        }
      />
    </div>
  )
}
