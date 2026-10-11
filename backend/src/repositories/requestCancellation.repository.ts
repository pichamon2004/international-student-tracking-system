import prisma from '../utils/prisma';

export const findPendingByRequestId = (requestId: number) =>
  prisma.requestCancellation.findFirst({
    where: { requestId, status: 'PENDING' },
  });

export const create = (requestId: number, reason: string) =>
  prisma.requestCancellation.create({
    data: { requestId, reason, status: 'PENDING' },
  });

// Approving a cancellation also closes the request itself — both writes go in
// one transaction so a request can never end up CANCELLED with its
// cancellation still PENDING (or vice versa).
export const review = (
  id: number,
  requestId: number,
  approve: boolean,
  reviewedBy: number,
  reviewNote?: string
) =>
  prisma.$transaction(async (tx) => {
    const cancellation = await tx.requestCancellation.update({
      where: { id },
      data: {
        status:     approve ? 'APPROVED' : 'REJECTED',
        reviewedBy,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
    });
    if (approve) {
      await tx.request.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
    }
    return cancellation;
  });
