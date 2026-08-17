import type { ReactNode } from "react"
import { RotateCcwIcon, SearchXIcon } from "lucide-react"

import { t } from "@/lib/i18n/ru"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface DataStateProps {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  isEmpty?: boolean
  skeleton: ReactNode
  empty?: ReactNode
  children: ReactNode
}

/**
 * Standard loading / error / empty / content switch for every list screen.
 * Never renders a blank body.
 */
export function DataState({
  isLoading,
  isError,
  onRetry,
  isEmpty = false,
  skeleton,
  empty,
  children,
}: DataStateProps) {
  if (isLoading) return <>{skeleton}</>

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t.states.errorTitle}</AlertTitle>
        <AlertDescription>{t.states.errorDesc}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcwIcon data-icon="inline-start" />
            {t.common.retry}
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (isEmpty) {
    return <>{empty ?? <EmptyState />}</>
  }

  return <>{children}</>
}

export function EmptyState({
  title = t.states.emptyTitle,
  description = t.states.emptyFilteredDesc,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
