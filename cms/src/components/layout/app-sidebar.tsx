import { NavLink, useLocation } from "react-router"
import {
  FileTextIcon,
  HouseIcon,
  ImageIcon,
  LanguagesIcon,
  LayersIcon,
  LogOutIcon,
  SettingsIcon,
  ShirtIcon,
} from "lucide-react"

import { t } from "@/lib/i18n/ru"
import { useLogout, useMe } from "@/lib/api/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { to: "/home-page", label: t.nav.homePage, icon: HouseIcon },
  { to: "/products", label: t.nav.products, icon: ShirtIcon },
  { to: "/categories", label: t.nav.categories, icon: LayersIcon },
  { to: "/media", label: t.nav.media, icon: ImageIcon },
  { to: "/pages", label: t.nav.pages, icon: FileTextIcon },
  { to: "/copy", label: t.nav.copy, icon: LanguagesIcon },
  { to: "/settings", label: t.nav.settings, icon: SettingsIcon },
]

export function AppSidebar() {
  const location = useLocation()
  const { data } = useMe()
  const logout = useLogout()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-baseline gap-2 overflow-hidden group-data-[collapsible=icon]:px-0.5">
          <span className="text-base font-semibold tracking-[0.35em]">
            {t.app.brand}
          </span>
          <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {t.app.brandSub}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith(item.to)}
                    tooltip={item.label}
                    render={<NavLink to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t.nav.logout}
              onClick={() => logout.mutate()}
            >
              <LogOutIcon />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {data?.user.email}
                </span>
                <span>{t.nav.logout}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
