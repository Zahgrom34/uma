import * as fs from 'node:fs';
import * as path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { UPLOADS_DIR } from './media/media.service';

const CORS_ALLOWLIST = () => [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

/** Shared between main.ts and the e2e tests so both exercise the same middleware stack. */
export function setupApp(app: INestApplication): void {
  const expressApp = (app as NestExpressApplication).getHttpAdapter().getInstance();

  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || CORS_ALLOWLIST().includes(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
  });

  // Media files: immutable, content-hashed filenames.
  const immutable: express.Handler = (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  };
  expressApp.use('/media', immutable, express.static(UPLOADS_DIR, { fallthrough: false, maxAge: '1y', immutable: true }));

  // Production: serve the built admin panel at /admin.
  if (process.env.NODE_ENV === 'production') {
    const adminDist = path.resolve(process.cwd(), '..', 'cms', 'dist');
    if (fs.existsSync(adminDist)) {
      expressApp.use('/admin', express.static(adminDist));
      expressApp.get(/^\/admin(\/.*)?$/, (_req: express.Request, res: express.Response) => {
        res.sendFile(path.join(adminDist, 'index.html'));
      });
    }
  }
}
