import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"

import { ApiError } from "@/lib/api/client"
import { useLogin } from "@/lib/api/auth"
import { t } from "@/lib/i18n/ru"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useLogin()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          const from = params.get("from")
          navigate(from && from.startsWith("/") ? from : "/products", {
            replace: true,
          })
        },
        onError: (err) => {
          setError(
            err instanceof ApiError && err.status === 401
              ? t.auth.invalid
              : t.auth.error
          )
        },
      }
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="text-center text-xl font-semibold tracking-[0.4em]">
          {t.app.brand}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.auth.heading}</CardTitle>
            <CardDescription>{t.auth.sub}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor="login-email">{t.auth.email}</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    autoFocus
                  />
                </Field>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor="login-password">
                    {t.auth.password}
                  </FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
                <Button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full"
                >
                  {login.isPending ? <Spinner data-icon="inline-start" /> : null}
                  {t.auth.submit}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
