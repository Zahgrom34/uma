import { t } from "@/lib/i18n/ru"

const NBSP = " "

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  useGrouping: true,
  maximumFractionDigits: 0,
})

/** `1 500 000 UZS` — NBSP-grouped ru-RU + currency suffix. */
export function money(value: number): string {
  return `${moneyFormatter.format(value).replace(/\s/g, NBSP)}${NBSP}UZS`
}

/** Digit grouping only, no currency — for live input previews. */
export function groupDigits(value: number): string {
  return moneyFormatter.format(value).replace(/\s/g, NBSP)
}

/** dd.mm.yyyy from an ISO string or Date. */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

/** Russian pluralization: plural(n, [one, few, many]) picks the right form. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

/** Count + correctly pluralized noun, NBSP-joined. */
export function countNoun(n: number, forms: [string, string, string]): string {
  return `${n}${NBSP}${plural(n, forms)}`
}

const sizeUnits = t.units.bytes

/** File size in Russian units. */
export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < sizeUnits.length - 1) {
    value /= 1024
    unit += 1
  }
  const rendered =
    unit === 0 ? String(value) : value.toFixed(1).replace(".", ",")
  return `${rendered}${NBSP}${sizeUnits[unit]}`
}
