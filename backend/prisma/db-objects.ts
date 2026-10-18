/**
 * Database objects Prisma can't express in schema.prisma. Shared by
 * post-push-db-objects.ts (creates them) and verify-db-objects.ts (checks them),
 * so the definition lives in exactly one place.
 */
import type { PrismaClient } from '@prisma/client';

export interface CheckConstraint {
  table: string;
  name: string;
  clause: string;
  // Column definitions the clause refers to, used to let MySQL canonicalise it
  probeColumns: string;
}

export const CHECK_CONSTRAINTS: CheckConstraint[] = [
  {
    // A file belongs to exactly one scope — a student or a user — unless it is a
    // migrated file whose owner could not be determined, which is flagged explicitly.
    table: 'files',
    name: 'files_owner_scope_chk',
    // Written in the form MySQL stores it (NOT pushed inward), so the stored clause compares equal
    clause: `(ownerStudentId IS NULL OR ownerUserId IS NULL)
      AND (ownerStudentId IS NOT NULL OR ownerUserId IS NOT NULL OR legacyUnowned = 1)
      AND (legacyUnowned <> 1 OR (ownerStudentId IS NULL AND ownerUserId IS NULL))`,
    probeColumns: '`ownerStudentId` int NULL, `ownerUserId` int NULL, `legacyUnowned` tinyint(1) NOT NULL DEFAULT 0',
  },
];

// Foreign keys Prisma declares but whose guarantees the code relies on — checked
// explicitly because a schema edit could silently turn them back into plain columns
export const EXPECTED_FOREIGN_KEYS: { table: string; name: string; columns: string; references: string }[] = [
  // a passport / visa held by a dependent must be held by a dependent of the same student
  { table: 'passports', name: 'passports_dependent_holder_fkey', columns: 'dependentId,studentId', references: 'dependents(id,studentId)' },
  { table: 'visas', name: 'visas_dependent_holder_fkey', columns: 'dependentId,studentId', references: 'dependents(id,studentId)' },
  // a visa's passport must be in the same account
  { table: 'visas', name: 'visas_passport_same_account_fkey', columns: 'passportId,studentId', references: 'passports(id,studentId)' },
];

// Indexes the code relies on that must survive every db push
export const EXPECTED_INDEXES: { table: string; name: string }[] = [
  { table: 'files', name: 'files_storageKey_key' },
  { table: 'files', name: 'files_ownerStudentId_idx' },
  { table: 'files', name: 'files_ownerUserId_idx' },
];

/**
 * MySQL rewrites CHECK clauses when it stores them (pushes NOT inward, adds
 * backticks and parentheses). Rather than guess at that rewrite, let MySQL
 * canonicalise the expected clause on a throwaway table and compare the two
 * stored forms exactly — so a clause with different grouping never "matches".
 */
export async function canonicalClause(prisma: PrismaClient, c: CheckConstraint): Promise<string> {
  const probe = `__chk_probe_${process.pid}_${Date.now()}`;
  await prisma.$executeRawUnsafe(`CREATE TABLE \`${probe}\` (id int NOT NULL PRIMARY KEY, ${c.probeColumns}, CONSTRAINT \`${probe}_chk\` CHECK (${c.clause}))`);
  try {
    const rows = await prisma.$queryRawUnsafe<{ clause: string }[]>(
      `SELECT CHECK_CLAUSE AS clause FROM information_schema.CHECK_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`, `${probe}_chk`
    );
    return rows[0].clause;
  } finally {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${probe}\``);
  }
}
