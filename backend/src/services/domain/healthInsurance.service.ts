import * as healthInsuranceRepository from '../../repositories/healthInsurance.repository';
import { createNotification } from '../notification.service';

const EXPIRY_WARN_DAYS = 90;

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

export const getHealthInsurances = (studentId: number) =>
  healthInsuranceRepository.findByStudentId(studentId);

export const createHealthInsurance = async (
  studentId: number,
  dto: {
    provider: string;
    startDate: string;
    expiryDate: string;
    policyNumber?: string;
    coverageType?: string;
    fileUrl?: string;
  }
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

  const insurance = await healthInsuranceRepository.create({
    studentId,
    provider: dto.provider,
    policyNumber: dto.policyNumber,
    coverageType: dto.coverageType,
    startDate: start,
    expiryDate: expiry,
    fileUrl: dto.fileUrl,
  });

  _checkAndNotifyExpiry(studentId, expiry).catch(console.error);

  return insurance;
};

export const updateHealthInsurance = async (
  insuranceId: number,
  studentId: number,
  dto: {
    provider?: string;
    policyNumber?: string;
    coverageType?: string;
    fileUrl?: string;
    isCurrent?: boolean;
    startDate?: string;
    expiryDate?: string;
  }
) => {
  const existing = await healthInsuranceRepository.findByIdAndStudentId(insuranceId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Health insurance not found'), { statusCode: 404 });
  }

  if (dto.startDate && dto.expiryDate && new Date(dto.startDate) >= new Date(dto.expiryDate)) {
    throw Object.assign(new Error('startDate must be before expiryDate'), { statusCode: 400 });
  }

  const updated = await healthInsuranceRepository.updateById(insuranceId, {
    provider: dto.provider,
    policyNumber: dto.policyNumber,
    coverageType: dto.coverageType,
    fileUrl: dto.fileUrl,
    isCurrent: dto.isCurrent,
    startDate: dto.startDate ? new Date(dto.startDate) : undefined,
    expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
  });

  if (dto.expiryDate) {
    _checkAndNotifyExpiry(studentId, new Date(dto.expiryDate)).catch(console.error);
  }

  return updated;
};

export const deleteHealthInsurance = async (insuranceId: number, studentId: number): Promise<void> => {
  const existing = await healthInsuranceRepository.findByIdAndStudentId(insuranceId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Health insurance not found'), { statusCode: 404 });
  }
  await healthInsuranceRepository.removeById(insuranceId);
};
