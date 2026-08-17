import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Test environment must be configured BEFORE application modules are imported.
const TEST_DB = path.resolve(__dirname, '..', 'data', 'test.db');
const TEST_UPLOADS = path.join(os.tmpdir(), `uma-test-uploads-${process.pid}`);
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.UPLOADS_DIR = TEST_UPLOADS;
process.env.JWT_SECRET = 'test-secret';
process.env.MEDIA_BASE_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/app.setup';

const ADMIN = { email: 'admin@test.uz', password: 'test-password-1' };

describe('UMA API (e2e smoke)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let mediaId: string;
  let mediaFilename: string;
  let spareMediaId: string;
  let videoMediaId: string;
  let videoFilename: string;

  // Minimal valid-looking MP4: 4-byte box size + 'ftyp' + brand, padded past the sniff window.
  const mp4Buffer = (fill = 0x00, extra = 64) =>
    Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(extra, fill)]);

  const server = () => app.getHttpServer();
  const auth = (req: request.Test) => req.set('Cookie', cookie);

  beforeAll(async () => {
    await fs.rm(TEST_DB, { force: true });
    await fs.rm(TEST_UPLOADS, { recursive: true, force: true });
    execSync('npx prisma db push --skip-generate', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env },
      stdio: 'ignore',
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.adminUser.create({
      data: { email: ADMIN.email, passwordHash: await argon2.hash(ADMIN.password) },
    });
    await prisma.category.create({
      data: { slug: 'dresses', nameRu: 'Платья', nameUz: 'Koʻylaklar', nameEn: 'Dresses', sortOrder: 0 },
    });
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(TEST_DB, { force: true });
    await fs.rm(TEST_UPLOADS, { recursive: true, force: true });
  });

  // ---- auth ----------------------------------------------------------------

  it('POST /api/auth/login rejects wrong password with 401 and a Russian message', async () => {
    const res = await request(server()).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Неверная почта или пароль');
  });

  it('POST /api/auth/login rejects malformed body with 400 fieldErrors', async () => {
    const res = await request(server()).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(res.body.fieldErrors.password).toBeDefined();
  });

  it('POST /api/auth/login sets the httpOnly uma_admin cookie', async () => {
    const res = await request(server()).post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN.email);
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('uma_admin=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    cookie = setCookie.split(';')[0];
  });

  it('GET /api/auth/me returns the user with the cookie, 401 without', async () => {
    const ok = await auth(request(server()).get('/api/auth/me'));
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(ADMIN.email);
    const anon = await request(server()).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });

  it('admin endpoints without cookie return 401', async () => {
    for (const url of ['/api/admin/products', '/api/admin/categories', '/api/admin/media', '/api/admin/pages', '/api/admin/ui-strings', '/api/admin/settings']) {
      const res = await request(server()).get(url);
      expect(res.status).toBe(401);
    }
  });

  // ---- media ---------------------------------------------------------------

  it('POST /api/admin/media converts a JPEG into webp original + thumb on disk', async () => {
    const jpeg = await sharp({
      create: { width: 2000, height: 1200, channels: 3, background: { r: 120, g: 90, b: 60 } },
    })
      .jpeg()
      .toBuffer();
    const res = await auth(request(server()).post('/api/admin/media')).attach('files', jpeg, 'look-1.jpg');
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    const dto = res.body[0];
    expect(dto.url).toMatch(/\/media\/[0-9a-f]{12}\.webp$/);
    expect(dto.width).toBeLessThanOrEqual(1600);
    mediaId = dto.id;
    mediaFilename = path.basename(dto.url);
    await expect(fs.stat(path.join(TEST_UPLOADS, mediaFilename))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(TEST_UPLOADS, 'thumbs', mediaFilename))).resolves.toBeTruthy();

    // second, unused asset for the delete-free-media test
    const jpeg2 = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 10, g: 20, b: 30 } } })
      .jpeg()
      .toBuffer();
    const res2 = await auth(request(server()).post('/api/admin/media')).attach('files', jpeg2, 'look-2.jpg');
    expect(res2.status).toBe(201);
    spareMediaId = res2.body[0].id;
  });

  it('POST /api/admin/media accepts an mp4 verbatim: kind video, no thumb, no dimensions', async () => {
    const video = mp4Buffer();
    const res = await auth(request(server()).post('/api/admin/media')).attach('files', video, 'hero.mp4');
    expect(res.status).toBe(201);
    const dto = res.body[0];
    expect(dto.kind).toBe('video');
    expect(dto.url).toMatch(/\/media\/[0-9a-f]{12}\.mp4$/);
    expect(dto.thumbUrl).toBeNull();
    expect(dto.width).toBeNull();
    expect(dto.height).toBeNull();
    expect(dto.usedByHero).toBe(false);
    videoMediaId = dto.id;
    videoFilename = path.basename(dto.url);
    // stored byte-for-byte, no thumb written
    const onDisk = await fs.readFile(path.join(TEST_UPLOADS, videoFilename));
    expect(onDisk.equals(video)).toBe(true);
    await expect(fs.stat(path.join(TEST_UPLOADS, 'thumbs', videoFilename))).rejects.toBeTruthy();
  });

  it('rejects a video over 50 MB with the pinned Russian 400', async () => {
    const big = Buffer.concat([mp4Buffer(), Buffer.alloc(51 * 1024 * 1024, 0x11)]);
    const res = await auth(request(server()).post('/api/admin/media')).attach('files', big, 'big.mp4');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Видео больше 50 МБ');
  });

  it('rejects a renamed non-mp4 payload by magic bytes', async () => {
    const res = await auth(request(server()).post('/api/admin/media')).attach('files', Buffer.from('definitely not a video'), 'fake.mp4');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('MP4');
  });

  it('rejects a non-image payload by magic bytes with a Russian 400', async () => {
    const res = await auth(request(server()).post('/api/admin/media')).attach('files', Buffer.from('not an image'), 'fake.jpg');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('JPEG');
  });

  it('GET /media/:filename serves the webp with immutable cache headers (thumb too)', async () => {
    const res = await request(server()).get(`/media/${mediaFilename}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const thumb = await request(server()).get(`/media/thumbs/${mediaFilename}`);
    expect(thumb.status).toBe(200);
  });

  it('GET /api/admin/media lists with pagination', async () => {
    const res = await auth(request(server()).get('/api/admin/media?page=1&limit=10'));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.length).toBe(3);
    for (const item of res.body.items) {
      expect(['image', 'video']).toContain(item.kind);
      expect(item.usedByHero).toBe(false);
    }
  });

  it('PATCH /api/admin/media/:id updates alt', async () => {
    const res = await auth(request(server()).patch(`/api/admin/media/${mediaId}`)).send({ alt: 'Платье, вид спереди' });
    expect(res.status).toBe(200);
    expect(res.body.alt).toBe('Платье, вид спереди');
  });

  // ---- products ------------------------------------------------------------

  const productBody = () => ({
    id: 'test-dress',
    categorySlug: 'dresses',
    price: 1150000,
    oldPrice: 1450000,
    sale: true,
    tag: 'new',
    online: false,
    outOfStock: false,
    stock: 5,
    sizeGuide: null,
    sizeValues: null,
    colorVariants: ['#171717'],
    status: 'published',
    i18n: {
      ru: { name: 'Тестовое платье', color: 'Чёрный', material: 'Хлопок', desc: 'Описание' },
      uz: { name: 'Test koʻylak', color: 'Qora', material: 'Paxta', desc: 'Tavsif' },
      en: { name: 'Test dress', color: 'Black', material: 'Cotton', desc: 'Description' },
    },
    sizes: [
      { size: 'XS', available: false },
      { size: 'M', available: true, lowStockQty: 2 },
    ],
    mediaIds: [] as string[],
  });

  it('POST /api/admin/products creates a product and round-trips every field', async () => {
    const body = { ...productBody(), mediaIds: [mediaId] };
    const res = await auth(request(server()).post('/api/admin/products')).send(body);
    expect(res.status).toBe(201);
    const p = res.body;
    expect(p.id).toBe('test-dress');
    expect(p.cat).toBe('Платья');
    expect(p.categorySlug).toBe('dresses');
    expect(p.tag).toBe('New'); // display casing
    expect(p.sale).toBe(true);
    expect(p.oldPrice).toBe(1450000);
    expect(p.unavailableSizes).toEqual(['XS']);
    expect(p.lowStockSizes).toEqual({ M: 2 });
    expect(p.sizes).toHaveLength(2);
    expect(p.sizes).toEqual(
      expect.arrayContaining([
        { size: 'XS', available: false },
        { size: 'M', available: true, lowStockQty: 2 },
      ]),
    );
    expect(p.i18n.uz.name).toBe('Test koʻylak');
    expect(p.images[0]).toBe(`http://localhost:3000/media/${mediaFilename}`);
    expect(p.thumbs[0]).toBe(`http://localhost:3000/media/thumbs/${mediaFilename}`);
    expect(p.mediaIds).toEqual([mediaId]);
    expect(p.status).toBe('published');
  });

  it('POST duplicate slug → 409', async () => {
    const res = await auth(request(server()).post('/api/admin/products')).send({ ...productBody(), mediaIds: [mediaId] });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('уже существует');
  });

  it('POST invalid body → 400 with Russian field errors', async () => {
    const bad = { ...productBody(), id: 'test-bad', price: -5, oldPrice: 100, mediaIds: [] };
    const res = await auth(request(server()).post('/api/admin/products')).send(bad);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Проверьте заполнение формы');
    expect(res.body.fieldErrors.price).toBe('Цена должна быть больше нуля');
    expect(res.body.fieldErrors.mediaIds).toBe('Добавьте хотя бы одну фотографию');
  });

  it('sale without a higher old price → 400 on oldPrice', async () => {
    const bad = { ...productBody(), id: 'test-bad-sale', oldPrice: 1000, mediaIds: [mediaId] };
    const res = await auth(request(server()).post('/api/admin/products')).send(bad);
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.oldPrice).toBe('Старая цена должна быть выше текущей');
  });

  it('GET /api/admin/products lists with search/category/status filters', async () => {
    const all = await auth(request(server()).get('/api/admin/products'));
    expect(all.status).toBe(200);
    expect(all.headers['cache-control']).toBe('no-store');
    expect(all.body).toHaveLength(1);
    const hit = await auth(request(server()).get('/api/admin/products?search=Тестовое&category=dresses&status=published'));
    expect(hit.body).toHaveLength(1);
    const miss = await auth(request(server()).get('/api/admin/products?search=нету'));
    expect(miss.body).toHaveLength(0);
  });

  it('GET /api/admin/products/:id → product | 404', async () => {
    const ok = await auth(request(server()).get('/api/admin/products/test-dress'));
    expect(ok.status).toBe(200);
    const missing = await auth(request(server()).get('/api/admin/products/ghost'));
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Товар не найден');
  });

  it('PATCH /api/admin/products/:id partial update replaces i18n/sizes wholesale', async () => {
    const res = await auth(request(server()).patch('/api/admin/products/test-dress')).send({
      price: 990000,
      sale: false,
      oldPrice: null,
      sizes: [{ size: 'L', available: true }],
      i18n: {
        ru: { name: 'Новое имя', color: 'Чёрный', material: 'Хлопок', desc: 'Описание' },
        uz: { name: 'Yangi nom', color: 'Qora', material: 'Paxta', desc: 'Tavsif' },
        en: { name: 'New name', color: 'Black', material: 'Cotton', desc: 'Description' },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(990000);
    expect(res.body.sale).toBe(false);
    expect(res.body.i18n.en.name).toBe('New name');
    expect(res.body.sizes).toEqual([{ size: 'L', available: true }]);
    expect(res.body.unavailableSizes).toEqual([]);
  });

  it('PATCH tag with display casing "Sale" → 200, stored as DB value, served as "Sale"', async () => {
    const res = await auth(request(server()).patch('/api/admin/products/test-dress')).send({ tag: 'Sale' });
    expect(res.status).toBe(200);
    expect(res.body.tag).toBe('Sale');
    // The admin read maps DB 'sale' → 'Sale'; a display-cased DB value would map to null,
    // so re-reading proves the lowercase DB value was stored.
    const reread = await auth(request(server()).get('/api/admin/products/test-dress'));
    expect(reread.body.tag).toBe('Sale');
    const pub = await request(server()).get('/api/public/content');
    expect(pub.status).toBe(200);
    const dress = pub.body.products.find((p: { id: string }) => p.id === 'test-dress');
    expect(dress.tag).toBe('Sale');
    const online = await auth(request(server()).patch('/api/admin/products/test-dress')).send({ tag: 'Online Exclusive' });
    expect(online.status).toBe(200);
    expect(online.body.tag).toBe('Online Exclusive');
    const cleared = await auth(request(server()).patch('/api/admin/products/test-dress')).send({ tag: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.tag).toBeNull();
  });

  it('PATCH with a genuinely invalid tag → 400 with Russian message', async () => {
    const res = await auth(request(server()).patch('/api/admin/products/test-dress')).send({ tag: 'Bestseller' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.tag).toBe('Метка: «New», «Sale» или «Online Exclusive»');
  });

  it('DELETE media referenced by a product → 409', async () => {
    const res = await auth(request(server()).delete(`/api/admin/media/${mediaId}`));
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('test-dress');
  });

  it('DELETE unused media → 204 and files removed', async () => {
    const res = await auth(request(server()).delete(`/api/admin/media/${spareMediaId}`));
    expect(res.status).toBe(204);
  });

  // ---- categories ----------------------------------------------------------

  it('POST /api/admin/categories → 201; duplicate → 409', async () => {
    const res = await auth(request(server()).post('/api/admin/categories')).send({
      slug: 'bags',
      nameRu: 'Сумки',
      nameUz: 'Sumkalar',
      nameEn: 'Bags',
    });
    expect(res.status).toBe(201);
    const dup = await auth(request(server()).post('/api/admin/categories')).send({
      slug: 'bags',
      nameRu: 'Сумки',
      nameUz: 'Sumkalar',
      nameEn: 'Bags',
    });
    expect(dup.status).toBe(409);
  });

  it('GET /api/admin/categories lists both', async () => {
    const res = await auth(request(server()).get('/api/admin/categories'));
    expect(res.status).toBe(200);
    expect(res.body.map((c: { slug: string }) => c.slug)).toEqual(['dresses', 'bags']);
  });

  it('PATCH /api/admin/categories/:slug renames', async () => {
    const res = await auth(request(server()).patch('/api/admin/categories/bags')).send({ nameEn: 'Handbags' });
    expect(res.status).toBe(200);
    expect(res.body.nameEn).toBe('Handbags');
  });

  it('DELETE category with products → 409 with explanation; empty one → 204', async () => {
    const used = await auth(request(server()).delete('/api/admin/categories/dresses'));
    expect(used.status).toBe(409);
    expect(used.body.message).toContain('Нельзя удалить категорию');
    const free = await auth(request(server()).delete('/api/admin/categories/bags'));
    expect(free.status).toBe(204);
  });

  // ---- pages ---------------------------------------------------------------

  it('GET /api/admin/pages returns the 5 fixed slugs', async () => {
    const res = await auth(request(server()).get('/api/admin/pages'));
    expect(res.status).toBe(200);
    expect(res.body.map((p: { slug: string }) => p.slug)).toEqual(['about', 'delivery', 'returns', 'payment', 'contact']);
  });

  it('PUT /api/admin/pages/:slug upserts all 3 languages; unknown slug → 404', async () => {
    const body = {
      ru: { eyebrow: 'О бренде', heading: 'Заголовок', body: 'Текст' },
      uz: { eyebrow: 'Brend haqida', heading: 'Sarlavha', body: 'Matn' },
      en: { eyebrow: 'About', heading: 'Heading', body: 'Body' },
    };
    const res = await auth(request(server()).put('/api/admin/pages/about')).send(body);
    expect(res.status).toBe(200);
    expect(res.body.i18n.uz.heading).toBe('Sarlavha');
    const missing = await auth(request(server()).put('/api/admin/pages/ghost')).send(body);
    expect(missing.status).toBe(404);
  });

  // ---- ui strings ----------------------------------------------------------

  it('PUT /api/admin/ui-strings bulk upsert (one item allowed) and GET lists it', async () => {
    const put = await auth(request(server()).put('/api/admin/ui-strings')).send([
      { key: 'bag', ru: 'Корзина', uz: 'Savat', en: 'Bag' },
    ]);
    expect(put.status).toBe(200);
    expect(put.body.updated).toBe(1);
    const list = await auth(request(server()).get('/api/admin/ui-strings'));
    expect(list.status).toBe(200);
    expect(list.body).toEqual([{ key: 'bag', ru: 'Корзина', uz: 'Savat', en: 'Bag' }]);
  });

  // ---- settings ------------------------------------------------------------

  it('PUT and GET /api/admin/settings round-trip commerce/contact/socialLinks', async () => {
    const put = await auth(request(server()).put('/api/admin/settings')).send({
      commerce: { freeShipThreshold: 2000000, flatShipping: 40000 },
      contact: { phone: '+998 90 054 34 08', email: 'shop@umabrand.uz', hoursWeekdays: '9:00–20:00', hoursWeekend: '11:00–18:00' },
      socialLinks: [{ label: 'Instagram', href: 'https://www.instagram.com/uma_uz/' }],
    });
    expect(put.status).toBe(200);
    const res = await auth(request(server()).get('/api/admin/settings'));
    expect(res.body.commerce).toEqual({ freeShipThreshold: 2000000, flatShipping: 40000 });
    expect(res.body.socialLinks).toHaveLength(1);
  });

  it('PUT /api/admin/settings with a negative threshold → 400 Russian error', async () => {
    const res = await auth(request(server()).put('/api/admin/settings')).send({
      commerce: { freeShipThreshold: -1, flatShipping: 0 },
    });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors['commerce.freeShipThreshold']).toBe('Порог не может быть отрицательным');
  });

  // ---- hero settings -------------------------------------------------------

  it('PUT settings hero with an unknown mediaId → 400 «Медиафайл не найден»', async () => {
    const res = await auth(request(server()).put('/api/admin/settings')).send({ hero: { slides: [{ mediaId: 'ghost' }] } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Медиафайл не найден');
  });

  it('PUT settings hero mixing video and image → 400 with the pinned message', async () => {
    const res = await auth(request(server()).put('/api/admin/settings')).send({
      hero: { slides: [{ mediaId: videoMediaId }, { mediaId: mediaId }] },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Баннер — это одно видео или до трёх фотографий');
  });

  it('PUT settings hero with zero or four slides → 400 (zod slide count)', async () => {
    const empty = await auth(request(server()).put('/api/admin/settings')).send({ hero: { slides: [] } });
    expect(empty.status).toBe(400);
    const four = await auth(request(server()).put('/api/admin/settings')).send({
      hero: { slides: Array.from({ length: 4 }, () => ({ mediaId })) },
    });
    expect(four.status).toBe(400);
  });

  it('PUT settings hero with one video → 200 and marks the asset usedByHero', async () => {
    const res = await auth(request(server()).put('/api/admin/settings')).send({ hero: { slides: [{ mediaId: videoMediaId }] } });
    expect(res.status).toBe(200);
    expect(res.body.hero).toEqual({ slides: [{ mediaId: videoMediaId }] });
    const list = await auth(request(server()).get('/api/admin/media?limit=100'));
    const video = list.body.items.find((m: { id: string }) => m.id === videoMediaId);
    expect(video.usedByHero).toBe(true);
  });

  it('DELETE media referenced by the hero → 409 with the pinned message', async () => {
    const res = await auth(request(server()).delete(`/api/admin/media/${videoMediaId}`));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Файл используется в баннере главной страницы');
  });

  it('the public bundle resolves hero to absolute URLs and carries socialLinks', async () => {
    const res = await request(server()).get('/api/public/content');
    expect(res.status).toBe(200);
    expect(res.body.settings.hero).toEqual([{ type: 'video', src: `http://localhost:3000/media/${videoFilename}` }]);
    expect(res.body.settings.socialLinks).toEqual([{ label: 'Instagram', href: 'https://www.instagram.com/uma_uz/' }]);
  });

  it('PUT settings {hero: null} clears the stored hero; bundle hero becomes []', async () => {
    const before = await request(server()).get('/api/public/content');
    const res = await auth(request(server()).put('/api/admin/settings')).send({ hero: null });
    expect(res.status).toBe(200);
    expect(res.body.hero).toBeNull();
    const after = await request(server()).get('/api/public/content');
    expect(after.body.settings.hero).toEqual([]);
    expect(after.headers.etag).not.toBe(before.headers.etag); // hero write bumped the bundle
    // hero cleared → the video can be deleted now
    const del = await auth(request(server()).delete(`/api/admin/media/${videoMediaId}`));
    expect(del.status).toBe(204);
  });

  // ---- public content ------------------------------------------------------

  it('GET /api/public/content returns the bundle with ETag, CORS * and Cache-Control: no-cache', async () => {
    const res = await request(server()).get('/api/public/content');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.etag).toMatch(/^"[0-9a-f]{40}"$/);
    const bundle = res.body;
    expect(bundle.products).toHaveLength(1);
    expect(bundle.products[0].images[0]).toContain('http://localhost:3000/media/');
    expect(bundle.categories.map((c: { slug: string }) => c.slug)).toEqual(['dresses']);
    expect(bundle.uiStrings.bag).toEqual({ ru: 'Корзина', uz: 'Savat', en: 'Bag' });
    expect(bundle.settings.commerce).toEqual({ freeShipThreshold: 2000000, flatShipping: 40000 });
    expect(Array.isArray(bundle.settings.hero)).toBe(true);
    expect(Array.isArray(bundle.settings.socialLinks)).toBe(true);
    expect(typeof bundle.version).toBe('string');
  });

  it('public content is a simple-request-safe GET from a non-allowlisted origin (GH Pages topology)', async () => {
    // A simple GET (no custom headers) needs no OPTIONS preflight — the GET response
    // itself must carry a usable ACAO. supertest cannot preflight, and none is required.
    const foreign = 'https://example.github.io';
    const res = await request(server()).get('/api/public/content').set('Origin', foreign);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.etag).toMatch(/^"[0-9a-f]{40}"$/); // strong ETag, unchanged

    // Conditional revalidation still works at the HTTP level from that origin.
    const cached = await request(server())
      .get('/api/public/content')
      .set('Origin', foreign)
      .set('If-None-Match', res.headers.etag);
    expect(cached.status).toBe(304);
    expect(cached.headers['access-control-allow-origin']).toBe('*');
  });

  it('If-None-Match → 304; admin write invalidates the ETag', async () => {
    const first = await request(server()).get('/api/public/content');
    const etag = first.headers.etag;
    const cached = await request(server()).get('/api/public/content').set('If-None-Match', etag);
    expect(cached.status).toBe(304);

    await auth(request(server()).patch('/api/admin/products/test-dress')).send({ price: 970000 });
    const after = await request(server()).get('/api/public/content').set('If-None-Match', etag);
    expect(after.status).toBe(200);
    expect(after.headers.etag).not.toBe(etag);
    expect(after.body.products[0].price).toBe(970000);
  });

  it('draft products are excluded from the public bundle', async () => {
    await auth(request(server()).patch('/api/admin/products/test-dress')).send({ status: 'draft' });
    const res = await request(server()).get('/api/public/content');
    expect(res.body.products).toHaveLength(0);
    await auth(request(server()).patch('/api/admin/products/test-dress')).send({ status: 'published' });
  });

  it('there is no registration endpoint', async () => {
    const res = await request(server()).post('/api/auth/register').send({ email: 'x@x.uz', password: 'y' });
    expect(res.status).toBe(404);
  });

  // ---- product delete last (media referenced check above needs it) ---------

  it('DELETE /api/admin/products/:id → 204, then 404 on GET', async () => {
    const res = await auth(request(server()).delete('/api/admin/products/test-dress'));
    expect(res.status).toBe(204);
    const gone = await auth(request(server()).get('/api/admin/products/test-dress'));
    expect(gone.status).toBe(404);
  });

  it('POST /api/auth/logout clears the cookie (204)', async () => {
    const res = await auth(request(server()).post('/api/auth/logout'));
    expect(res.status).toBe(204);
    const cleared = res.headers['set-cookie']?.[0] ?? '';
    expect(cleared).toContain('uma_admin=;');
  });
});
