import type { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import * as healthInsuranceRepository from '../../repositories/healthInsurance.repository';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { createNotification } from '../notification.service';

const EXPIRY_WARN_DAYS = 90;

type FileRef = string | number | null | undefined;

// What the client sends for the card images: the upload URL (as the forms do) or a fileId
export interface CardFileInput {
  fileUrl?: string | null;
  backFileUrl?: string | null;
  cardFrontFileId?: number | null;
  cardBackFileId?: number | null;
}

type InsuranceRow = Awaited<ReturnType<typeof healthInsuranceRepository.findByStudentId>>[number];

/** Card files back as the fileUrl / backFileUrl the API has always returned. */
export const presentInsurances = (rows: InsuranceRow[]) =>
  fileService.presentFiles(rows, { cardFrontFile: 'fileUrl', cardBackFile: 'backFileUrl' });

async function _checkAndNotifyExpiry(studentId: number, expiryDate: Date): Promise<void> {
  const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
  if (daysRemaining > EXPIRY_WARN_DAYS) return;

  const student = await healthInsuranceRepository.findStudentUserId(studentId);
  if (!student) return;

  createNotification({
    userId: student.userId,
    type: 'VISA_ALERT',
    title: 'Health Insurance Expiring Soon',
    message: `Your health insurance expires in ${daysRemaining} day(s). Please renew it.`,
    link: '/student/profile',
  }).catch(console.error);
}

/**
 * Turn the card references a client sent into fileIds this student may use.
 * A field left out stays unchanged (undefined); an empty one clears the card (null).
 */
export async function resolveCardFiles(
  studentId: number,
  dto: CardFileInput,
  actor: ClaimActor,
  db?: Prisma.TransactionClient
): Promise<{ cardFrontFileId?: number | null; cardBackFileId?: number | null }> {
  const target = { kind: 'student' as const, studentId };
  const one = async (ref: FileRef, slot: 'insurance.cardFront' | 'insurance.cardBack') =>
    ref === undefined ? undefined : (await fileService.claim(ref, { slot, target, actor }, db))?.id ?? null;
  return {
    cardFrontFileId: await one(dto.cardFrontFileId !== undefined ? dto.cardFrontFileId : dto.fileUrl, 'insurance.cardFront'),
    cardBackFileId:  await one(dto.cardBackFileId !== undefined ? dto.cardBackFileId : dto.backFileUrl, 'insurance.cardBack'),
  };
}

// Run in the caller's transaction (change-request approval) or a new one
const inTx = <T>(db: Prisma.TransactionClient | undefined, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
  db ? fn(db) : prisma.$transaction(fn);

export const getHealthInsurances = async (studentId: number) =>
  presentInsurances(await healthInsuranceRepository.findByStudentId(studentId));

export const createHealthInsurance = async (
  studentId: number,
  dto: CardFileInput & {
    provider: string;
    startDate: string | Date;
    expiryDate: string | Date;
    policyNumber?: string;
    coverageType?: string;
  },
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  if (!dto.provider || !dto.startDate || !dto.expiryDate) {
    throw Object.assign(
      new Error('provider, startDate, expiryDate are required'),
      { statusCode: 400 }
    );
  }
  const start = new Date(dto.startDate);
  const expiry = new Date(dto.expiryDate);
  if (start >= expiry) {
    throw Object.assign(new Error('startDate must be before expiryDate'), { statusCode: 400 });
  }

  const insurance = await inTx(db, async (tx) => {
    // Claim inside the write's transaction so a file can't be deleted in between
    const files = await resolveCardFiles(studentId, dto, actor, tx);
    await healthInsuranceRepository.clearCurrentByStudentId(studentId, tx);
    return healthInsuranceRepository.create({
      studentId,
      provider: dto.provider,
      policyNumber: dto.policyNumber,
      coverageType: dto.coverageType,
      startDate: start,
      expiryDate: expiry,
      ...files,
    }, tx);
  });

  _checkAndNotifyExpiry(studentId, expiry).catch(console.error);

  return (await presentInsurances([insurance]))[0];
};

export const updateHealthInsurance = async (
  insuranceId: number,
  studentId: number,
  dto: CardFileInput & {
    provider?: string;
    policyNumber?: string;
    coverageType?: string;
    isCurrent?: boolean;
    startDate?: string | Date;
    expiryDate?: string | Date;
  },
  actor: ClaimActor,
  db?: Prisma.TransactionClient
) => {
  if (dto.startDate && dto.expiryDate && new Date(dto.startDate) >= new Date(dto.expiryDate)) {
    throw Object.assign(new Error('startDate must be before expiryDate'), { statusCode: 400 });
  }

  const updated = await inTx(db, async (tx) => {
    // Lock the row and confirm it is still this student's before attaching files to it
    if (!(await healthInsuranceRepository.lockByIdAndStudentId(insuranceId, studentId, tx))) {
      throw Object.assign(new Error('Health insurance not found'), { statusCode: 404 });
    }
    const files = await resolveCardFiles(studentId, dto, actor, tx);
    return healthInsuranceRepository.updateById(insuranceId, {
      provider: dto.provider,
      policyNumber: dto.policyNumber,
      coverageType: dto.coverageType,
      ...files,
      isCurrent: dto.isCurrent,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    }, tx);
  });

  if (dto.expiryDate) {
    _checkAndNotifyExpiry(studentId, new Date(dto.expiryDate)).catch(console.error);
  }

  return (await presentInsurances([updated]))[0];
};

export const deleteHealthInsurance = async (insuranceId: number, studentId: number, db?: Prisma.TransactionClient): Promise<void> => {
  const existing = await healthInsuranceRepository.findByIdAndStudentId(insuranceId, studentId, db);
  if (!existing) {
    throw Object.assign(new Error('Health insurance not found'), { statusCode: 404 });
  }
  // The card files stay in `files` — the cleanup job decides what is unreferenced
  await healthInsuranceRepository.removeById(insuranceId, db);
};
