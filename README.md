# UMA

Monorepo for the UMA fashion brand (Tashkent): storefront, content API, and admin CMS.

| Package | What it is | Runs as |
| --- | --- | --- |
| `umabranduz/` | Storefront — Vite + React, content loaded at runtime from the API with an offline snapshot fallback | Static site (GitHub Pages) |
| `api/` | Content API — NestJS + Prisma + SQLite, media storage, cookie-JWT admin auth | Railway service (Docker) |
| `cms/` | Admin CMS — React + TypeScript + shadcn/ui | Built into the API image, served at `/admin` |
| `shared/` | `@uma/shared` — wire types + Zod schemas shared across packages | Library |

## Local development

```sh
cd shared && npm ci && npm run build
cd api && npm ci && cp .env.example .env && npm run start:dev   # API on :3001
cd cms && npm ci && npm run dev                                 # admin on :5174
cd umabranduz && npm ci && npm run dev                          # storefront on :5173
```

The API seeds itself with `npm run import` (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`).

## Deployment

### API + admin → Railway

The root `Dockerfile` builds `shared` + `api` + `cms` into one image; the API serves
the admin at `/admin`. On boot, `deploy/bootstrap.mjs` seeds an empty volume from
`deploy/seed/` (content DB + media), applies migrations, and syncs the admin user
from the environment.

1. Railway → New Project → Deploy from GitHub repo (it picks up `railway.json`).
2. Add a **volume** mounted at `/data`.
3. Service variables:

   ```
   DATABASE_URL=file:/data/uma.db
   UPLOADS_DIR=/data/uploads
   MEDIA_BASE_URL=https://<service>.up.railway.app
   JWT_SECRET=<long random string>
   ADMIN_EMAIL=<admin email>
   ADMIN_PASSWORD=<admin password>
   CORS_ORIGIN=https://<github-username>.github.io
   ```

4. Generate a public domain for the service; the admin lives at `https://<domain>/admin`.

### Storefront → GitHub Pages

`.github/workflows/storefront.yml` builds `umabranduz/` and publishes it to Pages on
every push to `main` that touches the storefront.

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Repo Settings → Secrets and variables → Actions → Variables: add
   `VITE_API_URL` = the Railway service URL.
