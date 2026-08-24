import * as advisorRepository from '../../repositories/advisor.repository';
import * as visaRepository from '../../repositories/visa.repository';
import * as passportRepository from '../../repositories/passport.repository';
import * as userRepository from '../../repositories/user.repository';
import { uploadToR2 } from '../external/r2.service';
import { CreateAdvisorDto, UpdateAdvisorDto } from '../../repositories/advisor.repository';

// ── Queries ───────────────────────────────────────────────────────

export const getAdvisors = () => advisorRepository.findAll();

export const getDeans = () => userRepository.findByRole('DEAN');

export const getAdvisorById = async (id: number) => {
  const advisor = await advisorRepository.findById(id);
  if (!advisor) throw Object.assign(new Error('Advisor not found'), { statusCode: 404 });
  const { user, ...rest } = advisor;
  return { ...rest, email: user?.email ?? null };
};

export const getMyProfile = async (userId: number) => {
  const advisor = await advisorRepository.findByUserId(userId);
  if (!advisor) throw Object.assign(new Error('Advisor profile not found'), { statusCode: 404 });

  // enrich students with active visa + current passport via separate batch queries
  const studentIds = advisor.students.map((s) => s.id);
  const [visas, passports] = await Promise.all([
    visaRepository.findActiveByStudentIds(studentIds),
    passportRepository.findCurrentByStudentIds(studentIds),
  ]);

  const visaMap     = Object.fromEntries(visas.map((v) => [v.studentId, v]));
  const passportMap = Object.fromEntries(passports.map((p) => [p.studentId, p]));

  const students = advisor.students.map((s) => ({
    ...s,
    activeVisa:      visaMap[s.id]     ?? null,
    currentPassport: passportMap[s.id] ?? null,
  }));

  const { user, ...rest } = advisor;
  return { ...rest, email: user?.email ?? null, photoUrl: user?.image ?? null, students };
};

// ── Mutations ─────────────────────────────────────────────────────

export const createAdvisor = async (dto: CreateAdvisorDto) => {
  if (!dto.email || !dto.firstNameEn || !dto.lastNameEn) {
    throw Object.assign(new Error('email, firstNameEn, and lastNameEn are required'), { statusCode: 400 });
  }
  return advisorRepository.createWithUser(dto);
};

export const updateMyProfile = async (userId: number, dto: UpdateAdvisorDto) => {
  return advisorRepository.updateByUserId(userId, dto);
};

export const updateAdvisorById = async (id: number, dto: UpdateAdvisorDto) => {
  const existing = await advisorRepository.findById(id);
  if (!existing) throw Object.assign(new Error('Advisor not found'), { statusCode: 404 });
  return advisorRepository.updateById(id, dto);
};

export const uploadPhoto = async (userId: number, file: Express.Multer.File) => {
  const { url } = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'photos');
  await userRepository.updateImage(userId, url);
  return { url };
};
