/**
 * Demo data for presentations: WIPES EVERY TABLE, then seeds roles/permissions
 * (seed.ts), the three real document templates (demo-data/templates.json, made by
 * export-demo-templates.ts) and a small set of realistic accounts. No requests are
 * seeded — they are submitted live during the demo. No files/images either.
 *
 *   npm run prisma:seed-demo        (passes --confirm)
 *
 * Dates on passports, visas and insurance are relative to the day the script
 * runs, so the visa-expiry alert is always "about to expire" whenever you re-seed.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { seedBase } from './seed';

if (!process.argv.includes('--confirm')) {
  console.error('⚠️  seed-demo deletes ALL data in the database. Re-run with --confirm (npm run prisma:seed-demo).');
  process.exit(1);
}

// One connection, so SET FOREIGN_KEY_CHECKS (session-scoped) applies to the TRUNCATEs
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set('connection_limit', '1');
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });

type DemoTemplates = {
  templates: {
    name: string; description: string | null; body: string; variables: string | null; signingMethod: string;
    requestTypes: { name: string; description: string | null; icon: string | null }[];
  }[];
  variables: { key: string; label: string; description: string | null; inputType: string; options: string | null }[];
};

const DAY = 24 * 60 * 60 * 1000;
const today = new Date(new Date().toISOString().slice(0, 10)); // midnight UTC
const daysFromNow = (n: number) => new Date(today.getTime() + n * DAY);
const date = (iso: string) => new Date(iso);

async function wipe() {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`
  );
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const { name } of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${name}\``);
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }
  console.log(`🧹 Emptied ${tables.length} tables`);
}

async function seedTemplates() {
  const data: DemoTemplates = JSON.parse(readFileSync(join(__dirname, 'demo-data', 'templates.json'), 'utf8'));

  // Overwrite seed.ts's defaults: the snapshot carries the input types and options
  for (const v of data.variables) {
    const fields = { label: v.label, description: v.description, inputType: v.inputType, options: v.options };
    await prisma.templateVariable.upsert({ where: { key: v.key }, update: fields, create: { key: v.key, ...fields } });
  }

  for (const t of data.templates) {
    const template = await prisma.documentTemplate.create({
      data: { name: t.name, description: t.description, body: t.body, variables: t.variables, signingMethod: t.signingMethod },
    });
    for (const rt of t.requestTypes) {
      await prisma.requestType.create({
        data: { ...rt, documentTemplates: { connect: { id: template.id } } },
      });
    }
  }
  console.log(`📄 ${data.templates.length} document templates, ${data.variables.length} template variables`);
}

async function roleIds() {
  const roles = await prisma.role.findMany();
  return (code: string) => {
    const role = roles.find(r => r.code === code);
    if (!role) throw new Error(`Role ${code} missing`);
    return { roleId: role.id };
  };
}

async function seedPeople() {
  const role = await roleIds();

  // ── IR staff who is also advisor, dean and admin ──
  // seedBase() already created this user as ADMIN; give them the demo name and the other roles.
  // ", Ph.D." goes on the last name: advisorFullName() joins title + first + last only.
  const staff = await prisma.user.update({
    where: { email: 'pichamonisme@gmail.com' },
    data: {
      name: 'Asst. Prof. Pusadee Seresangtakul, Ph.D.',
      phone: '043-009-700',
      userRoles: { create: ['STAFF', 'ADVISOR', 'DEAN'].map(role) },
      advisor: {
        create: {
          titleEn: 'Asst. Prof.', firstNameEn: 'Pusadee', lastNameEn: 'Seresangtakul, Ph.D.',
          nationality: 'Thai', phone: '043-009-700',
        },
      },
    },
    include: { advisor: true },
  });

  // ── Lecturer the dean can delegate signing to (position set ⇒ VICE_DEAN) ──
  await prisma.user.create({
    data: {
      email: 'pichamonph.work@gmail.com',
      name: 'Assoc. Prof. Siriporn Chanthawong, Ph.D.',
      phone: '043-009-712',
      userRoles: { create: ['ADVISOR', 'VICE_DEAN'].map(role) },
      advisor: {
        create: {
          titleEn: 'Assoc. Prof.', firstNameEn: 'Siriporn', lastNameEn: 'Chanthawong, Ph.D.',
          nationality: 'Thai', phone: '043-009-712', position: 'Associate Dean for Academic Affairs',
        },
      },
    },
  });

  const advisorId = staff.advisor!.id;
  const studentRole = role('STUDENT');

  // ── Student 1: Lao, Master's, ASEAN & GMS scholarship, visa about to expire ──
  const souk = await prisma.user.create({
    data: {
      email: 'pichamon.ph@kkumail.com',
      name: 'Souksavanh Phommachanh',
      phone: '+66 92 418 3527',
      userRoles: { create: [studentRole] },
      student: {
        create: {
          studentId: '683380125-6',
          titleEn: 'Mr.', firstNameEn: 'Souksavanh', lastNameEn: 'Phommachanh',
          dateOfBirth: date('1999-03-14'), gender: 'MALE',
          nationality: 'Laotian', religion: 'Buddhism', homeCountry: 'Laos',
          email: 'pichamon.ph@kkumail.com', phone: '+66 92 418 3527',
          addressInThailand: 'Room 412, KKU International House, 123 Mittraphap Road, Nai Mueang, Mueang Khon Kaen, Khon Kaen 40002',
          homeAddress: 'House 58, Unit 7, Ban Phonxay, Saysettha District, Vientiane Capital, Lao PDR',
          emergencyContact: 'Bounmy Phommachanh', emergencyRelation: 'Parent',
          emergencyPhone: '+856 20 5581 2943', emergencyEmail: 'bounmy.p@gmail.com',
          faculty: 'College of Computing',
          program: 'M.Sc. Data Science and Artificial Intelligence (International Program)',
          level: 'MASTER', startingSemester: 'FIRST', scholarship: 'ASEAN & GMS',
          enrollmentDate: date('2025-06-23'), expectedGraduation: date('2027-05-31'),
          advisorId, registrationStatus: 'ACTIVE', registrationStep: 2,
        },
      },
    },
    include: { student: true },
  });
  const soukId = souk.student!.id;
  const soukPassport = await prisma.passport.create({
    data: {
      studentId: soukId, passportNumber: 'P2184739', issuingCountry: 'Laos', placeOfIssue: 'Vientiane',
      issueDate: daysFromNow(-640), expiryDate: daysFromNow(1186), isVerified: true,
    },
  });
  await prisma.visa.create({
    data: {
      studentId: soukId, passportId: soukPassport.id, visaNumber: 'N7302651', visaType: 'Non-ED',
      issuingCountry: 'Laos', issuingPlace: 'Royal Thai Embassy, Vientiane', entries: '1',
      issueDate: daysFromNow(-320), expiryDate: daysFromNow(45),
    },
  });
  await prisma.healthInsurance.create({
    data: {
      studentId: soukId, provider: 'Muang Thai Life Assurance', policyNumber: 'MTL-68-0457812',
      coverageType: 'Inpatient + Outpatient (IPD/OPD)', startDate: daysFromNow(-115), expiryDate: daysFromNow(250),
    },
  });

  // ── Student 2: Vietnamese, Ph.D., self-funded, spouse as dependent ──
  const nguyen = await prisma.user.create({
    data: {
      email: 'thitikorn.su@kkumail.com',
      name: 'Nguyen Thi Thu Ha',
      phone: '+66 81 736 2094',
      userRoles: { create: [studentRole] },
      student: {
        create: {
          studentId: '673380917-2',
          titleEn: 'Ms.', firstNameEn: 'Nguyen', middleNameEn: 'Thi Thu', lastNameEn: 'Ha',
          dateOfBirth: date('1993-09-02'), gender: 'FEMALE',
          nationality: 'Vietnamese', religion: 'Buddhism', homeCountry: 'Vietnam',
          email: 'thitikorn.su@kkumail.com', phone: '+66 81 736 2094',
          addressInThailand: '99/27 Moo 16, Soi Kang Sadan 3, Sila, Mueang Khon Kaen, Khon Kaen 40000',
          homeAddress: '45 Le Loi Street, Vinh Ninh Ward, Hue City, Thua Thien Hue, Vietnam',
          emergencyContact: 'Tran Van Minh', emergencyRelation: 'Spouse',
          emergencyPhone: '+66 98 205 6431', emergencyEmail: 'tranvanminh.hue@gmail.com',
          faculty: 'College of Computing',
          program: 'Ph.D. Computer Science and Information Technology (International Program)',
          level: 'PHD', startingSemester: 'SECOND', scholarship: 'Self-support',
          enrollmentDate: date('2024-11-11'), expectedGraduation: date('2027-10-31'),
          advisorId, registrationStatus: 'ACTIVE', registrationStep: 2,
        },
      },
    },
    include: { student: true },
  });
  const nguyenId = nguyen.student!.id;
  const nguyenPassport = await prisma.passport.create({
    data: {
      studentId: nguyenId, passportNumber: 'C4729105', issuingCountry: 'Vietnam', placeOfIssue: 'Immigration Department, Hanoi',
      issueDate: daysFromNow(-1050), expiryDate: daysFromNow(2600), isVerified: true,
    },
  });
  await prisma.visa.create({
    data: {
      studentId: nguyenId, passportId: nguyenPassport.id, visaNumber: 'N8156204', visaType: 'Non-ED',
      issuingCountry: 'Thailand', issuingPlace: 'Khon Kaen Immigration Office', entries: '1',
      issueDate: daysFromNow(-120), expiryDate: daysFromNow(245),
      remarks: 'Extension of stay for study',
    },
  });
  await prisma.healthInsurance.create({
    data: {
      studentId: nguyenId, provider: 'Bangkok Insurance', policyNumber: 'BKI-PA-2026-118395',
      coverageType: 'Comprehensive', startDate: daysFromNow(-200), expiryDate: daysFromNow(165),
    },
  });

  const spouse = await prisma.dependent.create({
    data: {
      studentId: nguyenId, relationship: 'Spouse', title: 'Mr.',
      firstName: 'Tran', middleName: 'Van', lastName: 'Minh',
      email: 'tranvanminh.hue@gmail.com', phone: '+66 98 205 6431',
      dateOfBirth: date('1991-05-20'), gender: 'MALE', nationality: 'Vietnamese',
    },
  });
  const spousePassport = await prisma.passport.create({
    data: {
      studentId: nguyenId, dependentId: spouse.id, passportNumber: 'C3851462', issuingCountry: 'Vietnam',
      issueDate: daysFromNow(-900), expiryDate: daysFromNow(2750),
    },
  });
  await prisma.visa.create({
    data: {
      studentId: nguyenId, dependentId: spouse.id, passportId: spousePassport.id,
      visaType: 'Non-O (Dependent)', issueDate: daysFromNow(-120), expiryDate: daysFromNow(245),
    },
  });

  console.log('👥 Users:');
  console.log('  pichamonisme@gmail.com     STAFF, ADVISOR, DEAN, ADMIN  Asst. Prof. Pusadee Seresangtakul, Ph.D.');
  console.log('  pichamonph.work@gmail.com  ADVISOR, VICE_DEAN           Assoc. Prof. Siriporn Chanthawong, Ph.D.');
  console.log('  pichamon.ph@kkumail.com    STUDENT                      Mr. Souksavanh Phommachanh (visa expires in 45 days)');
  console.log('  thitikorn.su@kkumail.com   STUDENT                      Ms. Nguyen Thi Thu Ha (+ spouse)');
}

async function main() {
  await wipe();
  await seedBase();
  await seedTemplates();
  await seedPeople();
  console.log('🎉 Demo data ready');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  // seed.ts keeps its own client open, so exit explicitly
  .finally(async () => { await prisma.$disconnect(); process.exit(); });
