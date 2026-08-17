import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AdminProduct, ProductPatchInput, ProductUpsertInput } from '@uma/shared';
import { ProductPatchSchema, ProductUpsertSchema } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProductsService } from './products.service';

@Controller('api/admin/products')
@UseGuards(AdminGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ): Promise<AdminProduct[]> {
    return this.products.list(search || undefined, category || undefined, status || undefined);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id') id: string): Promise<AdminProduct> {
    return this.products.get(id);
  }

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  create(@Body(new ZodValidationPipe(ProductUpsertSchema)) body: ProductUpsertInput): Promise<AdminProduct> {
    return this.products.create(body);
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  patch(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProductPatchSchema)) body: ProductPatchInput,
  ): Promise<AdminProduct> {
    return this.products.patch(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('id') id: string): Promise<void> {
    await this.products.remove(id);
  }
}
