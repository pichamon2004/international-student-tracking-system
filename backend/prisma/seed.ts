import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Document Templates ──────────────────────────────────────────
  const leaveTemplate = await prisma.documentTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Leave Request Form',
      description: 'แบบฟอร์มขอออกนอกประเทศ (CP KKU)',
      isActive: true,
      variables: JSON.stringify([
        '{{student_name}}', '{{student_id}}', '{{student_title}}',
        '{{thai_tel}}', '{{email}}', '{{education_level}}',
        '{{funding_type}}', '{{scholarship_name}}', '{{program}}',
        '{{destination}}', '{{purpose}}', '{{duration_days}}',
        '{{leave_start}}', '{{leave_end}}', '{{visa_expiry}}',
        '{{advisor_name}}', '{{date}}',
      ]),
      body: `Memorandum

Subject: Leave Request / ขออนุญาตออกนอกประเทศชั่วคราว

To: Dean of the College of Computing, Khon Kaen University

Dear Dean,

I, {{student_title}} {{student_name}} (Student ID: {{student_id}}), Thai Tel. {{thai_tel}}, E-mail: {{email}},
am a {{education_level}} student funded by {{funding_type}} ({{scholarship_name}}) in the {{program}} program at the College of Computing, Khon Kaen University.

I would like to request permission to temporarily leave Thailand to travel to {{destination}} for the following purpose:
  {{purpose}}

Duration of leave: {{duration_days}}
Departure date: {{leave_start}}
Return date: {{leave_end}}

My current Thai visa expires on {{visa_expiry}}. I have already applied for a re-entry permit prior to departure.

I sincerely request your kind consideration and approval.

Yours faithfully,

Signature: ___________________________
Name: {{student_name}}
Date: {{date}}

Approved by Advisor: {{advisor_name}}
Advisor Signature: ___________________________`,
    },
  });

  const enrollmentTemplate = await prisma.documentTemplate.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Enrollment Certificate',
      description: 'หนังสือรับรองการเป็นนักศึกษา',
      isActive: true,
      variables: JSON.stringify([
        '{{student_name}}', '{{student_id}}', '{{program}}', '{{date}}',
      ]),
      body: `ENROLLMENT CERTIFICATE

College of Computing, Khon Kaen University

This is to certify that:

  Name: {{student_name}}
  Student ID: {{student_id}}

is currently enrolled in the {{program}} program at the College of Computing, Khon Kaen University and is a full-time student in good academic standing.

This certificate is issued upon request for official purposes.

Issued on: {{date}}

_____________________________
Dean of College of Computing`,
    },
  });

  const conferenceTemplate = await prisma.documentTemplate.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Conference Participation Letter',
      description: 'หนังสือรับรองเข้าร่วมประชุมวิชาการ',
      isActive: true,
      variables: JSON.stringify([
        '{{student_name}}', '{{student_id}}', '{{program}}', '{{advisor_name}}',
        '{{conference_name}}', '{{conference_venue}}', '{{paper_title}}', '{{date}}',
      ]),
      body: `LETTER OF CONFIRMATION FOR CONFERENCE PARTICIPATION

College of Computing, Khon Kaen University

This is to confirm that {{student_name}} (Student ID: {{student_id}}), enrolled in the {{program}} program under the supervision of {{advisor_name}}, has been accepted to present at:

  Conference: {{conference_name}}
  Venue: {{conference_venue}}
  Paper Title: {{paper_title}}

This letter is issued to support visa and travel arrangements.

Issued on: {{date}}

_____________________________
Dean of College of Computing`,
    },
  });

  console.log('✅ Document templates seeded');

  // ── Request Types ───────────────────────────────────────────────
  await prisma.requestType.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Leave Request Form',
      description: 'ขออนุญาตออกนอกประเทศชั่วคราว',
      icon: 'RiPlaneLine',
      isActive: true,
      documentTemplates: { connect: [{ id: leaveTemplate.id }] },
    },
  });

  await prisma.requestType.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Visa Extension',
      description: 'ยื่นคำร้องขอต่ออายุวีซ่านักศึกษา',
      icon: 'RiPassportLine',
      isActive: true,
      documentTemplates: { connect: [{ id: enrollmentTemplate.id }] },
    },
  });

  await prisma.requestType.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Enrollment Certificate',
      description: 'หนังสือรับรองการเป็นนักศึกษา',
      icon: 'RiGraduationCapLine',
      isActive: true,
      documentTemplates: { connect: [{ id: enrollmentTemplate.id }] },
    },
  });

  await prisma.requestType.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Name Change',
      description: 'ขอเปลี่ยนชื่อ-นามสกุลในระบบ',
      icon: 'RiFileUserLine',
      isActive: true,
    },
  });

  await prisma.requestType.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Conference Letter',
      description: 'ขอหนังสือรับรองเข้าร่วมประชุมวิชาการ',
      icon: 'RiGlobalLine',
      isActive: true,
      documentTemplates: { connect: [{ id: conferenceTemplate.id }] },
    },
  });

  console.log('✅ Request types seeded');

  // ── Demo Student ────────────────────────────────────────────────
  const demoUser = await prisma.user.upsert({
    where: { email: 'pichamon.p@kkumail.com' },
    update: {},
    create: {
      email: 'pichamon.p@kkumail.com',
      name: 'Pichamon Phongphrathapet',
      role: 'STUDENT',
    },
  });

  await prisma.student.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      studentId: '033380305-4',
      titleEn: 'Miss',
      firstNameEn: 'Pichamon',
      lastNameEn: 'Phongphrathapet',
      email: 'pichamon.p@kkumail.com',
      phone: '085-123-4567',
      faculty: 'College of Computing',
      program: 'Computer Engineering',
      level: 'PHD',
      scholarship: 'KKU International Scholarship',
      registrationStatus: 'ACTIVE',
    },
  });

  console.log('✅ Demo student seeded');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
