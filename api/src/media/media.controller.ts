import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import type { MediaAssetDto } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MediaService } from './media.service';

const AltSchema = z.object({ alt: z.string({ invalid_type_error: 'Описание должно быть строкой' }).nullable() });

@Controller('api/admin/media')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query('page') page?: string, @Query('limit') limit?: string): Promise<{ items: MediaAssetDto[]; total: number }> {
    const pageNum = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit ?? '24', 10) || 24));
    return this.media.list(pageNum, limitNum);
  }

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 52 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]): Promise<MediaAssetDto[]> {
    if (!files?.length) {
      throw new BadRequestException({
        message: 'Прикрепите хотя бы один файл',
        fieldErrors: { files: 'Прикрепите хотя бы один файл' },
      });
    }
    const results: MediaAssetDto[] = [];
    for (const file of files) {
      results.push(await this.media.ingest(file.buffer, file.originalname));
    }
    return results;
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  setAlt(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AltSchema)) body: { alt: string | null },
  ): Promise<MediaAssetDto> {
    return this.media.setAlt(id, body.alt);
  }

  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('id') id: string): Promise<void> {
    await this.media.remove(id);
  }
}
