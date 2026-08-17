import * as React from "react"
import { EllipsisIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"

import type { PublicCategory } from "@/lib/api/types"
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/lib/api/categories"
import { useProducts } from "@/lib/api/products"
import { countNoun } from "@/lib/format"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { DataState, EmptyState } from "@/components/shared/data-state"

interface CategoryDraft {
  slug: string
  nameRu: string
  nameUz: string
  nameEn: string
}

export function CategoriesPage() {
  const categories = useCategories()
  const products = useProducts()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editTarget, setEditTarget] = React.useState<PublicCategory | null>(
    null
  )
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] =
    React.useState<PublicCategory | null>(null)
  const [draft, setDraft] = React.useState<CategoryDraft>({
    slug: "",
    nameRu: "",
    nameUz: "",
    nameEn: "",
  })
  const [draftError, setDraftError] = React.useState<string | null>(null)

  const productCount = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products.data ?? []) {
      counts.set(p.categorySlug, (counts.get(p.categorySlug) ?? 0) + 1)
    }
    return counts
  }, [products.data])

  const openCreate = () => {
    setDraft({ slug: "", nameRu: "", nameUz: "", nameEn: "" })
    setDraftError(null)
    setCreateOpen(true)
  }

  const openEdit = (c: PublicCategory) => {
    setDraft({
      slug: c.slug,
      nameRu: c.nameRu,
      nameUz: c.nameUz,
      nameEn: c.nameEn,
    })
    setDraftError(null)
    setEditTarget(c)
  }

  const submitDraft = () => {
    if (!draft.nameRu.trim()) {
      setDraftError(t.categories.nameRequired)
      return
    }
    const onSuccess = () => {
      toast.add({ type: "success", title: t.toasts.saved })
      setCreateOpen(false)
      setEditTarget(null)
    }
    const onError = (err: Error) => {
      setDraftError(err.message || t.toasts.saveFailed)
    }
    if (editTarget) {
      updateCategory.mutate(
        {
          slug: editTarget.slug,
          patch: {
            nameRu: draft.nameRu,
            nameUz: draft.nameUz,
            nameEn: draft.nameEn,
          },
        },
        { onSuccess, onError }
      )
    } else {
      createCategory.mutate(
        {
          slug: draft.slug,
          nameRu: draft.nameRu,
          nameUz: draft.nameUz,
          nameEn: draft.nameEn,
        },
        { onSuccess, onError }
      )
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteCategory.mutate(deleteTarget.slug, {
      onSuccess: () => toast.add({ type: "success", title: t.toasts.deleted }),
      onError: () =>
        toast.add({
          type: "error",
          title: t.toasts.deleteFailed,
          description: t.categories.deleteBlocked,
        }),
    })
    setDeleteTarget(null)
  }

  const items = categories.data ?? []
  const dialogOpen = createOpen || editTarget !== null
  const saving = createCategory.isPending || updateCategory.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold">{t.categories.title}</h1>
          {categories.data ? (
            <span className="text-sm text-muted-foreground">
              {countNoun(items.length, t.categories.countForms)}
            </span>
          ) : null}
        </div>
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          {t.categories.add}
        </Button>
      </div>

      <DataState
        isLoading={categories.isPending}
        isError={categories.isError}
        onRetry={() => void categories.refetch()}
        isEmpty={items.length === 0}
        skeleton={<CategoriesSkeleton />}
        empty={<EmptyState title={t.states.emptyTitle} description="" />}
      >
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.categories.colNameRu}</TableHead>
                <TableHead>{t.categories.colNameUz}</TableHead>
                <TableHead>{t.categories.colNameEn}</TableHead>
                <TableHead>{t.categories.colSlug}</TableHead>
                <TableHead className="text-right">
                  {t.categories.colProducts}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.slug}>
                  <TableCell className="font-medium">{c.nameRu}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.nameUz}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.nameEn}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.slug}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {productCount.get(c.slug) ?? 0}
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
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            {t.categories.rename}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={(productCount.get(c.slug) ?? 0) > 0}
                            onClick={() => setDeleteTarget(c)}
                          >
                            {t.common.delete}
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
      </DataState>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t.categories.renameTitle : t.categories.createTitle}
            </DialogTitle>
            <DialogDescription
              className={editTarget ? "flex items-start gap-2" : "sr-only"}
            >
              {editTarget ? (
                <>
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                  {t.categories.renameWarn}
                </>
              ) : (
                t.categories.createTitle
              )}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {!editTarget ? (
              <Field>
                <FieldLabel htmlFor="cat-slug">
                  {t.categories.colSlug}
                </FieldLabel>
                <Input
                  id="cat-slug"
                  placeholder="dresses"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({ ...draft, slug: e.target.value })
                  }
                />
              </Field>
            ) : null}
            <Field data-invalid={draftError ? true : undefined}>
              <FieldLabel htmlFor="cat-ru">{t.categories.colNameRu}</FieldLabel>
              <Input
                id="cat-ru"
                value={draft.nameRu}
                aria-invalid={draftError ? true : undefined}
                onChange={(e) => setDraft({ ...draft, nameRu: e.target.value })}
              />
              {draftError ? <FieldError>{draftError}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="cat-uz">{t.categories.colNameUz}</FieldLabel>
              <Input
                id="cat-uz"
                value={draft.nameUz}
                onChange={(e) => setDraft({ ...draft, nameUz: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cat-en">{t.categories.colNameEn}</FieldLabel>
              <Input
                id="cat-en"
                value={draft.nameEn}
                onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setEditTarget(null)
              }}
            >
              {t.common.cancel}
            </Button>
            <Button onClick={submitDraft} disabled={saving}>
              {saving ? t.common.saving : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.categories.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nameRu}. {t.categories.deleteDesc}
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

function CategoriesSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  )
}
