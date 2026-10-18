/**
 * Runs AFTER `prisma db push` (see Dockerfile): adds the custom SQL objects from
 * db-objects.ts that don't exist yet. Re-runnable. It never drops or rewrites an
 * existing object — a definition mismatch stops the deploy so a person decides.
 */
import { PrismaClient } from '@prisma/client';
import { CHECK_CONSTRAINTS, canonicalClause } from './db-objects';

const prisma = new PrismaClient();

async function main() {
  for (const c of CHECK_CONSTRAINTS) {
    const existing = await prisma.$queryRawUnsafe<{ clause: string }[]>(
      `SELECT cc.CHECK_CLAUSE AS clause
         FROM information_schema.CHECK_CONSTRAINTS cc
         JOIN information_schema.TABLE_CONSTRAINTS tc
           ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        WHERE cc.CONSTRAINT_SCHEMA = DATABASE() AND tc.TABLE_NAME = ? AND cc.CONSTRAINT_NAME = ?`,
      c.table, c.name
    );

    if (existing.length > 0) {
      if (existing[0].clause !== await canonicalClause(prisma, c)) {
        throw new Error(
          `${c.name} exists with a different definition — not touching it.\n` +
          `  expected: ${c.clause.replace(/\s+/g, ' ')}\n  actual:   ${existing[0].clause}`
        );
      }
      continue;
    }

    // Report offending rows instead of letting ALTER TABLE fail halfway
    const bad = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM \`${c.table}\` WHERE NOT (${c.clause}) LIMIT 20`
    );
    if (bad.length > 0) {
      throw new Error(`${bad.length}+ rows of ${c.table} violate ${c.name}: ids ${bad.map(r => r.id).join(', ')}`);
    }

    await prisma.$executeRawUnsafe(`ALTER TABLE \`${c.table}\` ADD CONSTRAINT \`${c.name}\` CHECK (${c.clause})`);
    console.log(`[post-push] created ${c.name}`);
  }
}

main()
  .catch((err) => {
    console.error('[post-push] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
