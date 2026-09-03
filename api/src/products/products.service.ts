import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminProduct, ProductPatchInput, ProductUpsertInput } from '@uma/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { productInclude, toAdminProduct } from './product.mapper';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  async list(search?: string, category?: string, status?: string): Promise<AdminProduct[]> {
    const products = await this.prisma.product.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(search
          ? { OR: [{ id: { contains: search } }, { translations: { some: { name: { contains: search } } } }] }
          : {}),
      },
      include: productInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return products.map(toAdminProduct);
  }

  async get(id: string): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException({ message: 'Товар не найден' });
    return toAdminProduct(product);
  }

  private async categoryIdBySlug(slug: string): Promise<string> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      throw new BadRequestException({
        message: 'Проверьте заполнение формы',
        fieldErrors: { categorySlug: 'Такой категории нет' },
      });
    }
    return category.id;
  }

  private async assertMediaExist(mediaIds: string[]): Promise<void> {
    const found = await this.prisma.mediaAsset.findMany({ where: { id: { in: mediaIds } }, select: { id: true } });
    const foundIds = new Set(found.map((m) => m.id));
    const missing = mediaIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new BadRequestException({
        message: 'Проверьте заполнение формы',
        fieldErrors: { mediaIds: 'Некоторые фотографии не найдены в медиатеке' },
      });
    }
  }

  async create(input: ProductUpsertInput): Promise<AdminProduct> {
    const existing = await this.prisma.product.findUnique({ where: { id: input.id } });
    if (existing) throw new ConflictException({ message: 'Товар с таким адресом уже существует' });
    const categoryId = await this.categoryIdBySlug(input.categorySlug);
    await this.assertMediaExist(input.mediaIds);

    const maxSort = await this.prisma.product.aggregate({ _max: { sortOrder: true } });
    await this.prisma.$transaction([
      this.prisma.product.create({
        data: {
          id: input.id,
          categoryId,
          price: input.price,
          oldPrice: input.oldPrice ?? null,
          sale: input.sale ?? false,
          tag: input.tag ?? null,
          online: input.online ?? false,
          outOfStock: input.outOfStock ?? false,
          stock: input.stock ?? null,
          sizeGuide: input.sizeGuide ?? null,
          billzSku: input.billzSku ?? null,
          sizeValues: input.sizeValues ? JSON.stringify(input.sizeValues) : null,
          colorVariants: input.colorVariants ? JSON.stringify(input.colorVariants) : null,
          status: input.status ?? 'published',
          sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        },
      }),
      this.prisma.productTranslation.createMany({
        data: (['ru', 'uz', 'en'] as const).map((lang) => ({ productId: input.id, lang, ...input.i18n[lang] })),
      }),
      this.prisma.productSize.createMany({
        data: input.sizes.map((s) => ({
          productId: input.id,
          size: s.size,
          available: s.available,
          lowStockQty: s.lowStockQty ?? null,
        })),
      }),
      this.prisma.productImage.createMany({
        data: input.mediaIds.map((mediaId, index) => ({ productId: input.id, mediaId, sortOrder: index })),
      }),
    ]);
    await this.content.invalidate();
    return this.get(input.id);
  }

  async patch(id: string, input: ProductPatchInput): Promise<AdminProduct> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException({ message: 'Товар не найден' });

    // sale consistency against the merged record
    const sale = input.sale ?? product.sale;
    const price = input.price ?? product.price;
    const oldPrice = input.oldPrice !== undefined ? input.oldPrice : product.oldPrice;
    if (sale && (oldPrice == null || oldPrice <= price)) {
      throw new BadRequestException({
        message: 'Проверьте заполнение формы',
        fieldErrors: { oldPrice: oldPrice == null ? 'Для скидки укажите старую цену' : 'Старая цена должна быть выше текущей' },
      });
    }

    const categoryId = input.categorySlug ? await this.categoryIdBySlug(input.categorySlug) : undefined;
    if (input.mediaIds) await this.assertMediaExist(input.mediaIds);

    const ops = [];
    ops.push(
      this.prisma.product.update({
        where: { id },
        data: {
          ...(categoryId ? { categoryId } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.oldPrice !== undefined ? { oldPrice: input.oldPrice } : {}),
          ...(input.sale !== undefined ? { sale: input.sale } : {}),
          ...(input.tag !== undefined ? { tag: input.tag } : {}),
          ...(input.online !== undefined ? { online: input.online } : {}),
          ...(input.outOfStock !== undefined ? { outOfStock: input.outOfStock } : {}),
          ...(input.stock !== undefined ? { stock: input.stock } : {}),
          ...(input.sizeGuide !== undefined ? { sizeGuide: input.sizeGuide } : {}),
          ...(input.billzSku !== undefined ? { billzSku: input.billzSku } : {}),
          ...(input.sizeValues !== undefined
            ? { sizeValues: input.sizeValues ? JSON.stringify(input.sizeValues) : null }
            : {}),
          ...(input.colorVariants !== undefined
            ? { colorVariants: input.colorVariants ? JSON.stringify(input.colorVariants) : null }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        },
      }),
    );
    if (input.i18n) {
      ops.push(this.prisma.productTranslation.deleteMany({ where: { productId: id } }));
      ops.push(
        this.prisma.productTranslation.createMany({
          data: (['ru', 'uz', 'en'] as const).map((lang) => ({ productId: id, lang, ...input.i18n![lang] })),
        }),
      );
    }
    if (input.sizes) {
      ops.push(this.prisma.productSize.deleteMany({ where: { productId: id } }));
      ops.push(
        this.prisma.productSize.createMany({
          data: input.sizes.map((s) => ({
            productId: id,
            size: s.size,
            available: s.available,
            lowStockQty: s.lowStockQty ?? null,
          })),
        }),
      );
    }
    if (input.mediaIds) {
      ops.push(this.prisma.productImage.deleteMany({ where: { productId: id } }));
      ops.push(
        this.prisma.productImage.createMany({
          data: input.mediaIds.map((mediaId, index) => ({ productId: id, mediaId, sortOrder: index })),
        }),
      );
    }
    await this.prisma.$transaction(ops);
    await this.content.invalidate();
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException({ message: 'Товар не найден' });
    await this.prisma.product.delete({ where: { id } });
    await this.content.invalidate();
  }
}
