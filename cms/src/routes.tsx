import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import { LoginPage } from "@/pages/login"
import { ProductsPage } from "@/pages/products/list"
import { ProductEditorPage } from "@/pages/products/editor"
import { CategoriesPage } from "@/pages/categories"
import { MediaPage } from "@/pages/media"
import { PagesListPage } from "@/pages/pages/list"
import { PageEditorPage } from "@/pages/pages/editor"
import { CopyPage } from "@/pages/copy"
import { SettingsPage } from "@/pages/settings"
import { HomePageEditorPage } from "@/pages/home-page"

const basename = import.meta.env.BASE_URL.replace(/\/$/, "")

export function AppRoutes() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/home-page" element={<HomePageEditorPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductEditorPage />} />
          <Route path="/products/:id" element={<ProductEditorPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/pages" element={<PagesListPage />} />
          <Route path="/pages/:slug" element={<PageEditorPage />} />
          <Route path="/copy" element={<CopyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
