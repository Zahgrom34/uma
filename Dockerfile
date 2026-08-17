# Railway image: NestJS API + built CMS admin served at /admin.
# The storefront (umabranduz/) is NOT part of this image — it deploys to GitHub Pages.
FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# @uma/shared — api depends on it via file:../shared, so it must exist first.
COPY shared/package.json shared/package-lock.json shared/
RUN cd shared && npm ci
COPY shared/ shared/
RUN cd shared && npm run build

# API (dev deps stay in the image: prisma CLI runs migrations at boot).
COPY api/package.json api/package-lock.json api/
RUN cd api && npm ci
COPY api/ api/
RUN cd api && npx prisma generate && npm run build

# CMS admin — static build the API serves at /admin.
COPY cms/package.json cms/package-lock.json cms/
RUN cd cms && npm ci
COPY cms/ cms/
RUN cd cms && npm run build

# First-boot seed data (content DB + media) and the bootstrap script.
COPY deploy/ deploy/

ENV NODE_ENV=production
WORKDIR /app/api
EXPOSE 3000
CMD ["sh", "-c", "node ../deploy/bootstrap.mjs && node dist/src/main.js"]
