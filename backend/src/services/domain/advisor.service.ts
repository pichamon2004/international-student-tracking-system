import * as advisorRepository from '../../repositories/advisor.repository';
import * as visaRepository from '../../repositories/visa.repository';
import * as passportRepository from '../../repositories/passport.repository';
import * as userRepository from '../../repositories/user.repository';
import * as deanDelegationRepository from '../../repositories/deanDelegation.repository';
import prisma from '../../utils/prisma';
import * as fileService from './file.service';
import type { ClaimActor } from './filePolicy';
import { ADVISOR_FILES, presentOne, resolveFileFields, userPhotoUrl } from './fileFields';
import { CreateAdvisorDto, UpdateAdvisorDto, advisorDisplayName } from '../../repositories/advisor.repository';

// ── Queries ───────────────────────────────────────────────────────

// email flat on each advisor, the same as getAdvisorById
export const getAdvisors = async () =>
  (await advisorRepository.findAll()).map(a => ({ ...a, email: a.user?.email ?? null }));

export const getDeans = () => userRepository.findByRole('DEAN');

export const getAdvisorById = async (id: number) => {
  const advisor = await advisorRepository.findById(id);
  if (!advisor) throw Object.assign(new Error('Advisor not found'), { statusCode: 404 });
  const { user, ...rest } = advisor;
  return { ...(await presentOne(rest, ADVISOR_FILES)), email: user?.email ?? null, photoUrl: user ? await userPhotoUrl(user) : null };
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

  // Shaped as arrays (not singular activeVisa/currentPassport) to match
  // ApiAdvisor's declared type and how every other student list in the app
  // (staff dashboard, notifications, etc.) already reads visa/passport data.
  const students = advisor.students.map((s) => ({
    ...s,
    visas:     visaMap[s.id]     ? [visaMap[s.id]]     : [],
    passports: passportMap[s.id] ? [passportMap[s.id]] : [],
  }));

  const { user, ...rest } = advisor;
  return { ...(await presentOne(rest, ADVISOR_FILES)), email: user?.email ?? null, photoUrl: user ? await userPhotoUrl(user) : null, students };
};

// ── Mutations ─────────────────────────────────────────────────────

// undefined = leave unchanged; blank/null = clear (Excel cells may not be strings)
// A cleared input ("") clears the middle name; undefined leaves it as is
const blankToNull = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

const normalizePosition = (position: unknown): string | null | undefined =>
  position === undefined ? undefined : (position == null ? null : String(position).trim() || null);

// An administrative position is what makes an advisor an executive: they get
// the VICE_DEAN role (so they can sign in as one) and become eligible to sign
// for the dean. Losing the position takes both away again.
const syncExecutiveRole = async (userId: number, isExecutive: boolean) => {
  const role = await prisma.role.findUnique({ where: { code: 'VICE_DEAN' } });
  if (!role) {
    console.warn('VICE_DEAN role missing — run the seed to create it');
    return;
  }
  if (isExecutive) {
    await prisma.userRole.upsert({
      where:  { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  } else {
    await prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
    await deanDelegationRepository.revokeOpenByDelegateId(userId);
  }
};

export const createAdvisor = async (dto: CreateAdvisorDto) => {
  if (!dto.email || !dto.firstNameEn || !dto.lastNameEn) {
    throw Object.assign(new Error('email, firstNameEn, and lastNameEn are required'), { statusCode: 400 });
  }
  const advisor = await advisorRepository.createWithUser({ ...dto, position: normalizePosition(dto.position) });
  if (advisor.position) await syncExecutiveRole(advisor.userId, true);
  return advisor;
};

// users.name is what signatures, approvals and the header show — keep it in
// step with the advisor's name fields
const syncUserName = (advisor: Parameters<typeof advisorDisplayName>[0] & { userId: number }) =>
  prisma.user.update({ where: { id: advisor.userId }, data: { name: advisorDisplayName(advisor) } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Staff changing the advisor's login email. The Google account linked to the
// old address is unlinked, so the next sign-in links the new address's account
// and the old one stops working.
async function changeEmail(userId: number, currentEmail: string, raw: unknown) {
  if (typeof raw !== 'string') return;
  const email = raw.trim().toLowerCase();
  if (!email || email === currentEmail.toLowerCase()) return;
  if (!EMAIL_RE.test(email)) throw Object.assign(new Error('Invalid email address'), { statusCode: 400 });
  const taken = await userRepository.findByEmail(email);
  if (taken && taken.id !== userId) {
    throw Object.assign(new Error('This email is already used by another account'), { statusCode: 409 });
  }
  await prisma.user.update({ where: { id: userId }, data: { email, googleId: null } });
}

export const updateMyProfile = async (userId: number, dto: UpdateAdvisorDto) => {
  const advisor = await advisorRepository.updateByUserId(userId, { ...dto, middleNameEn: blankToNull(dto.middleNameEn) });
  await syncUserName(advisor);
  // The full profile (email, photo, students) — what the profile page shows
  return getMyProfile(userId);
};

export const updateAdvisorById = async (
  id: number,
  dto: Omit<UpdateAdvisorDto, 'workPermitFileUrl'> & { workPermitFileUrl?: string | null; email?: unknown },
  actor: ClaimActor
) => {
  const existing = await advisorRepository.findById(id);
  if (!existing) throw Object.assign(new Error('Advisor not found'), { statusCode: 404 });
  await changeEmail(existing.userId, existing.user.email, dto.email);
  // The work permit belongs to the advisor's user, not to whoever attaches it
  const { workPermitFileUrl, email: _email, ...rest } = dto;
  rest.middleNameEn = blankToNull(rest.middleNameEn);
  const permit = workPermitFileUrl === undefined
    ? {}
    : await resolveFileFields({ workPermitFileUrl }, ADVISOR_FILES, { kind: 'user', userId: existing.userId }, actor);
  const advisor = await advisorRepository.updateById(id, { ...rest, ...permit, position: normalizePosition(dto.position) });
  await syncExecutiveRole(advisor.userId, !!advisor.position && advisor.isActive);
  await syncUserName(advisor);
  return advisor;
};

// The photo belongs to the advisor's user; uploadedById records who put it there (them, or staff)
async function storePhoto(ownerUserId: number, uploadedById: number, file: Express.Multer.File) {
  const { url, file: stored } = await fileService.store(file.buffer, {
    originalName: file.originalname, purpose: 'USER_PHOTO', uploadedById, ownerUserId,
  });
  await userRepository.updateImageFile(ownerUserId, stored.id);
  return { url, fileId: stored.id };
}

export const uploadPhoto = (userId: number, file: Express.Multer.File) => storePhoto(userId, userId, file);

// Staff setting an advisor's photo from Teacher Management
export const uploadPhotoForAdvisor = async (advisorId: number, file: Express.Multer.File, staffUserId: number) => {
  const advisor = await advisorRepository.findById(advisorId);
  if (!advisor) throw Object.assign(new Error('Advisor not found'), { statusCode: 404 });
  return storePhoto(advisor.userId, staffUserId, file);
};
