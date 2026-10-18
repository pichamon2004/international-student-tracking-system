import * as studentRepository from '../../repositories/student.repository';
import * as advisorRepository from '../../repositories/advisor.repository';
import { createNotification } from '../notification.service';
import * as fileService from './file.service';
import { presentInsurances } from './healthInsurance.service';
import { presentAcademicDocuments } from './academicDocument.service';
import { presentPassports } from './passport.service';
import { presentVisas } from './visa.service';
import type { ClaimActor } from './filePolicy';
import { DOCUMENT_FILES, STUDENT_FILES, presentFileFields, presentOne, resolveFileFields } from './fileFields';
import { UpdateStudentDto } from '../../repositories/student.repository';

// ── Queries ───────────────────────────────────────────────────────

export const getStudents = async (query: {
  page: number;
  limit: number;
  search?: string;
  advisorId?: number;
}) => {
  const { page, limit, search, advisorId } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (advisorId) where.advisorId = advisorId;
  if (search) {
    where.OR = [
      { firstNameEn: { contains: search } },
      { lastNameEn: { contains: search } },
      { studentId: { contains: search } },
      { nationality: { contains: search } },
    ];
  }

  const [students, total] = await Promise.all([
    studentRepository.findMany(where, skip, limit),
    studentRepository.countMany(where),
  ]);

  return { students, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getStudentById = async (id: number) => {
  const student = await studentRepository.findById(id);
  if (!student) return null;
  return {
    ...(await presentOne(student, STUDENT_FILES)),
    passports: await presentPassports(student.passports),
    visas: await presentVisas(student.visas),
    healthInsurances: await presentInsurances(student.healthInsurances),
    documents: await presentFileFields(student.documents, DOCUMENT_FILES),
  };
};

export const getMyProfile = async (userId: number) => {
  const [student, staffContact] = await Promise.all([
    studentRepository.findByUserIdWithProfile(userId),
    studentRepository.findFirstStaff(),
  ]);

  if (!student) return null;

  const { user, advisor, ...rest } = student;
  const studentData = await presentOne(rest, STUDENT_FILES);

  let advisorEmail: string | null = null;
  if (advisor) {
    const advisorUser = await advisorRepository.findUserEmailById(advisor.id);
    advisorEmail = advisorUser?.user?.email ?? null;
  }

  const advisorFlat = advisor
    ? { ...advisor, email: advisorEmail }
    : null;

  return {
    ...studentData,
    passports: await presentPassports(studentData.passports),
    visas: await presentVisas(studentData.visas),
    healthInsurances: await presentInsurances(studentData.healthInsurances),
    academicDocuments: await presentAcademicDocuments(studentData.academicDocuments),
    email: studentData.email || user?.email || null,
    advisor: advisorFlat,
    staffContact: staffContact ?? null,
  };
};

// ── Mutations ─────────────────────────────────────────────────────

export const createStudent = async (data: {
  email: string;
  studentId?: string;
  titleEn?: string;
  firstNameEn: string;
  middleNameEn?: string;
  lastNameEn: string;
  nationality?: string;
  program?: string;
  level?: string;
  dateOfBirth?: string | Date;
}) => {
  const existing = await studentRepository.findUserByEmail(data.email);
  if (existing) throw Object.assign(new Error('An account with this email already exists'), { statusCode: 400 });

  const name = [data.firstNameEn, data.lastNameEn].filter(Boolean).join(' ');
  return studentRepository.createWithUser({
    ...data,
    name,
    level: data.level as import('@prisma/client').AcademicLevel | undefined,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
  });
};

// Staff edit: a photoUrl in the body is claimed like any other file reference
export const updateStudent = async (id: number, dto: Omit<UpdateStudentDto, 'photoUrl'> & { photoUrl?: string | null }, actor: ClaimActor) => {
  const { photoUrl, ...rest } = dto;
  const photo = photoUrl === undefined
    ? {}
    : await resolveFileFields({ photoUrl }, STUDENT_FILES, { kind: 'student', studentId: id }, actor);
  return presentOne(await studentRepository.update(id, { ...rest, ...photo }), STUDENT_FILES);
};

export const deleteStudent = (id: number) =>
  studentRepository.remove(id);

export const uploadPhoto = async (studentId: number, file: Express.Multer.File, uploadedById: number) => {
  const { url, file: stored } = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'STUDENT_PHOTO', uploadedById, ownerStudentId: studentId,
  });
  const student = await presentOne(await studentRepository.updatePhotoFile(studentId, stored.id), STUDENT_FILES);
  return { url, fileId: stored.id, student };
};

export const submitPhase2 = async (userId: number) => {
  const existing = await studentRepository.findByUserId(userId);
  if (!existing) throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  const isFirstSubmission = existing.registrationStep === 1 && existing.registrationStatus === 'ACTIVE';
  const isResubmission = existing.registrationStatus === 'REJECTED';
  if (!isFirstSubmission && !isResubmission) {
    throw Object.assign(new Error('Please complete the to-do checklist before submitting'), { statusCode: 400 });
  }

  const student = await studentRepository.updateByUserId(userId, {
    registrationStep: 2,
    registrationStatus: 'PENDING_APPROVAL',
    rejectionReason: null,
  });

  const staffUsers = await studentRepository.findStaffIds();
  Promise.all(
    staffUsers.map((u) =>
      createNotification({
        userId: u.id,
        type: 'REGISTRATION',
        title: 'Phase 2 Registration Submitted',
        message: `${student.firstNameEn ?? 'A student'} ${student.lastNameEn ?? ''} has completed Phase 2. Please fill in academic information.`,
        link: `/staff/students/${student.id}`,
      })
    )
  ).catch(console.error);

  return student;
};

export const approveStudent = async (studentId: number) => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });

  const updated = await studentRepository.update(studentId, {
    registrationStatus: 'ACTIVE',
    rejectionReason: null,
  });

  createNotification({
    userId: student.userId,
    type: 'REGISTRATION',
    title: 'Registration Approved',
    message: 'Your student registration has been fully approved. Welcome!',
    link: '/student/dashboard',
  }).catch(console.error);

  return updated;
};

export const rejectStudent = async (studentId: number, reason?: string) => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { statusCode: 404 });

  const updated = await studentRepository.update(studentId, {
    registrationStatus: 'REJECTED',
    rejectionReason: reason ?? null,
  });

  createNotification({
    userId: student.userId,
    type: 'REGISTRATION',
    title: 'Registration Rejected',
    message: reason
      ? `Your registration was rejected: ${reason}`
      : 'Your registration was rejected. Please contact staff for more information.',
    link: '/student/profile',
  }).catch(console.error);

  return updated;
};
