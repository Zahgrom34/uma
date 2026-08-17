/**
 * Idempotent seed/import per contract cms-v1 §3.
 *
 *   npm run import    — seed admin, categories, 21 legacy products (+localized images),
 *                       5 info pages, UI strings, settings; then write the storefront snapshot.
 *   npm run snapshot  — only rebuild umabranduz/src/content-snapshot.json from the current DB.
 */
import '../src/env';
import 'reflect-metadata';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MediaService } from '../src/media/media.service';
import { ContentService } from '../src/content/content.service';
import { categories, commerce, contact, pageCopy, productCopy, socialLinks, uiStrings } from '../seed/copy';

const ROOT = path.resolve(__dirname, '..', '..');
const STOREFRONT = path.join(ROOT, 'umabranduz');
const SNAPSHOT_PATH = path.join(STOREFRONT, 'src', 'content-snapshot.json');

interface LegacyProduct {
  id: string;
  name: string;
  cat: string;
  price: number;
  oldPrice?: number;
  sale?: boolean;
  color: string;
  material: string;
  desc: string;
  tag?: string;
  online?: boolean;
  outOfStock?: boolean;
  stock?: number;
  sizeGuide?: string;
  sizeValues?: string[];
  colorVariants?: string[];
  unavailableSizes?: string[];
  lowStockSizes?: Record<string, number>;
  img: string;
  img2?: string;
}

const TAG_MAP: Record<string, string> = { New: 'new', Sale: 'sale', 'Online Exclusive': 'online-exclusive' };

async function downloadWithRetry(url: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn(`  download attempt ${attempt}/3 failed for ${url}: ${(err as Error).message}`);
    }
  }
  return null;
}

