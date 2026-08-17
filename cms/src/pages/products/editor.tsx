import * as React from "react"
import { useParams } from "react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Controller,
  FormProvider,
  useForm,
  type FieldErrors,
} from "react-hook-form"

import type { Lang } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from "@/lib/api/products"
import { useCategories } from "@/lib/api/categories"
import { money } from "@/lib/format"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { toast } from "@/components/ui/toast"
import { DataState, EmptyState } from "@/components/shared/data-state"
import {
  useDirtyGuard,
  useNavigationGuardContext,
} from "@/components/shared/navigation-guard-context"
import {
  editorSchema,
  emptyForm,
  formToPayload,
  productToForm,
  LANGS,
  type EditorForm,
} from "@/components/products/form"
import { ColorSwatches } from "@/components/products/color-swatches"
import { I18nTabs } from "@/components/products/i18n-tabs"
import { MediaStrip } from "@/components/products/media-strip"
import { PriceInput } from "@/components/products/price-input"
import { SizeEditor } from "@/components/products/size-editor"

const NONE = "__none__"

const tagOptions = [
  { value: NONE, label: t.products.tagNone },
  { value: "New", label: t.products.tagNew },
  { value: "Sale", label: t.products.tagSale },
  { value: "Online Exclusive", label: t.products.tagExclusive },
]

