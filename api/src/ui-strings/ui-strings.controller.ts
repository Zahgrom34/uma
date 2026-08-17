import { Body, Controller, Get, Header, Put, UseGuards } from '@nestjs/common';
import type { UiStringDto, UiStringsBulkInput } from '@uma/shared';
import { UiStringsBulkSchema } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';

@Controller('api/admin/ui-strings')
@UseGuards(AdminGuard)
export class UiStringsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(): Promise<UiStringDto[]> {
    const rows = await this.prisma.uiString.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({ key: r.key, ru: r.ru, uz: r.uz, en: r.en, ...(r.context ? { context: r.context } : {}) }));
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  async putBulk(@Body(new ZodValidationPipe(UiStringsBulkSchema)) body: UiStringsBulkInput): Promise<{ updated: number }> {
    await this.prisma.$transaction(
      body.map((s) =>
        this.prisma.uiString.upsert({
          where: { key: s.key },
          update: { ru: s.ru, uz: s.uz, en: s.en, ...(s.context !== undefined ? { context: s.context } : {}) },
          create: { key: s.key, ru: s.ru, uz: s.uz, en: s.en, context: s.context ?? null },
        }),
      ),
    );
    await this.content.invalidate();
    return { updated: body.length };
  }
}
