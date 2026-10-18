/**
 * Moves request history out of the legacy columns (requests.staffAt/advisorAt/
 * deanAt + comments + ids) and the request_cancellations table into
 * request_events, and turns pending cancellations into CANCEL_REQUESTED.
 *
 * Runs on every container start BEFORE `prisma db push` (see Dockerfile),
 * because db push drops the legacy columns/table. Uses raw SQL so it does not
 * depend on the current Prisma schema, and is a no-op once the legacy columns
 * are gone. Requests that already have events are skipped, so it is safe to
 * re-run.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Status = string;
type Role = 'STAFF' | 'ADVISOR' | 'DEAN';

const STATUSES = [
  'PENDING', 'FORWARDED_TO_ADVISOR', 'ADVISOR_APPROVED', 'ADVISOR_REJECTED', 'STAFF_APPROVED',
  'STAFF_REJECTED', 'FORWARDED_TO_DEAN', 'DEAN_APPROVED', 'DEAN_REJECTED', 'CANCELLED', 'CANCEL_REQUESTED',
];
const STATUS_ENUM = `enum(${STATUSES.map(s => `'${s}'`).join(',')})`;

// Same DDL `prisma db push` generates for model RequestEvent, so db push sees no diff afterwards
const CREATE_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS \`request_events\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`requestId\` int NOT NULL,
  \`type\` enum('SUBMITTED','EDITED','STATUS_CHANGED') COLLATE utf8mb4_unicode_ci NOT NULL,
  \`actorId\` int DEFAULT NULL,
  \`actorRole\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`fromStatus\` ${STATUS_ENUM} COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`toStatus\` ${STATUS_ENUM} COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`comment\` text COLLATE utf8mb4_unicode_ci,
  \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`request_events_requestId_createdAt_idx\` (\`requestId\`,\`createdAt\`),
  KEY \`request_events_actorId_fkey\` (\`actorId\`),
  CONSTRAINT \`request_events_actorId_fkey\` FOREIGN KEY (\`actorId\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`request_events_requestId_fkey\` FOREIGN KEY (\`requestId\`) REFERENCES \`requests\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

interface LegacyRequest {
  id: number; status: Status; createdAt: Date; studentUserId: number;
  staffId: number | null; staffAt: Date | null; staffComment: string | null;
  advisorId: number | null; advisorAt: Date | null; advisorComment: string | null;
  deanId: number | null; deanAt: Date | null; deanComment: string | null;
}

interface LegacyCancellation {
  requestId: number; reason: string; status: string;
  reviewedBy: number | null; reviewNote: string | null; reviewedAt: Date | null; createdAt: Date;
}

interface Step {
  at: Date;
  kind: 'ROLE' | 'CANCEL_REQUEST' | 'CANCEL_REVIEW';
  role?: Role;
  actorId: number | null;
  comment: string | null;
  approved?: boolean;
}

// Status a role's action most likely produced, judged by who acted next.
function inferRoleStatus(role: Role, next: Role | undefined): Status {
  if (role === 'STAFF') {
    if (next === 'ADVISOR') return 'FORWARDED_TO_ADVISOR';
    if (next === 'DEAN') return 'FORWARDED_TO_DEAN';
    return 'STAFF_APPROVED';
  }
  if (role === 'ADVISOR') return 'ADVISOR_APPROVED';
  return 'DEAN_APPROVED';
}

const tableExists = async (table: string) =>
  (await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`, table,
  )).length > 0;

const columnExists = async (table: string, column: string) =>
  (await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    table, column,
  )).length > 0;

async function main() {
  if (!(await tableExists('requests')) || !(await columnExists('requests', 'staffAt'))) {
    console.log('[backfill] no legacy request columns — nothing to migrate.');
    return;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`requests\` MODIFY \`status\` ${STATUS_ENUM} COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING'`,
  );
  await prisma.$executeRawUnsafe(CREATE_EVENTS_TABLE);

  const requests = await prisma.$queryRawUnsafe<LegacyRequest[]>(`
    SELECT r.id, r.status, r.createdAt, s.userId AS studentUserId,
           r.staffId, r.staffAt, r.staffComment,
           r.advisorId, r.advisorAt, r.advisorComment,
           r.deanId, r.deanAt, r.deanComment
    FROM requests r JOIN students s ON s.id = r.studentId
    WHERE NOT EXISTS (SELECT 1 FROM request_events e WHERE e.requestId = r.id)`);

  const cancellations = (await tableExists('request_cancellations'))
    ? await prisma.$queryRawUnsafe<LegacyCancellation[]>(
        `SELECT requestId, reason, status, reviewedBy, reviewNote, reviewedAt, createdAt
         FROM request_cancellations ORDER BY createdAt ASC`)
    : [];

  let created = 0;
  for (const r of requests) {
    const roleSteps: Step[] = [];
    if (r.staffAt)   roleSteps.push({ at: r.staffAt,   kind: 'ROLE', role: 'STAFF',   actorId: r.staffId,   comment: r.staffComment });
    if (r.advisorAt) roleSteps.push({ at: r.advisorAt, kind: 'ROLE', role: 'ADVISOR', actorId: r.advisorId, comment: r.advisorComment });
    if (r.deanAt)    roleSteps.push({ at: r.deanAt,    kind: 'ROLE', role: 'DEAN',    actorId: r.deanId,    comment: r.deanComment });
    roleSteps.sort((a, b) => a.at.getTime() - b.at.getTime());

    const myCancellations = cancellations.filter(c => c.requestId === r.id);
    const cancelSteps: Step[] = [];
    for (const c of myCancellations) {
      cancelSteps.push({ at: c.createdAt, kind: 'CANCEL_REQUEST', actorId: r.studentUserId, comment: c.reason });
      if (c.status !== 'PENDING' && c.reviewedAt) {
        cancelSteps.push({
          at: c.reviewedAt, kind: 'CANCEL_REVIEW', actorId: c.reviewedBy, comment: c.reviewNote,
          approved: c.status === 'APPROVED',
        });
      }
    }

    const hasPendingCancel = myCancellations.some(c => c.status === 'PENDING');
    // The current status belongs to the last role action, unless a cancellation took over
    const lastRoleStep = roleSteps[roleSteps.length - 1];
    const statusFromRole = r.status !== 'CANCELLED' && !hasPendingCancel;

    const rows: [string, number | null, string, Status | null, Status, string | null, Date][] = [
      ['SUBMITTED', r.studentUserId, 'STUDENT', null, 'PENDING', null, r.createdAt],
    ];
    let current: Status = 'PENDING';
    let beforeCancel: Status = 'PENDING';

    const steps = [...roleSteps, ...cancelSteps].sort((a, b) => a.at.getTime() - b.at.getTime());
    for (const step of steps) {
      let toStatus: Status;
      let actorRole: string;
      if (step.kind === 'ROLE') {
        const idx = roleSteps.indexOf(step);
        toStatus = step === lastRoleStep && statusFromRole
          ? r.status
          : inferRoleStatus(step.role!, roleSteps[idx + 1]?.role);
        actorRole = step.role!;
      } else if (step.kind === 'CANCEL_REQUEST') {
        beforeCancel = current;
        toStatus = 'CANCEL_REQUESTED';
        actorRole = 'STUDENT';
      } else {
        toStatus = step.approved ? 'CANCELLED' : beforeCancel;
        actorRole = 'STAFF';
      }
      rows.push(['STATUS_CHANGED', step.actorId, actorRole, current, toStatus, step.comment || null, step.at]);
      current = toStatus;
    }

    await prisma.$transaction([
      ...rows.map(([type, actorId, actorRole, fromStatus, toStatus, comment, createdAt]) =>
        prisma.$executeRawUnsafe(
          `INSERT INTO request_events (requestId, type, actorId, actorRole, fromStatus, toStatus, comment, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          r.id, type, actorId, actorRole, fromStatus, toStatus, comment, createdAt,
        )),
      ...(hasPendingCancel
        ? [prisma.$executeRawUnsafe(`UPDATE requests SET status = 'CANCEL_REQUESTED' WHERE id = ?`, r.id)]
        : []),
    ]);
    created += rows.length;
  }

  console.log(`[backfill] ${requests.length} request(s) without history: ${created} event(s) created.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
