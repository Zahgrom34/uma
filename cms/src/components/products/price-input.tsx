import { groupDigits } from "@/lib/format"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

/** Money input with live `1 500 000`-style grouping and a UZS suffix. */
export function PriceInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
}: {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  invalid?: boolean
  disabled?: boolean
}) {
  const display = value == null || value === 0 ? "" : groupDigits(value)

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        placeholder="0"
        value={display}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 12)
          onChange(digits === "" ? null : Number(digits))
        }}
      />
      <InputGroupAddon align="inline-end">
        <span className="text-sm text-muted-foreground">UZS</span>
      </InputGroupAddon>
    </InputGroup>
  )
}
