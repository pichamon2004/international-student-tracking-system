import prisma from '../../utils/prisma';
import * as repo from '../../repositories/deanDelegation.repository';
import * as userRepo from '../../repositories/user.repository';

export const getDelegation = (deanUserId: number) =>
  repo.findByDeanId(deanUserId);

export const setDelegate = async (deanUserId: number, delegateId: number) => {
  const delegate = await prisma.user.findUnique({ where: { id: delegateId } });
  if (!delegate) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return repo.upsert(deanUserId, delegateId);
};

export const toggleDelegation = (deanUserId: number, isActive: boolean) =>
  repo.toggle(deanUserId, isActive);

export const removeDelegation = (deanUserId: number) =>
  repo.remove(deanUserId);

export const getActiveSignatory = async (): Promise<{ id: number; name: string; isDelegated: boolean }> => {
  const deans = await userRepo.findByRole('DEAN');
  const dean = deans[0];
  if (!dean) {
    const err = new Error('No dean configured') as Error & { statusCode: number };
    err.statusCode = 500;
    throw err;
  }

  const delegation = await repo.findByDeanId(dean.id);
  if (delegation?.isActive && delegation.delegate) {
    return { id: delegation.delegate.id, name: delegation.delegate.name, isDelegated: true };
  }
  return { id: dean.id, name: dean.name, isDelegated: false };
};

export const getDelegateUsers = () => userRepo.findNonStudentUsers();