export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === undefined
  const product = useProduct(id)
  const categories = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { guardedNavigate } = useNavigationGuardContext()

  const [activeLang, setActiveLang] = React.useState<Lang>("ru")

  const form = useForm<EditorForm>({
    resolver: zodResolver(editorSchema),
    defaultValues: emptyForm(),
    mode: "onSubmit",
    reValidateMode: "onChange",
  })
  const { formState, handleSubmit, control, register, reset, setError } = form

  React.useEffect(() => {
    if (product.data) reset(productToForm(product.data))
  }, [product.data, reset])

  const saving = createProduct.isPending || updateProduct.isPending
  useDirtyGuard(() => formState.isDirty && !saving)

  const onValid = (values: EditorForm) => {
    const payload = formToPayload(values)
    const done = () => {
      toast.add({ type: "success", title: t.toasts.saved })
    }
    const fail = (err: unknown) => {
      if (err instanceof ApiError) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setError(field as keyof EditorForm & string, { message })
        }
        if (err.status === 409) {
          setError("id", { message: err.message })
        }
      }
      toast.add({
        type: "error",
        title: t.toasts.saveFailed,
        description: t.toasts.saveFailedDesc,
      })
    }
    if (isNew) {
      createProduct.mutate(
        { id: values.id, ...payload },
        {
          onSuccess: (created) => {
            done()
            reset(productToForm(created))
            guardedNavigate(`/products/${created.id}`)
          },
          onError: fail,
        }
      )
    } else {
      updateProduct.mutate(
        { id: id!, patch: payload },
        {
          onSuccess: (updated) => {
            done()
            reset(productToForm(updated))
          },
          onError: fail,
        }
      )
    }
  }

  const onInvalid = (errors: FieldErrors<EditorForm>) => {
    const langWithError = LANGS.find((lang) => errors.i18n?.[lang])
    if (langWithError) {
      setActiveLang(langWithError)
      window.setTimeout(() => {
        document
          .getElementById(`i18n-${langWithError}-name`)
          ?.focus()
      }, 0)
    }
  }

  const submit = React.useMemo(
    () => handleSubmit(onValid, onInvalid),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSubmit]
  )

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [submit])

  if (!isNew && product.isPending) {
    return <EditorSkeleton />
  }

  if (!isNew && product.isError) {
    const notFound =
      product.error instanceof ApiError && product.error.status === 404
    return (
      <DataState
        isLoading={false}
        isError={!notFound}
        onRetry={() => void product.refetch()}
        isEmpty={notFound}
        skeleton={null}
        empty={
          <EmptyState
            title={t.editor.notFoundTitle}
            description={t.editor.notFoundDesc}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => guardedNavigate("/products")}
              >
                {t.editor.backToList}
              </Button>
            }
          />
        }
      >
        {null}
      </DataState>
    )
  }

  const sale = form.watch("sale")
  const price = form.watch("price")

  return (
    <FormProvider {...form}>
      <form
        onSubmit={submit}
        noValidate
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-20"
      >
        <h1 className="text-lg font-semibold">
          {isNew
            ? t.editor.newTitle
            : (product.data?.i18n.ru.name ?? t.common.loading)}
        </h1>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent>
                <I18nTabs activeLang={activeLang} onLangChange={setActiveLang} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t.editor.photos}</CardTitle>
              </CardHeader>
              <CardContent>
                <MediaStrip />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.editor.priceCard}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field data-invalid={formState.errors.price ? true : undefined}>
                    <FieldLabel htmlFor="price">{t.editor.price}</FieldLabel>
                    <Controller
                      control={control}
                      name="price"
                      render={({ field }) => (
                        <PriceInput
                          id="price"
                          value={field.value}
                          onChange={field.onChange}
                          invalid={Boolean(formState.errors.price)}
                        />
                      )}
                    />
                    {formState.errors.price?.message ? (
                      <FieldError>{formState.errors.price.message}</FieldError>
                    ) : null}
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="sale-switch">
                      {t.editor.sale}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="sale"
                      render={({ field }) => (
                        <Switch
                          id="sale-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                  {sale ? (
                    <Field
                      data-invalid={
                        formState.errors.oldPrice ? true : undefined
                      }
                    >
                      <FieldLabel htmlFor="old-price">
                        {t.editor.oldPrice}
                      </FieldLabel>
                      <Controller
                        control={control}
                        name="oldPrice"
                        render={({ field }) => (
                          <PriceInput
                            id="old-price"
                            value={field.value}
                            onChange={field.onChange}
                            invalid={Boolean(formState.errors.oldPrice)}
                          />
                        )}
                      />
                      {formState.errors.oldPrice?.message ? (
                        <FieldError>
                          {formState.errors.oldPrice.message}
                        </FieldError>
                      ) : null}
                    </Field>
                  ) : null}
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.editor.orgCard}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {isNew ? (
                    <Field
                      data-invalid={formState.errors.id ? true : undefined}
                    >
                      <FieldLabel htmlFor="slug">{t.editor.slug}</FieldLabel>
                      <Input
                        id="slug"
                        placeholder="uma-sequin-dress"
                        aria-invalid={formState.errors.id ? true : undefined}
                        {...register("id")}
                      />
                      {formState.errors.id?.message ? (
                        <FieldError>{formState.errors.id.message}</FieldError>
                      ) : (
                        <FieldDescription>
                          {t.editor.slugHint}
                        </FieldDescription>
                      )}
                    </Field>
                  ) : null}
                  <Field
                    data-invalid={
                      formState.errors.categorySlug ? true : undefined
                    }
                  >
                    <FieldLabel htmlFor="category">
                      {t.editor.category}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="categorySlug"
                      render={({ field }) => (
                        <Select
                          items={(categories.data ?? []).map((c) => ({
                            value: c.slug,
                            label: c.nameRu,
                          }))}
                          value={field.value === "" ? null : field.value}
                          onValueChange={(v) => field.onChange(v ?? "")}
                        >
                          <SelectTrigger
                            id="category"
                            className="w-full"
                            aria-invalid={
                              formState.errors.categorySlug ? true : undefined
                            }
                          >
                            <SelectValue
                              placeholder={t.editor.categoryRequired}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(categories.data ?? []).map((c) => (
                                <SelectItem key={c.slug} value={c.slug}>
                                  {c.nameRu}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {formState.errors.categorySlug?.message ? (
                      <FieldError>
                        {formState.errors.categorySlug.message}
                      </FieldError>
                    ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="tag">{t.editor.tag}</FieldLabel>
                    <Controller
                      control={control}
                      name="tag"
                      render={({ field }) => (
                        <Select
                          items={tagOptions}
                          value={field.value === "" ? NONE : field.value}
                          onValueChange={(v) =>
                            field.onChange(v === NONE ? "" : v)
                          }
                        >
                          <SelectTrigger id="tag" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {tagOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="online-switch">
                      {t.editor.onlineOnly}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="online"
                      render={({ field }) => (
                        <Switch
                          id="online-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="oos-switch">
                      {t.editor.outOfStock}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="outOfStock"
                      render={({ field }) => (
                        <Switch
                          id="oos-switch"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="status-switch">
                      {t.editor.statusLabel}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <Switch
                          id="status-switch"
                          checked={field.value === "published"}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "published" : "draft")
                          }
                        />
                      )}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.editor.sizesCard}</CardTitle>
              </CardHeader>
              <CardContent>
                <SizeEditor />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.editor.colorsCard}</CardTitle>
              </CardHeader>
              <CardContent>
                <ColorSwatches />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-end gap-3 px-6">
            {typeof price === "number" && price > 0 ? (
              <span className="mr-auto text-sm text-muted-foreground tabular-nums">
                {money(price)}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => guardedNavigate("/products")}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.saving : t.common.save}
              <kbd className="rounded border border-primary-foreground/30 px-1 font-sans text-[10px]">
                {t.editor.saveShortcut}
              </kbd>
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

function EditorSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
