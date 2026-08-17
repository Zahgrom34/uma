import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ContentBundle, Lang, MediaKind, PublicPage } from '@uma/shared';
import { PrismaService } from '../prisma/prisma.service';
import { productInclude, toPublicProduct } from '../products/product.mapper';
import { mediaUrl } from './media-url';

const LANGS: Lang[] = ['ru', 'uz', 'en'];

interface CachedContent {
  body: string;
  etag: string;
}

@Injectable()
export class ContentService {
  private cache: CachedContent | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Bump the content version and drop the cached bundle. Called on every admin write. */
  async invalidate(): Promise<void> {
    this.cache = null;
    await this.prisma.setting.upsert({
      where: { key: 'contentVersion' },
      update: { value: JSON.stringify(new Date().toISOString()) },
      create: { key: 'contentVersion', value: JSON.stringify(new Date().toISOString()) },
    });
  }

  async getCached(): Promise<CachedContent> {
    if (this.cache) return this.cache;
    const bundle = await this.buildBundle();
    const body = JSON.stringify(bundle);
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`;
    this.cache = { body, etag };
    return this.cache;
  }

  async buildBundle(): Promise<ContentBundle> {
    const [products, categories, pages, uiStrings, settings] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: 'published' },
        include: productInclude,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.infoPage.findMany(),
      this.prisma.uiString.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.setting.findMany(),
    ]);

    const settingsMap = new Map(settings.map((s) => [s.key, s.value] as const));
    const parse = <T>(key: string, fallback: T): T => {
      const raw = settingsMap.get(key);
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const pagesBySlug = new Map<string, PublicPage>();
    for (const page of pages) {
      let entry = pagesBySlug.get(page.slug);
      if (!entry) {
        entry = {
          slug: page.slug,
          i18n: Object.fromEntries(LANGS.map((l) => [l, { eyebrow: '', heading: '', body: '' }])) as PublicPage['i18n'],
        };
        pagesBySlug.set(page.slug, entry);
      }
      if ((LANGS as string[]).includes(page.lang)) {
        entry.i18n[page.lang as Lang] = { eyebrow: page.eyebrow, heading: page.heading, body: page.body };
      }
    }

    const uiStringsMap: ContentBundle['uiStrings'] = {};
    for (const s of uiStrings) uiStringsMap[s.key] = { ru: s.ru, uz: s.uz, en: s.en };

    // Hero slides resolved to absolute media URLs; slides whose asset vanished are dropped.
    const heroStored = parse<{ slides?: { mediaId?: string }[] } | null>('hero', null);
    let hero: ContentBundle['settings']['hero'] = [];
    const heroIds = (heroStored?.slides ?? []).map((s) => s.mediaId).filter((id): id is string => Boolean(id));
    if (heroIds.length) {
      const assets = await this.prisma.mediaAsset.findMany({ where: { id: { in: heroIds } } });
      const byId = new Map(assets.map((a) => [a.id, a] as const));
      hero = heroIds
        .map((id) => byId.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ type: a.kind as MediaKind, src: mediaUrl(a.filename) }));
    }

    return {
      version: parse('contentVersion', new Date(0).toISOString()),
      products: products.map(toPublicProduct),
      categories: categories.map((c) => ({
        slug: c.slug,
        nameRu: c.nameRu,
        nameUz: c.nameUz,
        nameEn: c.nameEn,
        sortOrder: c.sortOrder,
      })),
      pages: [...pagesBySlug.values()],
      uiStrings: uiStringsMap,
      settings: {
        commerce: parse('commerce', { freeShipThreshold: 1500000, flatShipping: 35000 }),
        hero,
        socialLinks: parse('socialLinks', [] as { label: string; href: string }[]),
      },
    };
  }
}
