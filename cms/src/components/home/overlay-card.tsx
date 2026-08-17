import * as React from "react"

import type { Lang, UiStringDto } from "@/lib/api/types"
import { useSaveUiStrings } from "@/lib/api/ui-strings"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import type { CardController } from "./card-controller"

const HERO_KEYS = ["heroSeason", "heroCollection", "heroShop"] as const
type HeroKey = (typeof HERO_KEYS)[number]

const LANGS: Lang[] = ["ru", "uz", "en"]

const langLabels: Record<Lang, string> = {
  ru: t.editor.langRu,
  uz: t.editor.langUz,
  en: t.editor.langEn,
}

const fieldLabels: Record<HeroKey, string> = {
  heroSeason: t.home.fieldSeason,
  heroCollection: t.home.fieldHeading,
  heroShop: t.home.fieldButton,
}

type Values = Record<HeroKey, Record<Lang, string>>

function fromRows(rows: UiStringDto[]): Values {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const values = {} as Values
  for (const key of HERO_KEYS) {
    const row = byKey.get(key)
    values[key] = { ru: row?.ru ?? "", uz: row?.uz ?? "", en: row?.en ?? "" }
  }
  return values
}

function sig(v: Values): string {
  return JSON.stringify(v)
}

export function OverlayCard({
  rows,
  register,
}: {
  rows: UiStringDto[]
  register: (c: CardController | null) => void
}) {
  const saveUiStrings = useSaveUiStrings()
  const [values, setValues] = React.useState<Values>(() => fromRows(rows))
  const [initialSig, setInitialSig] = React.useState<string>(() =>
    sig(fromRows(rows))
  )

  const dirty = sig(values) !== initialSig
  const saving = saveUiStrings.isPending

  const save = React.useCallback(() => {
    const byKey = new Map(rows.map((r) => [r.key, r]))
    const payload: UiStringDto[] = HERO_KEYS.map((key) => ({
      ...(byKey.get(key) ?? { key }),
      key,
      ru: values[key].ru,
      uz: values[key].uz,
      en: values[key].en,
    }))
    saveUiStrings.mutate(payload, {
      onSuccess: () => {
        toast.add({ type: "success", title: t.toasts.saved })
        setInitialSig(sig(values))
      },
      onError: () =>
        toast.add({
          type: "error",
          title: t.toasts.saveFailed,
          description: t.toasts.saveFailedDesc,
        }),
    })
  }, [rows, saveUiStrings, values])

  React.useEffect(() => {
    register({ isDirty: () => dirty && !saving, save })
    return () => register(null)
  }, [register, dirty, saving, save])

  const setValue = (key: HeroKey, lang: Lang, value: string) =>
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.home.overlayCard}</CardTitle>
        <CardDescription>{t.home.overlayDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ru" className="gap-4">
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
                {HERO_KEYS.map((key) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`hero-${key}-${lang}`}>
                      {fieldLabels[key]}
                    </FieldLabel>
                    <Input
                      id={`hero-${key}-${lang}`}
                      value={values[key][lang]}
                      onChange={(e) => setValue(key, lang, e.target.value)}
                    />
                  </Field>
                ))}
              </FieldGroup>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" disabled={!dirty || saving} onClick={save}>
          {saving ? t.common.saving : t.common.save}
        </Button>
      </CardFooter>
    </Card>
  )
}
