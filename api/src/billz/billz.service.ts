import { BadGatewayException, BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { BillzShop, BillzSyncReport, BillzTestResult } from '@uma/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { BillzAuthError, BillzClient, BillzNetworkError, BillzProductRow } from './billz.client';

export const LOW_STOCK_THRESHOLD = 3;
const PAGE_LIMIT = 100;
/** Merchant-defined size attribute names, matched case-insensitively (billz-v2 §3.4). */
const SIZE_ATTR = /^(razmer|размер|size)$/i;

interface BillzSyncSettings {
  secretKey: string;
  shopIds: string[]; // BILLZ 2 shop UUIDs; [] = all shops
}

interface RowPricing {
  retail: number;
  promo: number; // 0 = no promo
}

/** Aggregated Billz data for one matched variant group. */
interface SkuGroup {
  retail: number;
  promo: number;
  totalQty: number;
  sizeQty: Map<string, number>; // normalized SIZE → summed qty
}

const normalize = (s: string): string => s.trim().toLowerCase();

@Injectable()
export class BillzService {
  private syncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly client: BillzClient,
  ) {}

  private async readSettings(): Promise<BillzSyncSettings> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'billz' } });
    let stored: { secretKey?: unknown; shopIds?: unknown } = {};
    if (row) {
      try {
        // Legacy billz-v1 rows carry extra fields (username/issuer/officeIds) — ignored here.
        stored = JSON.parse(row.value) as typeof stored;
      } catch {
        stored = {};
      }
    }
    const settings: BillzSyncSettings = {
      secretKey: typeof stored.secretKey === 'string' ? stored.secretKey : '',
      shopIds: Array.isArray(stored.shopIds) ? stored.shopIds.filter((s): s is string => typeof s === 'string' && s !== '') : [],
    };
    if (!settings.secretKey) {
      throw new BadRequestException({ message: 'Укажите данные Billz в настройках' });
    }
    return settings;
  }

  /** Maps typed client errors to the pinned admin-facing HTTP errors. */
  private async guarded<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (e) {
      if (e instanceof BillzAuthError) {
        throw new BadRequestException({ message: 'Неверные данные Billz' });
      }
      if (e instanceof BillzNetworkError) {
        throw new BadGatewayException({ message: 'Billz недоступен, попробуйте позже' });
      }
      throw e;
    }
  }

  /** Paginates GET /v2/products until `count` is covered. */
  private async fetchRows(secretKey: string): Promise<BillzProductRow[]> {
    return this.guarded(async () => {
      const rows: BillzProductRow[] = [];
      let page = 1;
      for (;;) {
        const { count, products } = await this.client.getProducts(secretKey, page, PAGE_LIMIT);
        rows.push(...products);
        if (rows.length >= count || products.length === 0) return rows;
        page += 1;
      }
    });
  }

  async test(): Promise<BillzTestResult> {
    const { secretKey } = await this.readSettings();
    return this.guarded(async () => {
      await this.client.login(secretKey);
      const { count } = await this.client.getProducts(secretKey, 1, 1);
      return { ok: true as const, rows: count };
    });
  }

  async shops(): Promise<BillzShop[]> {
    const { secretKey } = await this.readSettings();
    return this.guarded(async () => {
      const shops = await this.client.getShops(secretKey);
      return shops.map(({ id, name }) => ({ id, name }));
    });
  }

  async status(): Promise<BillzSyncReport | null> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'billzSync' } });
    if (!row) return null;
    try {
      return JSON.parse(row.value) as BillzSyncReport;
    } catch {
      return null;
    }
  }

  async sync(): Promise<BillzSyncReport> {
    if (this.syncing) throw new ConflictException({ message: 'Синхронизация уже выполняется' });
    this.syncing = true;
    try {
      return await this.doSync();
    } finally {
      this.syncing = false;
    }
  }

  /** Size attribute value of a row ('' when the row has no size attribute). */
  private rowSize(row: BillzProductRow): string {
    const attr = (row.product_attributes ?? []).find((a) => SIZE_ATTR.test((a.attribute_name ?? '').trim()));
    return (attr?.attribute_value ?? '').trim().toUpperCase();
  }

  /** Stock qty of a row summed over the selected shops ([] = all shops). */
  private rowQty(row: BillzProductRow, shopIds: string[]): number {
    const selected = new Set(shopIds);
    return (row.shop_measurement_values ?? [])
      .filter((m) => selected.size === 0 || selected.has(m.shop_id))
      .reduce((sum, m) => sum + (m.active_measurement_value ?? 0), 0);
  }

  /** Pricing of one row: the first selected shop present in shop_prices (or the first entry when [] = all). */
  private rowPricing(row: BillzProductRow, shopIds: string[], warnings: string[]): RowPricing {
    const entries = row.shop_prices ?? [];
    const relevant = shopIds.length ? entries.filter((p) => shopIds.includes(p.shop_id)) : entries;
    const pool = relevant.length ? relevant : entries;
    const chosen = shopIds.length ? pool.slice().sort((a, b) => shopIds.indexOf(a.shop_id) - shopIds.indexOf(b.shop_id))[0] : pool[0];
    if (!chosen) return { retail: 0, promo: 0 };
    if (relevant.some((p) => (p.retail_price ?? 0) !== (chosen.retail_price ?? 0) || (p.promo_price ?? 0) !== (chosen.promo_price ?? 0))) {
      warnings.push(`Артикул ${(row.sku ?? '').trim()}: магазины расходятся в цене, взята цена магазина «${chosen.shop_name}»`);
    }
    return { retail: chosen.retail_price ?? 0, promo: chosen.promo_price ?? 0 };
  }

  /**
   * Resolves the variant group for a matched row (billz-v2 §3.3): any variant's sku
   * matches the whole group; a parent row matches its children; simple rows stand alone.
   */
  private resolveGroup(row: BillzProductRow, children: Map<string, BillzProductRow[]>): BillzProductRow[] {
    if (row.parent_id) return children.get(row.parent_id) ?? [row];
    if (row.is_variative) return children.get(row.id) ?? [];
    return [row];
  }

  /** Aggregates a variant group: first row's pricing wins, sizes summed, size-less rows count toward the total only. */
  private aggregate(group: BillzProductRow[], shopIds: string[], warnings: string[]): SkuGroup {
    const result: SkuGroup = { retail: 0, promo: 0, totalQty: 0, sizeQty: new Map() };
    let priced = false;
    for (const row of group) {
      const pricing = this.rowPricing(row, shopIds, warnings);
      if (!priced) {
        result.retail = pricing.retail;
        result.promo = pricing.promo;
        priced = true;
      } else if (pricing.retail !== result.retail || pricing.promo !== result.promo) {
        warnings.push(`Артикул ${(row.sku ?? '').trim()}: строки размеров расходятся в цене, взята цена первой строки`);
      }
      const qty = this.rowQty(row, shopIds);
      result.totalQty += qty;
      const size = this.rowSize(row);
      if (size) result.sizeQty.set(size, (result.sizeQty.get(size) ?? 0) + qty);
    }
    return result;
  }

  private async doSync(): Promise<BillzSyncReport> {
    const settings = await this.readSettings();
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    const warnings: string[] = [];

    const rows = await this.fetchRows(settings.secretKey);

    // Index rows by normalized sku and by parent_id (billz-v2 §3.2).
    const bySkuRow = new Map<string, BillzProductRow>();
    const children = new Map<string, BillzProductRow[]>();
    for (const row of rows) {
      const key = normalize(row.sku ?? '');
      if (key && !bySkuRow.has(key)) bySkuRow.set(key, row);
      if (row.parent_id) {
        const list = children.get(row.parent_id);
        if (list) list.push(row);
        else children.set(row.parent_id, [row]);
      }
    }

    // Match against UMA products by normalized billzSku.
    const products = await this.prisma.product.findMany({
      where: { billzSku: { not: null } },
      include: { sizes: true, translations: { where: { lang: 'ru' }, select: { name: true } } },
    });
    const label = (p: (typeof products)[number]): string => {
      const ru = p.translations[0]?.name?.trim();
      return ru ? `«${ru}» (${p.id})` : p.id;
    };
    const bySku = new Map<string, typeof products>();
    for (const p of products) {
      const key = normalize(p.billzSku ?? '');
      if (!key) continue;
      const list = bySku.get(key);
      if (list) list.push(p);
      else bySku.set(key, [p]);
    }

    const ops = [];
    const unmatchedSkus: string[] = [];
    let matchedProducts = 0;

    for (const [key, prods] of bySku) {
      const row = bySkuRow.get(key);
      if (!row) {
        unmatchedSkus.push((prods[0].billzSku ?? '').trim());
        continue;
      }
      const group = this.aggregate(this.resolveGroup(row, children), settings.shopIds, warnings);
      if (prods.length > 1) {
        warnings.push(`Артикул ${(prods[0].billzSku ?? '').trim()} указан у нескольких товаров: ${prods.map((p) => p.id).join(', ')} — обновлены все`);
      }
      for (const product of prods) {
        matchedProducts += 1;

        // Pricing (billz-v2 §3.5): active promo → sale with rounded prices; sale coherence guaranteed.
        let price = Math.round(group.retail);
        let oldPrice: number | null = null;
        let sale = false;
        if (group.promo > 0 && group.promo < group.retail) {
          const promo = Math.round(group.promo);
          if (price > promo) {
            sale = true;
            oldPrice = price;
            price = promo;
          }
        }

        // Per-size stock.
        const seenSizes = new Set<string>();
        for (const s of product.sizes) {
          const norm = s.size.trim().toUpperCase();
          const qty = group.sizeQty.get(norm);
          if (qty === undefined) {
            warnings.push(`Товар ${label(product)}: размер ${s.size} не найден в Billz, оставлен без изменений`);
            continue;
          }
          seenSizes.add(norm);
          ops.push(
            this.prisma.productSize.update({
              where: { productId_size: { productId: product.id, size: s.size } },
              data: {
                available: qty > 0,
                lowStockQty: qty > 0 && qty <= LOW_STOCK_THRESHOLD ? Math.round(qty) : null,
              },
            }),
          );
        }
        for (const size of group.sizeQty.keys()) {
          if (!seenSizes.has(size)) {
            warnings.push(`Товар ${label(product)}: размер ${size} есть в Billz, но не заведён в UMA — пропущен`);
          }
        }

        const totalQty = Math.round(group.totalQty);
        ops.push(
          this.prisma.product.update({
            where: { id: product.id },
            data: { price, oldPrice, sale, stock: totalQty, outOfStock: totalQty === 0 },
          }),
        );
      }
    }

    let updatedProducts = 0;
    let error: string | null = null;
    if (ops.length) {
      try {
        await this.prisma.$transaction(ops);
        updatedProducts = matchedProducts;
        await this.content.invalidate();
      } catch {
        error = 'Не удалось сохранить изменения — синхронизация отменена, данные не изменились';
      }
    }

    const report: BillzSyncReport = {
      startedAt,
      durationMs: Date.now() - t0,
      totalRows: rows.length,
      matchedProducts,
      updatedProducts,
      unmatchedSkus: unmatchedSkus.slice(0, 50),
      warnings,
      error,
    };
    await this.prisma.setting.upsert({
      where: { key: 'billzSync' },
      update: { value: JSON.stringify(report) },
      create: { key: 'billzSync', value: JSON.stringify(report) },
    });
    return report;
  }
}
