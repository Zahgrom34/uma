import * as React from "react"
import { useParams } from "react-router"
import { useForm } from "react-hook-form"

import type { Lang, PublicPage } from "@/lib/api/types"
import { usePages, useSavePage } from "@/lib/api/pages"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { DataState, EmptyState } from "@/components/shared/data-state"
import {
  useDirtyGuard,
  useNavigationGuardContext,
} from "@/components/shared/navigation-guard-context"

const LANGS: Lang[] = ["ru", "uz", "en"]

const langLabels: Record<Lang, string> = {
  ru: t.editor.langRu,
  uz: t.editor.langUz,
  en: t.editor.langEn,
}

type PageForm = PublicPage["i18n"]

export function PageEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const pages = usePages()
  const savePage = useSavePage()
  const { guardedNavigate } = useNavigationGuardContext()
  const [activeLang, setActiveLang] = React.useState<Lang>("ru")

  const page = (pages.data ?? []).find((p) => p.slug === slug)

  const form = useForm<PageForm>()
  const { register, handleSubmit, reset, formState } = form

  React.useEffect(() => {
    if (page) reset(page.i18n)
  }, [page, reset])

  useDirtyGuard(() => formState.isDirty && !savePage.isPending)

  const submit = handleSubmit((values) => {
    if (!slug) return
    savePage.mutate(
      { slug, i18n: values },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          reset(values)
        },
        onError: () =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: t.toasts.saveFailedDesc,
          }),
      }
    )
  })

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

  const notFound = pages.data !== undefined && page === undefined

  return (
    <DataState
      isLoading={pages.isPending}
      isError={pages.isError}
      onRetry={() => void pages.refetch()}
      isEmpty={notFound}
      skeleton={<PageEditorSkeleton />}
      empty={
        <EmptyState
          title={t.pages.notFoundTitle}
          description=""
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => guardedNavigate("/pages")}
            >
              {t.common.back}
            </Button>
          }
        />
      }
    >
      <form
        onSubmit={submit}
        noValidate
        className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-20"
      >
        <h1 className="text-lg font-semibold">
          {slug ? (t.pages.slugNames[slug] ?? slug) : ""}
        </h1>
        <Card>
          <CardContent>
            <Tabs
              value={activeLang}
              onValueChange={(v) => setActiveLang(v as Lang)}
              className="gap-4"
            >
              <TabsList className="w-full">
                {LANGS.map((lang) => (
                  <TabsTrigger key={lang} value={lang}>
                    {langLabels[lang]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LANGS.map((lang) => (
                <TabsContent key={lang} value={lang}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`page-${lang}-eyebrow`}>
                        {t.pages.eyebrow}
                      </FieldLabel>
                      <Input
                        id={`page-${lang}-eyebrow`}
                        {...register(`${lang}.eyebrow`)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`page-${lang}-heading`}>
                        {t.pages.heading}
                      </FieldLabel>
                      <Input
                        id={`page-${lang}-heading`}
                        {...register(`${lang}.heading`)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`page-${lang}-body`}>
                        {t.pages.body}
                      </FieldLabel>
                      <Textarea
                        id={`page-${lang}-body`}
                        rows={12}
                        {...register(`${lang}.body`)}
                      />
                    </Field>
                  </FieldGroup>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <div className="sticky bottom-0 -mx-6 -mb-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-end gap-3 px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => guardedNavigate("/pages")}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={savePage.isPending}>
              {savePage.isPending ? t.common.saving : t.common.save}
              <kbd className="rounded border border-primary-foreground/30 px-1 font-sans text-[10px]">
                {t.editor.saveShortcut}
              </kbd>
            </Button>
          </div>
        </div>
      </form>
    </DataState>
  )
}

function PageEditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
