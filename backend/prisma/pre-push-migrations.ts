/**
 * Data moves that must happen BEFORE `prisma db push` (see Dockerfile), because
 * db push drops the columns they read. Raw SQL so they don't depend on the
 * current Prisma schema; each step checks the legacy shape first, so the script
 * is a no-op once everything has been migrated and is safe to re-run.
 *
 *  1. users.role (legacy single role) → make sure every value has a user_roles row,
 *     then db push drops the column.
 *  2. dean_delegations (one row per dean, isActive flag) → one row per delegation
 *     period with startAt/endAt/createdBy/revokedAt.
 *  3. Dependents' passport and visa columns → rows in passports / visas held by
 *     the dependent (dependentId), with the visa pointing at that passport; and
 *     students' existing visas get passportId = their current passport.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const columnExists = async (table: string, column: string) => {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table, column
  );
  return Number(rows[0]?.n ?? 0) > 0;
};

const indexExists = async (table: string, index: string) => {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    table, index
  );
  return Number(rows[0]?.n ?? 0) > 0;
};

async function migrateLegacyUserRole() {
  if (!(await columnExists('users', 'role'))) return;
  const added = await prisma.$executeRawUnsafe(`
    INSERT IGNORE INTO user_roles (userId, roleId, createdAt)
    SELECT u.id, r.id, NOW(3) FROM users u JOIN roles r ON r.code = u.role
    WHERE u.role IS NOT NULL
  `);
  console.log(`[pre-push] users.role → user_roles: ${added} missing row(s) added`);
}

async function migrateDeanDelegations() {
  if (!(await columnExists('dean_delegations', 'isActive'))) return;

  const addColumn = async (column: string, ddl: string) => {
    if (!(await columnExists('dean_delegations', column))) {
      await prisma.$executeRawUnsafe(`ALTER TABLE dean_delegations ADD COLUMN ${ddl}`);
    }
  };
  // Nullable for now; db push applies NOT NULL once they are filled
  await addColumn('startAt',     '`startAt` datetime(3) NULL');
  await addColumn('endAt',       '`endAt` datetime(3) NULL');
  await addColumn('note',        '`note` text COLLATE utf8mb4_unicode_ci NULL');
  await addColumn('createdById', '`createdById` int NULL');
  await addColumn('revokedAt',   '`revokedAt` datetime(3) NULL');
  await addColumn('revokedById', '`revokedById` int NULL');

  // Who set an old delegation up was never recorded — attribute it to the dean
  const moved = await prisma.$executeRawUnsafe(`
    UPDATE dean_delegations
    SET startAt     = COALESCE(startAt, createdAt),
        createdById = COALESCE(createdById, deanId),
        revokedAt   = CASE WHEN isActive = 0 AND revokedAt IS NULL THEN updatedAt ELSE revokedAt END
  `);

  // MySQL won't drop the unique deanId index while the FK relies on it, so add
  // the new (deanId, startAt) index first — db push then drops the unique one.
  if (!(await indexExists('dean_delegations', 'dean_delegations_deanId_startAt_idx'))) {
    await prisma.$executeRawUnsafe(
      'CREATE INDEX `dean_delegations_deanId_startAt_idx` ON dean_delegations (`deanId`, `startAt`)'
    );
  }
  console.log(`[pre-push] dean_delegations → periods: ${moved} row(s) converted`);
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function migrateDependentPassportsAndVisas() {
  // Shape the target tables the way db push will leave them (nullable where a dependent has no value)
  await addColumnIfMissing('passports', 'dependentId', 'INT NULL');
  await addColumnIfMissing('visas', 'dependentId', 'INT NULL');
  await addColumnIfMissing('visas', 'passportId', 'INT NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE passports MODIFY issuingCountry VARCHAR(191) NULL, MODIFY issueDate DATETIME(3) NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE visas MODIFY issuingCountry VARCHAR(191) NULL, MODIFY issueDate DATETIME(3) NULL');

  if (await columnExists('dependents', 'passportNumber')) {
    type Dep = {
      id: number; studentId: number; passportNumber: string | null; passportExpiry: Date | null;
      visaType: string | null; visaExpiry: Date | null; visaStatus: string;
      passportImageFileId: number | null; visaImageFileId: number | null;
      arrivalStampFileId: number | null; departureStampFileId: number | null;
    };
    const deps = await prisma.$queryRawUnsafe<Dep[]>(
      `SELECT id, studentId, passportNumber, passportExpiry, visaType, visaExpiry, visaStatus,
              passportImageFileId, visaImageFileId, arrivalStampFileId, departureStampFileId
         FROM dependents`
    );
    for (const d of deps) {
      await prisma.$transaction(async (tx) => {
        // Already moved on an earlier run?
        const existing = await tx.$queryRawUnsafe<{ id: number }[]>('SELECT id FROM passports WHERE dependentId = ? LIMIT 1', d.id);
        const visaDone = await tx.$queryRawUnsafe<{ id: number }[]>('SELECT id FROM visas WHERE dependentId = ? LIMIT 1', d.id);

        let passportId: number | null = existing[0]?.id ?? null;
        const hasPassport = d.passportNumber || d.passportExpiry || d.passportImageFileId;
        if (!passportId && hasPassport) {
          if (!d.passportExpiry) throw new Error(`dependent ${d.id} has passport data but no expiry date — fix it before migrating`);
          await tx.$executeRawUnsafe(
            `INSERT INTO passports (studentId, dependentId, passportNumber, expiryDate, imageFileId, isCurrent, isVerified, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, 1, 0, NOW(3), NOW(3))`,
            d.studentId, d.id, d.passportNumber ?? '', d.passportExpiry, d.passportImageFileId
          );
          passportId = (await tx.$queryRawUnsafe<{ id: number }[]>('SELECT LAST_INSERT_ID() AS id'))[0].id;
        }

        const hasVisa = d.visaType || d.visaExpiry || d.visaImageFileId || d.arrivalStampFileId || d.departureStampFileId;
        if (!visaDone[0] && hasVisa) {
          if (!d.visaExpiry) throw new Error(`dependent ${d.id} has visa data but no expiry date — fix it before migrating`);
          await tx.$executeRawUnsafe(
            `INSERT INTO visas (studentId, dependentId, passportId, visaType, status, expiryDate,
                                imageFileId, arrivalStampFileId, departureStampFileId, isCurrent, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3))`,
            d.studentId, d.id, passportId, d.visaType ?? '', d.visaStatus, d.visaExpiry,
            d.visaImageFileId, d.arrivalStampFileId, d.departureStampFileId
          );
        }
      });
    }
    console.log(`[pre-push] dependents' passports and visas moved for ${deps.length} dependent(s)`);
  }

  // A student's visa without a passport → their current passport
  const n = await prisma.$executeRawUnsafe(
    `UPDATE visas v
       JOIN passports p ON p.studentId = v.studentId AND p.dependentId IS NULL AND p.isCurrent = 1
        SET v.passportId = p.id
      WHERE v.dependentId IS NULL AND v.passportId IS NULL`
  );
  if (n) console.log(`[pre-push] linked ${n} student visa(s) to the current passport`);
}

async function main() {
  await migrateLegacyUserRole();
  await migrateDeanDelegations();
  await migrateDependentPassportsAndVisas();
}

main()
  .catch((err) => {
    console.error('[pre-push] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
