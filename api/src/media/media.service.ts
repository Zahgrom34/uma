import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import type { MediaAsset } from '@prisma/client';
import type { MediaAssetDto, MediaKind } from '@uma/shared';
import { PrismaService } from '../prisma/prisma.service';
import { mediaUrl, thumbUrl } from '../content/media-url';

export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), 'uploads');
export const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const MAGIC: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    check: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    check: (b) => b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export const sniffImageMime = (buffer: Buffer): string | null => MAGIC.find((m) => m.check(buffer))?.mime ?? null;

// MP4: an ISO-BMFF 'ftyp' box right after the 4-byte size at the start of the file.
export const isMp4 = (buffer: Buffer): boolean => buffer.length > 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';

type MediaWithUsage = MediaAsset & { products: { productId: string }[] };

const usageInclude = { products: { select: { productId: true } } };

export const toMediaDto = (m: MediaWithUsage, heroMediaIds: ReadonlySet<string>): MediaAssetDto => ({
  id: m.id,
  url: mediaUrl(m.filename),
  thumbUrl: m.kind === 'video' ? null : thumbUrl(m.filename),
  kind: m.kind as MediaKind,
  originalName: m.originalName,
  width: m.width,
  height: m.height,
  sizeBytes: m.sizeBytes,
  alt: m.alt,
  usedByProductIds: m.products.map((p) => p.productId),
  usedByHero: heroMediaIds.has(m.id),
  createdAt: m.createdAt.toISOString(),
});

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Media ids referenced by the stored settings.hero (empty set when unset/corrupt). */
  async heroMediaIds(): Promise<Set<string>> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'hero' } });
    if (!row) return new Set();
    try {
      const hero = JSON.parse(row.value) as { slides?: { mediaId?: string }[] };
      return new Set((hero.slides ?? []).map((s) => s.mediaId).filter((id): id is string => Boolean(id)));
    } catch {
      return new Set();
    }
  }

  async list(page: number, limit: number): Promise<{ items: MediaAssetDto[]; total: number }> {
    const [items, total, heroIds] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        include: usageInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediaAsset.count(),
      this.heroMediaIds(),
    ]);
    return { items: items.map((m) => toMediaDto(m, heroIds)), total };
  }

  /**
   * Sharp pipeline: any accepted image → webp original (≤1600px long edge) + 400px thumb.
   * Dedup by content hash; filename = sha1(content).slice(0,12) + '.webp'.
   */
  async ingest(buffer: Buffer, originalName: string, sourceUrl?: string): Promise<MediaAssetDto> {
    const mime = sniffImageMime(buffer);
    if (!mime) {
      if (isMp4(buffer)) return this.ingestVideo(buffer, originalName, sourceUrl);
      throw new BadRequestException({
        message: 'Файл не похож на изображение. Поддерживаются JPEG, PNG, WebP и MP4.',
        fieldErrors: { files: 'Поддерживаются только JPEG, PNG, WebP и MP4' },
      });
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        message: 'Файл больше 10 МБ — уменьшите изображение и попробуйте снова',
        fieldErrors: { files: 'Файл больше 10 МБ' },
      });
    }
    const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
    const filename = `${hash}.webp`;

    const existing = await this.prisma.mediaAsset.findUnique({ where: { filename }, include: usageInclude });
    if (existing) return toMediaDto(existing, await this.heroMediaIds());

    await fs.mkdir(THUMBS_DIR, { recursive: true });
    const original = await sharp(buffer)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await fs.writeFile(path.join(UPLOADS_DIR, filename), original.data);
    await fs.writeFile(path.join(THUMBS_DIR, filename), thumb);

    const created = await this.prisma.mediaAsset.create({
      data: {
        filename,
        originalName,
        mimeType: 'image/webp',
        width: original.info.width,
        height: original.info.height,
        sizeBytes: original.data.length,
        sourceUrl: sourceUrl ?? null,
      },
      include: usageInclude,
    });
    return toMediaDto(created, await this.heroMediaIds());
  }

  /** MP4 is stored verbatim (original bytes, content-hash name) — no sharp, no thumb. */
  private async ingestVideo(buffer: Buffer, originalName: string, sourceUrl?: string): Promise<MediaAssetDto> {
    if (buffer.length > MAX_VIDEO_BYTES) {
      throw new BadRequestException({
        message: 'Видео больше 50 МБ',
        fieldErrors: { files: 'Видео больше 50 МБ' },
      });
    }
    const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
    const filename = `${hash}.mp4`;

    const existing = await this.prisma.mediaAsset.findUnique({ where: { filename }, include: usageInclude });
    if (existing) return toMediaDto(existing, await this.heroMediaIds());

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

    const created = await this.prisma.mediaAsset.create({
      data: {
        filename,
        originalName,
        mimeType: 'video/mp4',
        kind: 'video',
        width: null,
        height: null,
        sizeBytes: buffer.length,
        sourceUrl: sourceUrl ?? null,
      },
      include: usageInclude,
    });
    return toMediaDto(created, await this.heroMediaIds());
  }

  async findBySourceUrl(sourceUrl: string): Promise<MediaAssetDto | null> {
    const found = await this.prisma.mediaAsset.findFirst({ where: { sourceUrl }, include: usageInclude });
    return found ? toMediaDto(found, await this.heroMediaIds()) : null;
  }

  async setAlt(id: string, alt: string | null): Promise<MediaAssetDto> {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) throw new NotFoundException({ message: 'Файл не найден' });
    const updated = await this.prisma.mediaAsset.update({ where: { id }, data: { alt }, include: usageInclude });
    return toMediaDto(updated, await this.heroMediaIds());
  }

  async remove(id: string): Promise<void> {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id }, include: usageInclude });
    if (!media) throw new NotFoundException({ message: 'Файл не найден' });
    if (media.products.length) {
      throw new ConflictException({
        message: `Файл используется в товарах (${media.products.map((p) => p.productId).join(', ')}). Сначала уберите его из товаров.`,
      });
    }
    if ((await this.heroMediaIds()).has(id)) {
      throw new ConflictException({ message: 'Файл используется в баннере главной страницы' });
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    await fs.rm(path.join(UPLOADS_DIR, media.filename), { force: true });
    await fs.rm(path.join(THUMBS_DIR, media.filename), { force: true });
  }
}
