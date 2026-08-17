import * as React from "react"
import { Controller, useForm } from "react-hook-form"

import { ApiError } from "@/lib/api/client"
import { useSaveSettings, useSettings } from "@/lib/api/settings"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { DataState } from "@/components/shared/data-state"
import { PriceInput } from "@/components/products/price-input"
import { SocialLinksCard } from "@/components/settings/social-links-card"

interface DeliveryForm {
  freeShipThreshold: number | null
  flatShipping: number | null
}

function saveErrorDescription(err: unknown): string {
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
    const fieldMessage = Object.values(err.fieldErrors)[0]
    if (fieldMessage) return fieldMessage
    if (err.message) return err.message
  }
  return t.toasts.saveFailedDesc
}

export function SettingsPage() {
  const settings = useSettings()
  const saveSettings = useSaveSettings()

  const { control, handleSubmit, reset, formState } = useForm<DeliveryForm>({
    defaultValues: { freeShipThreshold: null, flatShipping: null },
  })

  React.useEffect(() => {
    if (settings.data) {
      reset({
        freeShipThreshold: settings.data.commerce.freeShipThreshold,
        flatShipping: settings.data.commerce.flatShipping,
      })
    }
  }, [settings.data, reset])

  const submit = handleSubmit((values) => {
    if (
      !settings.data ||
      values.freeShipThreshold == null ||
      values.flatShipping == null
    )
      return
    // Read-modify-write: contact/socialLinks идут обратно без изменений.
    saveSettings.mutate(
      {
        ...settings.data,
        commerce: {
          freeShipThreshold: values.freeShipThreshold,
          flatShipping: values.flatShipping,
        },
      },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: t.toasts.saved })
          reset(values)
        },
        onError: (err) =>
          toast.add({
            type: "error",
            title: t.toasts.saveFailed,
            description: saveErrorDescription(err),
          }),
      }
    )
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-semibold">{t.settings.title}</h1>
      <DataState
        isLoading={settings.isPending}
        isError={settings.isError}
        onRetry={() => void settings.refetch()}
        skeleton={<SettingsSkeleton />}
      >
        <div className="flex flex-col gap-6">
        <form onSubmit={submit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.deliveryCard}</CardTitle>
              <CardDescription>{t.settings.deliveryDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field
                  data-invalid={
                    formState.errors.freeShipThreshold ? true : undefined
                  }
                >
                  <FieldLabel htmlFor="free-ship-threshold">
                    {t.settings.freeShipThreshold}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="freeShipThreshold"
                    rules={{
                      validate: (v) =>
                        v != null || t.settings.amountRequired,
                    }}
                    render={({ field }) => (
                      <PriceInput
                        id="free-ship-threshold"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(formState.errors.freeShipThreshold)}
                      />
                    )}
                  />
                  {formState.errors.freeShipThreshold?.message ? (
                    <FieldError>
                      {formState.errors.freeShipThreshold.message}
                    </FieldError>
                  ) : (
                    <FieldDescription>
                      {t.settings.freeShipThresholdHint}
                    </FieldDescription>
                  )}
                </Field>
                <Field
                  data-invalid={
                    formState.errors.flatShipping ? true : undefined
                  }
                >
                  <FieldLabel htmlFor="flat-shipping">
                    {t.settings.flatShipping}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="flatShipping"
                    rules={{
                      validate: (v) =>
                        v != null || t.settings.amountRequired,
                    }}
                    render={({ field }) => (
                      <PriceInput
                        id="flat-shipping"
                        value={field.value}
                        onChange={field.onChange}
                        invalid={Boolean(formState.errors.flatShipping)}
                      />
                    )}
                  />
                  {formState.errors.flatShipping?.message ? (
                    <FieldError>
                      {formState.errors.flatShipping.message}
                    </FieldError>
                  ) : (
                    <FieldDescription>
                      {t.settings.flatShippingHint}
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? t.common.saving : t.common.save}
              </Button>
            </CardFooter>
          </Card>
        </form>
        {settings.data ? <SocialLinksCard settings={settings.data} /> : null}
        </div>
      </DataState>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