async function main(): Promise<void> {
  const snapshotOnly = process.argv.includes('--snapshot-only');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const media = app.get(MediaService);
  const content = app.get(ContentService);

  try {
    if (!snapshotOnly) {
      // 1. Admin user
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment (see .env.example)');
      const passwordHash = await argon2.hash(password);
      await prisma.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
      console.log(`Admin user: ${email}`);

      // 2. Categories
      for (const [index, c] of categories.entries()) {
        await prisma.category.upsert({
          where: { slug: c.slug },
          update: { nameRu: c.nameRu, nameUz: c.nameUz, nameEn: c.nameEn, sortOrder: index },
          create: { ...c, sortOrder: index },
        });
      }
      const categoryByNameRu = new Map(
        (await prisma.category.findMany()).map((c) => [c.nameRu, c] as const),
      );
      console.log(`Categories: ${categoryByNameRu.size}`);

      // 3. Legacy products from umabranduz/src/data.js (imported directly, never edited)
      // Native dynamic import (kept out of TS's CJS transform) — data.js is an ES module.
      const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<unknown>;
      const dataModule = (await dynamicImport(pathToFileURL(path.join(STOREFRONT, 'src', 'data.js')).href)) as {
        products: LegacyProduct[];
      };
      const legacyProducts = dataModule.products;
      console.log(`Legacy products: ${legacyProducts.length}`);

      let imagesOk = 0;
      let imagesFailed = 0;

      for (const [index, p] of legacyProducts.entries()) {
        const category = categoryByNameRu.get(p.cat);
        if (!category) {
          console.warn(`  skip ${p.id}: unknown category «${p.cat}»`);
          continue;
        }

        // Images → local MediaAssets through the sharp pipeline
        const mediaIds: string[] = [];
        for (const src of [p.img, p.img2].filter((x): x is string => Boolean(x))) {
          try {
            if (/^https?:\/\//.test(src)) {
              const existing = await media.findBySourceUrl(src);
              if (existing) {
                mediaIds.push(existing.id);
                imagesOk++;
                continue;
              }
              const buffer = await downloadWithRetry(src);
              if (!buffer) {
                imagesFailed++;
                console.warn(`  image failed (skipped): ${src}`);
                continue;
              }
              const dto = await media.ingest(buffer, path.basename(new URL(src).pathname), src);
              mediaIds.push(dto.id);
              imagesOk++;
            } else {
              const rel = src.replace(/^\.\//, '');
              const file = path.join(STOREFRONT, 'public', rel);
              const buffer = await fs.readFile(file);
              const dto = await media.ingest(buffer, path.basename(file), `legacy:${rel}`);
              mediaIds.push(dto.id);
              imagesOk++;
            }
          } catch (err) {
            imagesFailed++;
            console.warn(`  image failed (skipped): ${src}: ${(err as Error).message}`);
          }
        }

        // Sizes: unavailableSizes → available=false; lowStockSizes → available=true + qty
        const sizeRows = new Map<string, { available: boolean; lowStockQty: number | null }>();
        for (const size of p.unavailableSizes ?? []) sizeRows.set(String(size), { available: false, lowStockQty: null });
        for (const [size, qty] of Object.entries(p.lowStockSizes ?? {})) {
          if (!sizeRows.has(String(size))) sizeRows.set(String(size), { available: true, lowStockQty: qty });
        }

        const copy = productCopy[p.id];
        if (!copy) console.warn(`  ${p.id}: no uz/en copy found, seeding ru only`);
        const translations = [
          { lang: 'ru', name: p.name, color: p.color, material: p.material, desc: p.desc },
          ...(copy
            ? [
                { lang: 'uz', ...copy.uz },
                { lang: 'en', ...copy.en },
              ]
            : []),
        ];

        const base = {
          categoryId: category.id,
          price: p.price,
          oldPrice: p.oldPrice ?? null,
          sale: Boolean(p.sale),
          tag: p.tag ? (TAG_MAP[p.tag] ?? null) : null,
          online: Boolean(p.online),
          outOfStock: Boolean(p.outOfStock),
          stock: p.stock ?? null,
          sizeGuide: p.sizeGuide ?? null,
          sizeValues: p.sizeValues ? JSON.stringify(p.sizeValues.map(String)) : null,
          colorVariants: p.colorVariants ? JSON.stringify(p.colorVariants) : null,
          status: 'published',
          sortOrder: index,
        };
        await prisma.product.upsert({ where: { id: p.id }, update: base, create: { id: p.id, ...base } });
        await prisma.$transaction([
          prisma.productTranslation.deleteMany({ where: { productId: p.id } }),
          prisma.productTranslation.createMany({ data: translations.map((t) => ({ productId: p.id, ...t })) }),
          prisma.productSize.deleteMany({ where: { productId: p.id } }),
          prisma.productSize.createMany({
            data: [...sizeRows.entries()].map(([size, row]) => ({ productId: p.id, size, ...row })),
          }),
          prisma.productImage.deleteMany({ where: { productId: p.id } }),
          prisma.productImage.createMany({
            data: mediaIds.map((mediaId, sortOrder) => ({ productId: p.id, mediaId, sortOrder })),
          }),
        ]);
        console.log(`  ${p.id}: ${mediaIds.length} image(s)`);
      }
      console.log(`Images localized: ${imagesOk} ok, ${imagesFailed} failed`);

      // 4. Info pages (5 slugs × 3 langs)
      let pageCount = 0;
      for (const [lang, pages] of Object.entries(pageCopy)) {
        for (const [slug, [eyebrow, heading, body]] of Object.entries(pages)) {
          await prisma.infoPage.upsert({
            where: { slug_lang: { slug, lang } },
            update: { eyebrow, heading, body },
            create: { slug, lang, eyebrow, heading, body },
          });
          pageCount++;
        }
      }
      console.log(`Info pages: ${pageCount} rows`);

      // 5. UI strings
      for (const [key, value] of Object.entries(uiStrings)) {
        await prisma.uiString.upsert({
          where: { key },
          update: { ru: value.ru, uz: value.uz, en: value.en },
          create: { key, ru: value.ru, uz: value.uz, en: value.en },
        });
      }
      console.log(`UI strings: ${Object.keys(uiStrings).length} keys`);

      // 6. Settings
      const settings: Record<string, unknown> = { commerce, contact, socialLinks };
      for (const [key, value] of Object.entries(settings)) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        });
      }
      await content.invalidate();
      console.log('Settings: commerce, contact, socialLinks');
    }

    // 7. Snapshot for the storefront fallback
    const bundle = await content.buildBundle();
    await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
    console.log(`Snapshot written: ${SNAPSHOT_PATH} (${bundle.products.length} products)`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
