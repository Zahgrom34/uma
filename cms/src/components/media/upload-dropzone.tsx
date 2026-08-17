import * as React from "react"
import { ImageUpIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { UploadItem } from "./use-uploads"

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp"
export const VIDEO_ACCEPT = "video/mp4"

export function UploadDropzone({
  uploads,
  onFiles,
  onRetry,
  onDismiss,
  compact = false,
  accept = IMAGE_ACCEPT,
  formatsHint = t.media.dropFormatsImages,
}: {
  uploads: UploadItem[]
  onFiles: (files: File[]) => void
  onRetry: (key: string) => void
  onDismiss: (key: string) => void
  compact?: boolean
  accept?: string
  formatsHint?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const pick = (list: FileList | null) => {
    if (!list) return
    const files = [...list].filter((f) => accept.includes(f.type))
    if (files.length > 0) onFiles(files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={t.media.upload}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          compact ? "px-4 py-6" : "px-6 py-10",
          dragOver
            ? "border-ring bg-muted"
            : "hover:bg-muted/50"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          pick(e.dataTransfer.files)
        }}
      >
        <ImageUpIcon className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">{t.media.dropHint}</p>
        <p className="text-xs text-muted-foreground">{formatsHint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {uploads.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {uploads.map((u) => (
            <li
              key={u.key}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{u.file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.status === "error"
                      ? t.media.uploadFailed
                      : u.status === "done"
                        ? t.media.uploadDone
                        : `${u.progress}%`}
                  </span>
                </div>
                {u.status === "error" && u.errorMessage ? (
                  <p className="text-xs text-destructive">{u.errorMessage}</p>
                ) : null}
                {u.status !== "done" ? (
                  <Progress
                    value={u.status === "error" ? 100 : u.progress}
                    className={cn(
                      "h-1",
                      u.status === "error" && "[&>*]:bg-destructive"
                    )}
                  />
                ) : null}
              </div>
              {u.status === "error" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(u.key)}
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  {t.media.uploadRetry}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t.common.close}
                onClick={() => onDismiss(u.key)}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
