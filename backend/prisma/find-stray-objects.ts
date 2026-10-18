/**
 * Report bucket objects no file row knows about — e.g. an
 * upload whose row insert failed and whose cleanup delete also failed, or old
 * PDF versions written before the files table existed. Read-only: it never
 * deletes anything (that is the future cleanup job's decision).
 *
 *   npm run files:stray
 */
import { PrismaClient } from '@prisma/client';
import { listAllKeys } from '../src/services/external/r2.service';

const prisma = new PrismaClient();

async function main() {
  const [keys, files] = await Promise.all([
    listAllKeys(),
    prisma.file.findMany({ select: { storageKey: true } }),
  ]);
  const known = new Set<string>(files.map(f => f.storageKey));
  const stray = keys.filter(k => !known.has(k));

  const byFolder = new Map<string, number>();
  for (const k of stray) {
    const folder = k.includes('/') ? k.slice(0, k.indexOf('/')) : '(root)';
    byFolder.set(folder, (byFolder.get(folder) ?? 0) + 1);
  }

  console.log(`objects in bucket: ${keys.length}`);
  console.log(`known (files): ${keys.length - stray.length}`);
  console.log(`stray: ${stray.length}`);
  for (const [folder, n] of [...byFolder].sort()) console.log(`  ${folder}/: ${n}`);
  if (process.argv.includes('--list')) for (const k of stray) console.log(`  ${k}`);
}

main()
  .catch((err) => {
    console.error('[find-stray-objects] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
