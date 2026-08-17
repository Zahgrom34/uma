import { FilmIcon } from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { Badge } from "@/components/ui/badge"

/**
 * Neutral tile face for video assets: no thumbnail, no fake preview —
 * a type badge and the original file name.
 */
export function VideoTileContent({ name }: { name: string }) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-1.5 bg-muted px-2 text-center">
      <FilmIcon className="size-5 text-muted-foreground" aria-hidden />
      <Badge variant="secondary">{t.media.videoBadge}</Badge>
      <span className="w-full truncate text-xs text-muted-foreground">
        {name}
      </span>
    </span>
  )
}
