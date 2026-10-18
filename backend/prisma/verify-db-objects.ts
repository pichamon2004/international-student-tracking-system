/**
 * Runs after post-push-db-objects.ts (see Dockerfile). An empty `prisma migrate
 * diff` doesn't prove custom objects survived a db push, so this checks them
 * directly — they exist, their definitions match, and the database really
 * rejects rows that break them. Any failure stops the deploy.
 */
import { PrismaClient } from '@prisma/client';
import { CHECK_CONSTRAINTS, EXPECTED_FOREIGN_KEYS, EXPECTED_INDEXES, canonicalClause } from './db-objects';

const prisma = new PrismaClient();
const problems: string[] = [];

class Rollback extends Error {}

// Run an insert that must be rejected, then roll back whatever happened
async function expectRejected(label: string, sql: string, ...params: unknown[]) {
  let rejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRawUnsafe(sql, ...params);
      } catch (err) {
        if (String((err as Error).message).includes('3819') || /check constraint/i.test(String((err as Error).message))) {
          rejected = true;
        } else {
          throw err;
        }
      }
      throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  if (!rejected) problems.push(`database accepted a row it must reject: ${label}`);
}

async function main() {
  for (const c of CHECK_CONSTRAINTS) {
    const rows = await prisma.$queryRawUnsafe<{ clause: string }[]>(
      `SELECT cc.CHECK_CLAUSE AS clause
         FROM information_schema.CHECK_CONSTRAINTS cc
         JOIN information_schema.TABLE_CONSTRAINTS tc
           ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        WHERE cc.CONSTRAINT_SCHEMA = DATABASE() AND tc.TABLE_NAME = ? AND cc.CONSTRAINT_NAME = ? AND tc.ENFORCED = 'YES'`,
      c.table, c.name
    );
    if (rows.length === 0) problems.push(`missing or not enforced: ${c.table}.${c.name}`);
    else if (rows[0].clause !== await canonicalClause(prisma, c)) problems.push(`definition changed: ${c.table}.${c.name}`);
  }

  for (const idx of EXPECTED_INDEXES) {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      idx.table, idx.name
    );
    if (Number(rows[0]?.n ?? 0) === 0) problems.push(`missing index: ${idx.table}.${idx.name}`);
  }

  // Behavioural test of files_owner_scope_chk, against real FK targets
  const student = await prisma.student.findFirst({ select: { id: true } });
  const user = await prisma.user.findFirst({ select: { id: true } });
  const insert = `INSERT INTO files (storageKey, mimeType, sizeBytes, purpose, ownerStudentId, ownerUserId, legacyUnowned)
                  VALUES (?, 'image/png', 1, 'PASSPORT_IMAGE', ?, ?, ?)`;
  const key = (tag: string) => `__verify__/${tag}-${Date.now()}`;
  await expectRejected('no owner and not flagged legacy', insert, key('none'), null, null, 0);
  if (user) await expectRejected('legacy flag with an owner', insert, key('legacy-owner'), null, user.id, 1);
  if (student && user) await expectRejected('both owners', insert, key('both'), student.id, user.id, 0);

  for (const fk of EXPECTED_FOREIGN_KEYS) {
    const rows = await prisma.$queryRawUnsafe<{ cols: string; ref: string }[]>(
      `SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS cols,
              CONCAT(MAX(REFERENCED_TABLE_NAME), '(', GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION), ')') AS ref
         FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
      fk.table, fk.name
    );
    if (!rows[0]?.cols) problems.push(`missing foreign key: ${fk.table}.${fk.name}`);
    else if (rows[0].cols !== fk.columns || rows[0].ref !== fk.references) {
      problems.push(`foreign key ${fk.table}.${fk.name} is (${rows[0].cols}) → ${rows[0].ref}, expected (${fk.columns}) → ${fk.references}`);
    }
  }

  // Behavioural test of the holder FKs: two throwaway students in a rolled-back transaction
  await verifyHolderForeignKeys();

  if (problems.length > 0) {
    throw new Error(`database objects are not as expected:\n  - ${problems.join('\n  - ')}`);
  }
  console.log('[verify-db-objects] ok');
}

async function verifyHolderForeignKeys() {
  const isFkError = (err: unknown) => /1452|foreign key constraint/i.test(String((err as Error).message));
  const outcomes: Record<string, boolean> = {};
  try {
    await prisma.$transaction(async (tx) => {
      const tag = `__verify__${Date.now()}`;
      const mk = async (n: number) => {
        const u = await tx.user.create({ data: { email: `${tag}_${n}@example.invalid`, name: tag } });
        return tx.student.create({ data: { userId: u.id } });
      };
      const a = await mk(1);
      const b = await mk(2);
      const depA = await tx.dependent.create({ data: { studentId: a.id, relationship: 'Child', firstName: tag, lastName: tag, dateOfBirth: new Date(), gender: 'MALE', nationality: 'X' } });
      const passA = await tx.passport.create({ data: { studentId: a.id, passportNumber: tag, expiryDate: new Date() } });
      const attempt = async (label: string, sql: string, ...params: unknown[]) => {
        try { await tx.$executeRawUnsafe(sql, ...params); outcomes[label] = false; }
        catch (err) { if (!isFkError(err)) throw err; outcomes[label] = true; }
      };
      await attempt("visa held by another student's dependent",
        `INSERT INTO visas (studentId, dependentId, visaType, expiryDate, updatedAt) VALUES (?, ?, 'X', NOW(3), NOW(3))`, b.id, depA.id);
      await attempt("passport held by another student's dependent",
        `INSERT INTO passports (studentId, dependentId, passportNumber, expiryDate, updatedAt) VALUES (?, ?, 'X', NOW(3), NOW(3))`, b.id, depA.id);
      await attempt("visa in another student's passport",
        `INSERT INTO visas (studentId, passportId, visaType, expiryDate, updatedAt) VALUES (?, ?, 'X', NOW(3), NOW(3))`, b.id, passA.id);
      throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  for (const [label, rejected] of Object.entries(outcomes)) {
    if (!rejected) problems.push(`database accepted a row it must reject: ${label}`);
  }
  if (Object.keys(outcomes).length !== 3) problems.push('holder foreign-key test did not run all cases');
}

main()
  .catch((err) => {
    console.error('[verify-db-objects] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
