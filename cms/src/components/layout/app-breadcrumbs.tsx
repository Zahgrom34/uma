import { Fragment } from "react"
import { Link, useLocation } from "react-router"
import { useQueryClient } from "@tanstack/react-query"

import type { AdminProduct } from "@/lib/api/types"
import { qk } from "@/lib/api/keys"
import { t } from "@/lib/i18n/ru"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const sectionNames: Record<string, string> = {
  "home-page": t.nav.homePage,
  products: t.nav.products,
  categories: t.nav.categories,
  media: t.nav.media,
  pages: t.nav.pages,
  copy: t.nav.copy,
  settings: t.nav.settings,
}

export function AppBreadcrumbs() {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const [section, detail] = pathname.split("/").filter(Boolean)

  const crumbs: { label: string; to?: string }[] = []
  if (section && sectionNames[section]) {
    crumbs.push({
      label: sectionNames[section],
      to: detail ? `/${section}` : undefined,
    })
  }
  if (detail) {
    let label = detail
    if (section === "products") {
      label =
        detail === "new"
          ? t.editor.breadcrumbNew
          : (queryClient.getQueryData<AdminProduct>(qk.product(detail))?.i18n
              .ru.name ?? detail)
    } else if (section === "pages") {
      label = t.pages.slugNames[detail] ?? detail
    }
    crumbs.push({ label })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.to ? (
                <BreadcrumbLink render={<Link to={crumb.to} />}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
