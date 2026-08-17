import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { MediaAssetDto } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { uploadMedia } from "@/lib/api/media"
import { qk } from "@/lib/api/keys"

export interface UploadItem {
  key: string
  file: File
  progress: number
  status: "uploading" | "error" | "done"
  /** Specific server message for a rejected upload; absent → generic text. */
  errorMessage?: string
}

/**
 * 4xx rejections carry a Russian server message (e.g. «Видео больше 50 МБ»)
 * — surface it. Network failures / 5xx return undefined so the UI falls back
 * to the generic «Не загрузилось».
 */
function uploadErrorMessage(err: unknown): string | undefined {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return undefined
}

let uploadSeq = 0

/** Per-file upload queue with progress and retry. */
export function useUploads(onUploaded?: (assets: MediaAssetDto[]) => void) {
  const queryClient = useQueryClient()
  const [uploads, setUploads] = React.useState<UploadItem[]>([])
  const onUploadedRef = React.useRef(onUploaded)
  React.useEffect(() => {
    onUploadedRef.current = onUploaded
  })

  const start = React.useCallback(
    (key: string, file: File) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.key === key
            ? { ...u, status: "uploading", progress: 0, errorMessage: undefined }
            : u
        )
      )
      uploadMedia([file], (progress) => {
        setUploads((prev) =>
          prev.map((u) => (u.key === key ? { ...u, progress } : u))
        )
      })
        .then((assets) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.key === key ? { ...u, status: "done", progress: 100 } : u
            )
          )
          void queryClient.invalidateQueries({ queryKey: qk.mediaAll })
          onUploadedRef.current?.(assets)
        })
        .catch((err: unknown) => {
          const errorMessage = uploadErrorMessage(err)
          setUploads((prev) =>
            prev.map((u) =>
              u.key === key ? { ...u, status: "error", errorMessage } : u
            )
          )
        })
    },
    [queryClient]
  )

  const addFiles = React.useCallback(
    (files: File[]) => {
      const items = files.map((file) => ({
        key: `u${++uploadSeq}`,
        file,
        progress: 0,
        status: "uploading" as const,
      }))
      setUploads((prev) => [...prev, ...items])
      items.forEach((item) => start(item.key, item.file))
    },
    [start]
  )

  const retry = React.useCallback(
    (key: string) => {
      const item = uploads.find((u) => u.key === key)
      if (item) start(key, item.file)
    },
    [uploads, start]
  )

  const dismiss = React.useCallback((key: string) => {
    setUploads((prev) => prev.filter((u) => u.key !== key))
  }, [])

  const clearDone = React.useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "done"))
  }, [])

  return { uploads, addFiles, retry, dismiss, clearDone }
}
