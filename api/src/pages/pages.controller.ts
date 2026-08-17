import { Body, Controller, Get, Header, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import type { Lang, PageUpsertInput, PublicPage } from '@uma/shared';
import { PageUpsertSchema } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';

export const PAGE_SLUGS = ['about', 'delivery', 'returns', 'payment', 'contact'] as const;
const LANGS: Lang[] = ['ru', 'uz', 'en'];

@Controller('api/admin/pages')
@UseGuards(AdminGuard)
export class PagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  private async pageDto(slug: string): Promise<PublicPage> {
    const rows = await this.prisma.infoPage.findMany({ where: { slug } });
    const i18n = Object.fromEntries(
      LANGS.map((lang) => {
        const row = rows.find((r) => r.lang === lang);
        return [lang, { eyebrow: row?.eyebrow ?? '', heading: row?.heading ?? '', body: row?.body ?? '' }];
      }),
    ) as PublicPage['i18n'];
    return { slug, i18n };
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  list(): Promise<PublicPage[]> {
    return Promise.all(PAGE_SLUGS.map((slug) => this.pageDto(slug)));
  }

  @Put(':slug')
  @Header('Cache-Control', 'no-store')
  async put(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(PageUpsertSchema)) body: PageUpsertInput,
  ): Promise<PublicPage> {
    if (!(PAGE_SLUGS as readonly string[]).includes(slug)) {
      throw new NotFoundException({ message: 'Страница не найдена' });
    }
    await this.prisma.$transaction(
      LANGS.map((lang) =>
        this.prisma.infoPage.upsert({
          where: { slug_lang: { slug, lang } },
          update: body[lang],
          create: { slug, lang, ...body[lang] },
        }),
      ),
    );
    await this.content.invalidate();
    return this.pageDto(slug);
  }
}
