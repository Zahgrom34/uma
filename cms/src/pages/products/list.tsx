import * as React from "react"
import { Link, useNavigate } from "react-router"
import {
  EllipsisIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
} from "lucide-react"

import type { AdminProduct } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import {
  useDeleteProduct,
  useOptimisticListPatch,
  useProducts,
} from "@/lib/api/products"
import { useCategories } from "@/lib/api/categories"
import { countNoun, money, plural } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { toast } from "@/components/ui/toast"
import { DataState, EmptyState } from "@/components/shared/data-state"

const PAGE_SIZE = 20
const ALL = "__all__"

type StockFilter = "all" | "in" | "out"

const tagOptions = [
  { value: ALL, label: t.common.all },
  { value: "New", label: t.products.tagNew },
  { value: "Sale", label: t.products.tagSale },
  { value: "Online Exclusive", label: t.products.tagExclusive },
]

/**
 * 4xx validation errors carry a Russian server message (e.g. «Для скидки
 * укажите старую цену») — show it. Network failures / 5xx get the generic
 * «Сервер недоступен — вернули как было».
 */
function saveErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return t.products.saleUpdateFailedDesc
}

function stockBadge(p: AdminProduct) {
  if (p.outOfStock) {
    return <Badge variant="destructive">{t.products.stockOutBadge}</Badge>
  }
  if (Object.keys(p.lowStockSizes).length > 0) {
    return <Badge variant="outline">{t.products.stockLowBadge}</Badge>
  }
  return <Badge variant="secondary">{t.products.stockInBadge}</Badge>
}

