import * as studentRepository from '../../repositories/student.repository';
import * as interserviceRepository from '../../repositories/interservice.repository';
import { callKkuInterservice } from '../external/kkuInterservice.service';

const VALID_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] as const;

export const createInterserviceCheck = async (studentId: number, renewalId?: number | null) => {
  const student = await studentRepository.findById(studentId);
  if (!student) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }

  const passport = student.passports[0];
  if (!passport) {
    throw Object.assign(
      new Error('นักศึกษาไม่มีข้อมูล passport ปัจจุบัน'),
      { statusCode: 400 }
    );
  }

  const kkuResult = await callKkuInterservice(passport.passportNumber);

  return interserviceRepository.create({
    studentId,
    renewalId: renewalId ?? null,
    status: kkuResult.status as (typeof VALID_STATUSES)[number],
    referenceId: kkuResult.referenceId ?? undefined,
    notes: kkuResult.message,
    checkedAt: new Date(kkuResult.checkedAt),
  });
};

export const getInterserviceChecks = async (studentId: number) => {
  const student = await studentRepository.findById(studentId);
  if (!student) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }
  return interserviceRepository.findByStudentId(studentId);
};

export const updateInterserviceCheck = async (
  checkId: number,
  studentId: number,
  dto: { status?: string; referenceId?: string; notes?: string }
) => {
  const existing = await interserviceRepository.findByIdAndStudentId(checkId, studentId);
  if (!existing) {
    throw Object.assign(new Error('Interservice check not found'), { statusCode: 404 });
  }

  if (dto.status && !(VALID_STATUSES as readonly string[]).includes(dto.status)) {
    throw Object.assign(
      new Error(`status ต้องเป็นหนึ่งใน: ${VALID_STATUSES.join(', ')}`),
      { statusCode: 400 }
    );
  }

  return interserviceRepository.updateById(checkId, {
    status: dto.status as (typeof VALID_STATUSES)[number] | undefined,
    referenceId: dto.referenceId,
    notes: dto.notes,
  });
};
