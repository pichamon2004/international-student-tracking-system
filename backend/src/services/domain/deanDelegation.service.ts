import * as repo from '../../repositories/deanDelegation.repository';
import * as userRepo from '../../repositories/user.repository';
import * as advisorRepo from '../../repositories/advisor.repository';

export type DelegationStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';

// The system has a single dean; IR staff manage who signs on their behalf.
const getDeanOrThrow = async () => {
  const deans = await userRepo.findByRole('DEAN');
  const dean = deans[0];
  if (!dean) {
    throw Object.assign(new Error('No dean configured'), { statusCode: 500 });
  }
  return dean;
};

type Delegation = NonNullable<Awaited<ReturnType<typeof repo.findById>>>;

const statusOf = (d: Delegation, now = new Date()): DelegationStatus => {
  if (d.revokedAt) return 'REVOKED';
  if (d.startAt > now) return 'SCHEDULED';
  if (d.endAt && d.endAt <= now) return 'EXPIRED';
  return 'ACTIVE';
};

// Attach the delegate's administrative position and the computed status for the UI
const present = async (d: Delegation) => {
  const exec = await advisorRepo.findExecutiveByUserId(d.delegate.id);
  return {
    ...d,
    delegate: { ...d.delegate, position: exec?.position ?? null },
    status: statusOf(d),
  };
};

export const listDelegations = async () => {
  const dean = await getDeanOrThrow();
  const rows = await repo.listByDean(dean.id);
  return Promise.all(rows.map(present));
};

const parseDate = (value: unknown, field: string): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    throw Object.assign(new Error(`${field} is not a valid date`), { statusCode: 400 });
  }
  return date;
};

export const createDelegation = async (
  dto: { delegateId: number; startAt?: unknown; endAt?: unknown; note?: string },
  staffUserId: number
) => {
  const dean = await getDeanOrThrow();
  const exec = await advisorRepo.findExecutiveByUserId(dto.delegateId);
  if (!exec) {
    throw Object.assign(
      new Error('The delegate must be an advisor with an administrative position'),
      { statusCode: 400 }
    );
  }

  const startAt = parseDate(dto.startAt, 'startAt') ?? new Date();
  const endAt = parseDate(dto.endAt, 'endAt');
  if (endAt && endAt <= startAt) {
    throw Object.assign(new Error('The end must be after the start'), { statusCode: 400 });
  }
  if (await repo.findOverlapping(dean.id, startAt, endAt)) {
    throw Object.assign(
      new Error('Another delegation already covers part of this period — revoke it first'),
      { statusCode: 409 }
    );
  }

  const created = await repo.create({
    deanId: dean.id,
    delegateId: dto.delegateId,
    startAt,
    endAt,
    note: dto.note?.trim() || null,
    createdById: staffUserId,
  });
  return present(created);
};

export const revokeDelegation = async (id: number, staffUserId: number) => {
  const existing = await repo.findById(id);
  if (!existing) {
    throw Object.assign(new Error('Delegation not found'), { statusCode: 404 });
  }
  const status = statusOf(existing);
  if (status === 'REVOKED' || status === 'EXPIRED') {
    throw Object.assign(new Error(`This delegation is already ${status.toLowerCase()}`), { statusCode: 409 });
  }
  return present(await repo.revoke(id, staffUserId));
};

export const getActiveSignatory = async (): Promise<{
  id: number; name: string; position: string | null; endAt: Date | null;
  isDelegated: boolean; deanName: string;
}> => {
  const dean = await getDeanOrThrow();
  const current = await repo.findCurrent(dean.id);
  if (current) {
    const { delegate } = await present(current);
    return {
      id: delegate.id,
      name: delegate.name,
      position: delegate.position,
      endAt: current.endAt,
      isDelegated: true,
      deanName: dean.name,
    };
  }
  return { id: dean.id, name: dean.name, position: null, endAt: null, isDelegated: false, deanName: dean.name };
};

export const getDelegateUsers = async () => {
  const execs = await advisorRepo.findExecutives();
  return execs.map(e => ({ id: e.userId, name: e.user.name, position: e.position }));
};

// Dean-level actions (approve/reject at FORWARDED_TO_DEAN, signing the dean box)
// belong to the dean, or to a VICE_DEAN only while their delegation is in effect.
export const canActAsDean = async (userId: number | undefined, activeRole: string | undefined) => {
  if (activeRole === 'DEAN') return true;
  if (activeRole === 'VICE_DEAN' && userId !== undefined) {
    return !!(await repo.findActiveByDelegateId(userId));
  }
  return false;
};

export const assertCanActAsDean = async (userId: number | undefined, activeRole: string | undefined) => {
  if (!(await canActAsDean(userId, activeRole))) {
    throw Object.assign(
      new Error('Only the dean or an active delegate can act at the dean stage'),
      { statusCode: 403 }
    );
  }
};
