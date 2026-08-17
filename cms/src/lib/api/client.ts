export interface FieldErrors {
  [field: string]: string
}

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function redirectToLogin() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "")
  const current = window.location.pathname + window.location.search
  const from = base ? current.replace(base, "") : current
  if (from.startsWith("/login")) return
  window.location.assign(
    `${base}/login?from=${encodeURIComponent(from || "/")}`
  )
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText
  let fieldErrors: FieldErrors = {}
  try {
    const body = (await res.json()) as {
      message?: string
      fieldErrors?: FieldErrors
    }
    if (body.message) message = body.message
    if (body.fieldErrors) fieldErrors = body.fieldErrors
  } catch {
    // non-JSON error body — keep statusText
  }
  return new ApiError(res.status, message, fieldErrors)
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  })

  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    redirectToLogin()
    throw new ApiError(401, "Unauthorized")
  }

  if (!res.ok) {
    throw await parseError(res)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

/** Multipart upload with progress reporting (fetch has no upload progress). */
export function uploadFiles<T>(
  path: string,
  files: File[],
  onProgress: (percent: number) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", path)
    xhr.withCredentials = true
    xhr.responseType = "json"

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, "Network error"))
    xhr.onload = () => {
      if (xhr.status === 401) {
        redirectToLogin()
        reject(new ApiError(401, "Unauthorized"))
        return
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as T)
      } else {
        const body = xhr.response as {
          message?: string
          fieldErrors?: FieldErrors
        } | null
        reject(
          new ApiError(
            xhr.status,
            body?.message ?? xhr.statusText,
            body?.fieldErrors ?? {}
          )
        )
      }
    }

    const form = new FormData()
    for (const file of files) form.append("files", file)
    xhr.send(form)
  })
}
