import { BadRequestException, Body, Controller, Get, Header, Put, UseGuards } from '@nestjs/common';
import type { BillzSettings, HeroSettingsInput, SettingsInput } from '@uma/shared';
import { SettingsSchema } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';

type SettingsDto = {
  commerce: { freeShipThreshold: number; flatShipping: number };
  contact: { phone: string; email: string; hoursWeekdays: string; hoursWeekend: string };
  socialLinks: { label: string; href: string }[];
  hero: { slides: { mediaId: string }[] } | null;
  billz: BillzSettings;
};

/**
 * Shape of the `billz` Setting row at rest — the real secret, never sent to the client.
 * Legacy billz-v1 rows carry extra fields (username/issuer/officeIds): ignored on read,
 * rewritten clean on the next PUT.
 */
type StoredBillz = { secretKey?: string; shopIds?: string[] };

const DEFAULTS: SettingsDto = {
  commerce: { freeShipThreshold: 1500000, flatShipping: 35000 },
  contact: { phone: '', email: '', hoursWeekdays: '', hoursWeekend: '' },
  socialLinks: [],
  hero: null,
  billz: { secretKey: '', secretKeySet: false, shopIds: [] },
};

@Controller('api/admin/settings')
@UseGuards(AdminGuard)
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  /** Zod checks slide count; the asset mix (1 video XOR 1–3 images) needs the DB. */
  private async validateHero(hero: HeroSettingsInput): Promise<void> {
    const ids = hero.slides.map((s) => s.mediaId);
    const assets = await this.prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
    const byId = new Map(assets.map((a) => [a.id, a] as const));
    if (ids.some((id) => !byId.has(id))) {
      throw new BadRequestException({ message: 'Медиафайл не найден', fieldErrors: { hero: 'Медиафайл не найден' } });
    }
    const kinds = ids.map((id) => byId.get(id)!.kind);
    const videos = kinds.filter((k) => k === 'video').length;
    const valid = (videos === 1 && kinds.length === 1) || (videos === 0 && kinds.length >= 1 && kinds.length <= 3);
    if (!valid) {
      throw new BadRequestException({
        message: 'Баннер — это одно видео или до трёх фотографий',
        fieldErrors: { hero: 'Баннер — это одно видео или до трёх фотографий' },
      });
    }
  }

  private async read(): Promise<SettingsDto> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: ['commerce', 'contact', 'socialLinks', 'hero', 'billz'] } } });
    const result: SettingsDto = structuredClone(DEFAULTS);
    for (const row of rows) {
      try {
        (result as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      } catch {
        /* keep default */
      }
    }
    // The secret never leaves the server: the client sees only whether one is stored.
    const stored = result.billz as StoredBillz;
    result.billz = {
      secretKey: '',
      secretKeySet: typeof stored.secretKey === 'string' && stored.secretKey !== '',
      shopIds: Array.isArray(stored.shopIds) ? stored.shopIds.filter((s) => typeof s === 'string' && s !== '') : [],
    };
    return result;
  }

  /** '' on PUT keeps the stored secret; a non-empty value replaces it. `secretKeySet` is stripped by Zod. */
  private async resolveBillzSecret(incoming: string): Promise<string> {
    if (incoming !== '') return incoming;
    const row = await this.prisma.setting.findUnique({ where: { key: 'billz' } });
    if (!row) return '';
    try {
      const stored = JSON.parse(row.value) as StoredBillz;
      return typeof stored.secretKey === 'string' ? stored.secretKey : '';
    } catch {
      return '';
    }
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  get(): Promise<SettingsDto> {
    return this.read();
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  async put(@Body(new ZodValidationPipe(SettingsSchema)) body: SettingsInput): Promise<SettingsDto> {
    if (body.hero != null) await this.validateHero(body.hero);
    const payload: Record<string, unknown> = { ...body };
    if (body.billz) {
      payload.billz = { ...body.billz, secretKey: await this.resolveBillzSecret(body.billz.secretKey) };
    }
    const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        value === null
          ? this.prisma.setting.deleteMany({ where: { key } }) // hero: null clears the stored hero
          : this.prisma.setting.upsert({
              where: { key },
              update: { value: JSON.stringify(value) },
              create: { key, value: JSON.stringify(value) },
            }),
      ),
    );
    await this.content.invalidate();
    return this.read();
  }
}
