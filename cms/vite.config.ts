import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/admin/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": process.env.CMS_API_PROXY ?? "http://localhost:3000",
      // only asset subpaths — a bare "/media" prefix would swallow the
      // admin's /media route on hard navigation
      "^/media/.+": process.env.CMS_API_PROXY ?? "http://localhost:3000",
    },
  },
}))
