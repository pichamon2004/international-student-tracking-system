import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

const USER_NAME = { select: { id: true, name: true } } as const;

const DELEGATION_INCLUDE = {
  delegate:  USER_NAME,
  createdBy: USER_NAME,
  revokedBy: USER_NAME,
} as const;

// A delegation is in effect while it hasn't been revoked and `at` falls inside its period
const inEffectAt = (at: Date): Prisma.DeanDelegationWhereInput => ({
  revokedAt: null,
  startAt:   { lte: at },
  OR:        [{ endAt: null }, { endAt: { gt: at } }],
});

export const findCurrent = (deanId: number, at: Date = new Date()) =>
  prisma.deanDelegation.findFirst({
    where:   { deanId, ...inEffectAt(at) },
    include: DELEGATION_INCLUDE,
    orderBy: { startAt: 'desc' },
  });

// Is this user signing for a dean right now? Used to gate what a VICE_DEAN can see and do.
export const findActiveByDelegateId = (delegateId: number, at: Date = new Date()) =>
  prisma.deanDelegation.findFirst({ where: { delegateId, ...inEffectAt(at) } });

// Non-revoked delegations of this dean whose period overlaps [startAt, endAt)
export const findOverlapping = (deanId: number, startAt: Date, endAt: Date | null) =>
  prisma.deanDelegation.findFirst({
    where: {
      deanId,
      revokedAt: null,
      OR: [{ endAt: null }, { endAt: { gt: startAt } }],
      ...(endAt ? { startAt: { lt: endAt } } : {}),
    },
  });

export const findById = (id: number) =>
  prisma.deanDelegation.findUnique({ where: { id }, include: DELEGATION_INCLUDE });

export const listByDean = (deanId: number, take = 20) =>
  prisma.deanDelegation.findMany({
    where:   { deanId },
    include: DELEGATION_INCLUDE,
    orderBy: { startAt: 'desc' },
    take,
  });

export const create = (data: {
  deanId: number; delegateId: number; startAt: Date; endAt: Date | null;
  note: string | null; createdById: number;
}) =>
  prisma.deanDelegation.create({ data, include: DELEGATION_INCLUDE });

export const revoke = (id: number, revokedById: number) =>
  prisma.deanDelegation.update({
    where:   { id },
    data:    { revokedAt: new Date(), revokedById },
    include: DELEGATION_INCLUDE,
  });

// Revoke everything still in effect or scheduled for this delegate — used when an
// advisor loses their administrative position and can no longer sign for the dean.
export const revokeOpenByDelegateId = (delegateId: number, revokedById?: number) => {
  const now = new Date();
  return prisma.deanDelegation.updateMany({
    where: { delegateId, revokedAt: null, OR: [{ endAt: null }, { endAt: { gt: now } }] },
    data:  { revokedAt: now, revokedById: revokedById ?? null },
  });
};