export function ProductsPage() {
  const navigate = useNavigate()
  const products = useProducts()
  const categories = useCategories()
  const listPatch = useOptimisticListPatch()
  const deleteProduct = useDeleteProduct()

  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState(ALL)
  const [tag, setTag] = React.useState(ALL)
  const [stock, setStock] = React.useState<StockFilter>("all")
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProduct | null>(
    null
  )

  const filtersActive =
    search !== "" || category !== ALL || tag !== ALL || stock !== "all"

  const filtered = React.useMemo(() => {
    const all = products.data ?? []
    const q = search.trim().toLowerCase()
    return all.filter((p) => {
      if (q && !`${p.i18n.ru.name} ${p.id}`.toLowerCase().includes(q))
        return false
      if (category !== ALL && p.categorySlug !== category) return false
      if (tag !== ALL && p.tag !== tag) return false
      if (stock === "in" && p.outOfStock) return false
      if (stock === "out" && !p.outOfStock) return false
      return true
    })
  }, [products.data, search, category, tag, stock])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const resetFilters = () => {
    setSearch("")
    setCategory(ALL)
    setTag(ALL)
    setStock("all")
    setPage(1)
  }

  const toggleSale = (p: AdminProduct, sale: boolean) => {
    listPatch.mutate(
      { ids: [p.id], patch: { sale } },
      {
        onError: (err) => {
          toast.add({
            type: "error",
            title: t.products.saleUpdateFailed,
            description: saveErrorDescription(err),
          })
        },
      }
    )
  }

  const bulkSale = (sale: boolean) => {
    const ids = [...selected]
    listPatch.mutate(
      { ids, patch: { sale } },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          setSelected(new Set())
        },
        onError: (err) => {
          toast.add({
            type: "error",
            title: t.products.saleUpdateFailed,
            description: saveErrorDescription(err),
          })
        },
      }
    )
  }

  const toggleStatus = (p: AdminProduct) => {
    listPatch.mutate(
      {
        ids: [p.id],
        patch: { status: p.status === "published" ? "draft" : "published" },
      },
      {
        onSuccess: () => toast.add({ type: "success", title: t.toasts.saved }),
        onError: () =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: t.toasts.saveFailedDesc,
          }),
      }
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => toast.add({ type: "success", title: t.toasts.deleted }),
      onError: () =>
        toast.add({
          type: "error",
          title: t.toasts.deleteFailed,
          description: t.toasts.saveFailedDesc,
        }),
    })
    setDeleteTarget(null)
  }

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id))

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        pageItems.forEach((p) => next.delete(p.id))
      } else {
        pageItems.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold">{t.products.title}</h1>
          {products.data ? (
            <span className="text-sm text-muted-foreground">
              {countNoun(filtered.length, t.products.countForms)}
            </span>
          ) : null}
        </div>
        <Button nativeButton={false} render={<Link to="/products/new" />}>
          <PlusIcon data-icon="inline-start" />
          {t.products.add}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t.products.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </InputGroup>
        <Select
          items={[
            { value: ALL, label: t.common.all },
            ...(categories.data ?? []).map((c) => ({
              value: c.slug,
              label: c.nameRu,
            })),
          ]}
          value={category}
          onValueChange={(v) => {
            setCategory(v as string)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t.products.filterCategory} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t.products.filterCategory}</SelectItem>
              {(categories.data ?? []).map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.nameRu}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={tagOptions}
          value={tag}
          onValueChange={(v) => {
            setTag(v as string)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.products.filterTag} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>{t.products.filterTag}</SelectItem>
              {tagOptions.slice(1).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ToggleGroup
          value={[stock]}
          onValueChange={(groupValue) => {
            const next = (groupValue as string[])[0]
            if (next) {
              setStock(next as StockFilter)
              setPage(1)
            }
          }}
        >
          <ToggleGroupItem value="all">{t.products.stockAll}</ToggleGroupItem>
          <ToggleGroupItem value="in">{t.products.stockIn}</ToggleGroupItem>
          <ToggleGroupItem value="out">{t.products.stockOut}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <DataState
        isLoading={products.isPending}
        isError={products.isError}
        onRetry={() => void products.refetch()}
        isEmpty={filtered.length === 0}
        skeleton={<ProductsSkeleton />}
        empty={
          filtersActive ? (
            <EmptyState
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t.common.resetFilters}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t.products.emptyTitle}
              description={t.products.emptyDesc}
              action={
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/products/new" />}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t.products.add}
                </Button>
              }
            />
          )
        }
      >
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAllOnPage}
                    aria-label={t.products.bulkClear}
                  />
                </TableHead>
                <TableHead className="w-14" />
                <TableHead>{t.products.colName}</TableHead>
                <TableHead>{t.products.colCategory}</TableHead>
                <TableHead className="text-right">
                  {t.products.colPrice}
                </TableHead>
                <TableHead className="w-20">{t.products.colSale}</TableHead>
                <TableHead>{t.products.colStock}</TableHead>
                <TableHead>{t.products.colTag}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((p) => (
                <TableRow
                  key={p.id}
                  data-state={selected.has(p.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }
                      aria-label={p.i18n.ru.name}
                    />
                  </TableCell>
                  <TableCell>
                    {p.thumbs[0] ? (
                      <img
                        src={p.thumbs[0]}
                        alt=""
                        className="size-9 rounded-md border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                        <ShirtIcon className="size-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/products/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.i18n.ru.name}
                    </Link>
                    {p.status === "draft" ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t.products.statusDraft}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.cat}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="flex flex-col items-end">
                      <span>{money(p.price)}</span>
                      {p.sale && p.oldPrice ? (
                        <span className="text-xs text-muted-foreground line-through">
                          {money(p.oldPrice)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.sale}
                      onCheckedChange={(checked) => toggleSale(p, checked)}
                      aria-label={t.products.colSale}
                    />
                  </TableCell>
                  <TableCell>{stockBadge(p)}</TableCell>
                  <TableCell>
                    {p.tag ? (
                      <Badge variant="outline">{p.tag}</Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {t.common.dash}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t.products.rowMenu}
                          />
                        }
                      >
                        <EllipsisIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => navigate(`/products/${p.id}`)}
                          >
                            {t.products.rowEdit}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(p)}>
                            {p.status === "published"
                              ? t.products.rowHide
                              : t.products.rowShow}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            {t.products.rowDelete}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t.products.pageOf(currentPage, pageCount)}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    {t.products.prevPage}
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {t.products.nextPage}
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </DataState>

      {selected.size > 0 ? (
        <div className="sticky bottom-4 z-10 mx-auto flex items-center gap-3 rounded-xl border bg-popover px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selected.size} {plural(selected.size, t.products.bulkSelectedForms)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => bulkSale(true)}
            disabled={listPatch.isPending}
          >
            {t.products.bulkEnableSale}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => bulkSale(false)}
            disabled={listPatch.isPending}
          >
            {t.products.bulkDisableSale}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            {t.products.bulkClear}
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.products.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.i18n.ru.name}. {t.products.deleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProductsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead className="w-14" />
            <TableHead>{t.products.colName}</TableHead>
            <TableHead>{t.products.colCategory}</TableHead>
            <TableHead className="text-right">{t.products.colPrice}</TableHead>
            <TableHead className="w-20">{t.products.colSale}</TableHead>
            <TableHead>{t.products.colStock}</TableHead>
            <TableHead>{t.products.colTag}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="size-4 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="size-9 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-12 rounded-md" />
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
