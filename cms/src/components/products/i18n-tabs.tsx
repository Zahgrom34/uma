import { useFormContext } from "react-hook-form"
import { CopyIcon } from "lucide-react"

import type { Lang } from "@/lib/api/types"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { EditorForm } from "./form"
import { LANGS } from "./form"

const langLabels: Record<Lang, string> = {
  ru: t.editor.langRu,
  uz: t.editor.langUz,
  en: t.editor.langEn,
}

export function I18nTabs({
  activeLang,
  onLangChange,
}: {
  activeLang: Lang
  onLangChange: (lang: Lang) => void
}) {
  const { register, formState, getValues, setValue } =
    useFormContext<EditorForm>()

  const copyFromRu = (lang: Lang) => {
    const ru = getValues("i18n.ru")
    for (const field of ["name", "color", "material", "desc"] as const) {
      setValue(`i18n.${lang}.${field}`, ru[field], {
        shouldDirty: true,
        shouldValidate: formState.isSubmitted,
      })
    }
  }

  return (
    <Tabs
      value={activeLang}
      onValueChange={(v) => onLangChange(v as Lang)}
      className="gap-4"
    >
      <TabsList className="w-full">
        {LANGS.map((lang) => {
          const hasErrors = Boolean(formState.errors.i18n?.[lang])
          return (
            <TabsTrigger key={lang} value={lang}>
              {langLabels[lang]}
              {hasErrors ? (
                <span
                  className="size-1.5 rounded-full bg-destructive"
                  role="img"
                  aria-label={t.editor.tabErrors}
                />
              ) : null}
            </TabsTrigger>
          )
        })}
      </TabsList>
      {LANGS.map((lang) => {
        const errors = formState.errors.i18n?.[lang]
        return (
          <TabsContent key={lang} value={lang}>
            <FieldGroup>
              {lang !== "ru" ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyFromRu(lang)}
                  >
                    <CopyIcon data-icon="inline-start" />
                    {t.editor.copyFromRu}
                  </Button>
                </div>
              ) : null}
              <Field data-invalid={errors?.name ? true : undefined}>
                <FieldLabel htmlFor={`i18n-${lang}-name`}>
                  {t.editor.fieldName}
                </FieldLabel>
                <Input
                  id={`i18n-${lang}-name`}
                  aria-invalid={errors?.name ? true : undefined}
                  {...register(`i18n.${lang}.name`)}
                />
                {errors?.name?.message ? (
                  <FieldError>{errors.name.message}</FieldError>
                ) : null}
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`i18n-${lang}-color`}>
                    {t.editor.fieldColor}
                  </FieldLabel>
                  <Input
                    id={`i18n-${lang}-color`}
                    {...register(`i18n.${lang}.color`)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`i18n-${lang}-material`}>
                    {t.editor.fieldMaterial}
                  </FieldLabel>
                  <Input
                    id={`i18n-${lang}-material`}
                    {...register(`i18n.${lang}.material`)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`i18n-${lang}-desc`}>
                  {t.editor.fieldDesc}
                </FieldLabel>
                <Textarea
                  id={`i18n-${lang}-desc`}
                  rows={6}
                  {...register(`i18n.${lang}.desc`)}
                />
              </Field>
            </FieldGroup>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
