import * as React from "react"
import {
  FileTextIcon,
  HouseIcon,
  ImageIcon,
  LanguagesIcon,
  LayersIcon,
  PlusIcon,
  SettingsIcon,
  ShirtIcon,
} from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { useNavigationGuardContext } from "@/components/shared/navigation-guard-context"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const navItems = [
  { to: "/home-page", label: t.nav.homePage, icon: HouseIcon },
  { to: "/products", label: t.nav.products, icon: ShirtIcon },
  { to: "/categories", label: t.nav.categories, icon: LayersIcon },
  { to: "/media", label: t.nav.media, icon: ImageIcon },
  { to: "/pages", label: t.nav.pages, icon: FileTextIcon },
  { to: "/copy", label: t.nav.copy, icon: LanguagesIcon },
  { to: "/settings", label: t.nav.settings, icon: SettingsIcon },
]

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { guardedNavigate } = useNavigationGuardContext()

  const go = React.useCallback(
    (to: string) => {
      onOpenChange(false)
      guardedNavigate(to)
    },
    [guardedNavigate, onOpenChange]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.palette.placeholder}
      description={t.palette.placeholder}
    >
      <Command>
        <CommandInput placeholder={t.palette.placeholder} />
        <CommandList>
          <CommandEmpty>{t.palette.empty}</CommandEmpty>
        <CommandGroup heading={t.palette.navigation}>
          {navItems.map((item) => (
            <CommandItem key={item.to} onSelect={() => go(item.to)}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t.palette.actions}>
          <CommandItem onSelect={() => go("/products/new")}>
            <PlusIcon />
            {t.palette.newProduct}
          </CommandItem>
        </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
