import prisma from '../utils/prisma';

export const findByDeanId = (deanId: number) =>
  prisma.deanDelegation.findUnique({
    where: { deanId },
    include: { delegate: { select: { id: true, name: true } } },
  });

export const upsert = (deanId: number, delegateId: number) =>
  prisma.deanDelegation.upsert({
    where: { deanId },
    update: { delegateId, isActive: true },
    create: { deanId, delegateId, isActive: true },
    include: { delegate: { select: { id: true, name: true } } },
  });

export const toggle = (deanId: number, isActive: boolean) =>
  prisma.deanDelegation.update({
    where: { deanId },
    data: { isActive },
    include: { delegate: { select: { id: true, name: true } } },
  });

export const remove = (deanId: number) =>
  prisma.deanDelegation.delete({ where: { deanId } });

// Is this user currently the active delegate for any dean? Used to gate what
// a VICE_DEAN can see — they only get dean-level access while delegated.
export const findActiveByDelegateId = (delegateId: number) =>
  prisma.deanDelegation.findFirst({ where: { delegateId, isActive: true } });
