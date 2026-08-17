// Pre-start bootstrap for the Railway container. Run from the api/ directory:
//   node ../deploy/bootstrap.mjs
// 1. Empty volume → copy the committed seed (content DB + media uploads).
// 2. Apply pending Prisma migrations.
// 3. ADMIN_EMAIL + ADMIN_PASSWORD set → upsert the admin user with those credentials.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = process.cwd(); // /app/api
const seedDir = path.join(scriptDir, 'seed');
const require = createRequire(path.join(apiDir, 'package.json'));

const rawDbUrl = process.env.DATABASE_URL || 'file:../data/uma.db';
if (!rawDbUrl.startsWith('file:')) {
  console.error(`bootstrap: only file: DATABASE_URLs are supported, got ${rawDbUrl}`);
  process.exit(1);
}
// Prisma resolves relative file: paths against the schema directory (api/prisma).
const dbFile = rawDbUrl.slice('file:'.length);
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(apiDir, 'prisma', dbFile);

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(path.join(seedDir, 'uma.db'), dbPath);
  console.log(`bootstrap: seeded database at ${dbPath}`);
}

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(apiDir, 'uploads');
if (!fs.existsSync(uploadsDir) || fs.readdirSync(uploadsDir).length === 0) {
  fs.cpSync(path.join(seedDir, 'uploads'), uploadsDir, { recursive: true });
  console.log(`bootstrap: seeded media uploads at ${uploadsDir}`);
}

execSync('npx prisma migrate deploy', { cwd: apiDir, stdio: 'inherit' });

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  const { PrismaClient } = require('@prisma/client');
  const argon2 = require('argon2');
  const prisma = new PrismaClient();
  const passwordHash = await argon2.hash(password);
  await prisma.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
  await prisma.$disconnect();
  console.log(`bootstrap: admin user ${email} is up to date`);
}
