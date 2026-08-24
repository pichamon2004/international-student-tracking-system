import * as visaRenewalRepository from '../../repositories/visaRenewal.repository';
import * as visaRepository from '../../repositories/visa.repository';

export const getVisaRenewals = async (isResolved?: boolean) => {
  const where: Record<string, unknown> = {};
  if (isResolved !== undefined) where.isResolved = isResolved;

  const renewals = await visaRenewalRepository.findMany(where);

  const studentIds = renewals.map((r) => r.student.id);
  const currentVisas = await visaRepository.findActiveByStudentIds(studentIds);
  const visaByStudentId = Object.fromEntries(currentVisas.map((v) => [v.studentId, v]));

  return renewals.map((r) => ({
    ...r,
    student: {
      ...r.student,
      visas: visaByStudentId[r.student.id] ? [visaByStudentId[r.student.id]] : [],
    },
  }));
};

export const resolveVisaRenewal = async (id: number) => {
  const renewal = await visaRenewalRepository.findById(id);
  if (!renewal) {
    throw Object.assign(new Error('Visa renewal not found'), { statusCode: 404 });
  }
  return visaRenewalRepository.resolveById(renewal.id);
};

export const getStudentVisaRenewals = (studentId: number) =>
  visaRenewalRepository.findByStudentId(studentId);
