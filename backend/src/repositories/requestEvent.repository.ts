import { Prisma, RequestStatus, RequestEventType } from '@prisma/client';
import prisma from '../utils/prisma';

type Db = Prisma.TransactionClient | typeof prisma;

export interface CreateRequestEventDto {
  requestId:   number;
  type:        RequestEventType;
  actorId?:    number | null;
  actorRole?:  string | null;
  fromStatus?: RequestStatus | null;
  toStatus?:   RequestStatus | null;
  comment?:    string | null;
}

export const ACTOR_SELECT = { select: { id: true, name: true } } as const;

// ── Queries ───────────────────────────────────────────────────────

// The event that put the request into CANCEL_REQUESTED — its fromStatus is
// where the request goes back to if staff reject the cancellation.
export const findLatestCancelRequest = (requestId: number, db: Db = prisma) =>
  db.requestEvent.findFirst({
    where:   { requestId, toStatus: 'CANCEL_REQUESTED' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

const APPROVAL_STATUS = {
  ir_staff: 'STAFF_APPROVED',
  advisor:  'ADVISOR_APPROVED',
  dean:     'DEAN_APPROVED',
} as const;

// userId of the latest approver per signature role
export const findLatestApprovers = async (requestId: number) => {
  const events = await prisma.requestEvent.findMany({
    where:   { requestId, toStatus: { in: Object.values(APPROVAL_STATUS) } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select:  { toStatus: true, actorId: true },
  });
  const latest = (status: RequestStatus) => events.find(e => e.toStatus === status)?.actorId ?? null;
  return {
    ir_staff: latest(APPROVAL_STATUS.ir_staff),
    advisor:  latest(APPROVAL_STATUS.advisor),
    dean:     latest(APPROVAL_STATUS.dean),
  };
};

// ── Mutations ─────────────────────────────────────────────────────

export const create = (dto: CreateRequestEventDto, db: Db = prisma) =>
  db.requestEvent.create({
    data: {
      requestId:  dto.requestId,
      type:       dto.type,
      actorId:    dto.actorId ?? null,
      actorRole:  dto.actorRole ?? null,
      fromStatus: dto.fromStatus ?? null,
      toStatus:   dto.toStatus ?? null,
      comment:    dto.comment?.trim() || null,
    },
  });
