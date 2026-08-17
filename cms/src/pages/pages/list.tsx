import { Link } from "react-router"
import { ChevronRightIcon } from "lucide-react"

import { usePages } from "@/lib/api/pages"
import { t } from "@/lib/i18n/ru"
import { Skeleton } from "@/components/ui/skeleton"
import { DataState, EmptyState } from "@/components/shared/data-state"

export function PagesListPage() {
  const pages = usePages()
  const items = pages.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t.pages.title}</h1>
      <DataState
        isLoading={pages.isPending}
        isError={pages.isError}
        onRetry={() => void pages.refetch()}
        isEmpty={items.length === 0}
        skeleton={<PagesSkeleton />}
        empty={<EmptyState title={t.states.emptyTitle} description="" />}
      >
        <ul className="flex max-w-2xl flex-col divide-y rounded-xl border">
          {items.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/pages/${p.slug}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">
                    {t.pages.slugNames[p.slug] ?? p.slug}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {p.i18n.ru.heading}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  /{p.slug}
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </DataState>
    </div>
  )
}

function PagesSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-px overflow-hidden rounded-xl border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  )
}
