import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CategoryPatchInput, CategoryUpsertInput, PublicCategory } from '@uma/shared';
import { CategoryPatchSchema, CategoryUpsertSchema } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';

const toDto = (c: { slug: string; nameRu: string; nameUz: string; nameEn: string; sortOrder: number }): PublicCategory => ({
  slug: c.slug,
  nameRu: c.nameRu,
  nameUz: c.nameUz,
  nameEn: c.nameEn,
  sortOrder: c.sortOrder,
});

@Controller('api/admin/categories')
@UseGuards(AdminGuard)
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(): Promise<PublicCategory[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    return categories.map(toDto);
  }

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async create(@Body(new ZodValidationPipe(CategoryUpsertSchema)) body: CategoryUpsertInput): Promise<PublicCategory> {
    const clash = await this.prisma.category.findFirst({ where: { OR: [{ slug: body.slug }, { nameRu: body.nameRu }] } });
    if (clash) throw new ConflictException({ message: 'Категория с таким адресом или названием уже существует' });
    const maxSort = await this.prisma.category.aggregate({ _max: { sortOrder: true } });
    const created = await this.prisma.category.create({
      data: { ...body, sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1 },
    });
    await this.content.invalidate();
    return toDto(created);
  }

  @Patch(':slug')
  @Header('Cache-Control', 'no-store')
  async patch(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(CategoryPatchSchema)) body: CategoryPatchInput,
  ): Promise<PublicCategory> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException({ message: 'Категория не найдена' });
    if (body.slug && body.slug !== slug) {
      const clash = await this.prisma.category.findUnique({ where: { slug: body.slug } });
      if (clash) throw new ConflictException({ message: 'Категория с таким адресом уже существует' });
    }
    if (body.nameRu && body.nameRu !== category.nameRu) {
      const clash = await this.prisma.category.findUnique({ where: { nameRu: body.nameRu } });
      if (clash) throw new ConflictException({ message: 'Категория с таким названием уже существует' });
    }
    const updated = await this.prisma.category.update({ where: { slug }, data: body });
    await this.content.invalidate();
    return toDto(updated);
  }

  @Delete(':slug')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('slug') slug: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException({ message: 'Категория не найдена' });
    if (category._count.products > 0) {
      throw new ConflictException({
        message: `Нельзя удалить категорию: в ней ${category._count.products} товар(ов). Сначала перенесите товары.`,
      });
    }
    await this.prisma.category.delete({ where: { slug } });
    await this.content.invalidate();
  }
}
