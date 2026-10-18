/**
 * Who may see a student's requests and the documents generated for them, and
 * who may sign which box. Shared by requests and generated documents so a PDF is
 * never more visible than the request it belongs to.
 */
import * as studentRepository from '../../repositories/student.repository';
import * as advisorRepository from '../../repositories/advisor.repository';
import * as deanDelegationRepository from '../../repositories/deanDelegation.repository';
import * as deanDelegationService from './deanDelegation.service';

const denied = () => Object.assign(new Error('Access denied'), { statusCode: 403 });

async function isOwnStudent(userId: number, studentId: number) {
  const student = await studentRepository.findByUserId(userId);
  return student?.id === studentId;
}

async function isAdvisorOf(userId: number, studentId: number) {
  const advisor = await advisorRepository.findStudentIdsByUserId(userId);
  return (advisor?.students ?? []).some(s => s.id === studentId);
}

/** A student's profile records (passport, visa, …): STAFF, the student's advisor, or the student — as requireStudentOwnership. */
export async function canViewStudentProfile(studentId: number, userRole?: string, userId?: number): Promise<boolean> {
  if (userId === undefined) return false;
  if (userRole === 'STAFF') return true;
  if (userRole === 'ADVISOR') return isAdvisorOf(userId, studentId);
  if (userRole === 'STUDENT') return isOwnStudent(userId, studentId);
  return false;
}

export async function canViewStudentRequests(studentId: number, userRole?: string, userId?: number): Promise<boolean> {
  try {
    await assertCanViewStudentRequests(studentId, userRole, userId);
    return userId !== undefined;
  } catch {
    return false;
  }
}

/** Students see their own, advisors their advisees', an executive only while delegated; staff roles see all. */
export async function assertCanViewStudentRequests(studentId: number, userRole?: string, userId?: number): Promise<void> {
  if (userId === undefined) return;
  if (userRole === 'STUDENT' && !(await isOwnStudent(userId, studentId))) throw denied();
  if (userRole === 'ADVISOR' && !(await isAdvisorOf(userId, studentId))) throw denied();
  if (userRole === 'VICE_DEAN' && !(await deanDelegationRepository.findActiveByDelegateId(userId))) throw denied();
}

/**
 * A signature box can only be signed by the person it stands for: the student
 * themself, that student's advisor, IR staff, or whoever may act as dean now.
 */
export async function assertCanSignAs(sigRole: string, studentId: number, userId: number, userRole?: string): Promise<void> {
  switch (sigRole) {
    case 'student':
      if (userRole !== 'STUDENT' || !(await isOwnStudent(userId, studentId))) throw denied();
      return;
    case 'advisor':
      if (userRole !== 'ADVISOR' || !(await isAdvisorOf(userId, studentId))) throw denied();
      return;
    case 'ir_staff':
      if (userRole !== 'STAFF') throw denied();
      return;
    case 'dean':
      await deanDelegationService.assertCanActAsDean(userId, userRole);
      return;
    default:
      throw Object.assign(new Error('Invalid signature role'), { statusCode: 400 });
  }
}
