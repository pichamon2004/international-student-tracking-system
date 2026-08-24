/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────────────────

const MODULES = [
  { code: 'STUDENT_MANAGEMENT',       name: 'จัดการนักศึกษา',                sortOrder: 1 },
  { code: 'ADVISOR_MANAGEMENT',       name: 'จัดการอาจารย์ที่ปรึกษา',        sortOrder: 2 },
  { code: 'USER_MANAGEMENT',          name: 'จัดการผู้ใช้งาน',               sortOrder: 3 },
  { code: 'REQUEST_MANAGEMENT',       name: 'จัดการคำร้อง',                  sortOrder: 4 },
  { code: 'DOCUMENT_MANAGEMENT',      name: 'จัดการเอกสาร',                  sortOrder: 5 },
  { code: 'TEMPLATE_MANAGEMENT',      name: 'จัดการเทมเพลตเอกสาร',           sortOrder: 6 },
  { code: 'EMAIL_TEMPLATE_MANAGEMENT',name: 'จัดการเทมเพลตอีเมล',            sortOrder: 7 },
  { code: 'HEALTH_INSURANCE_MANAGEMENT', name: 'จัดการประกันสุขภาพ',         sortOrder: 8 },
  { code: 'VISA_MANAGEMENT',          name: 'จัดการวีซ่า',                   sortOrder: 9 },
  { code: 'PASSPORT_MANAGEMENT',      name: 'จัดการหนังสือเดินทาง',          sortOrder: 10 },
  { code: 'GENERATED_DOC_MANAGEMENT', name: 'ออกเอกสารสำหรับนักศึกษา',       sortOrder: 11 },
  { code: 'INTERSERVICE_MANAGEMENT',  name: 'ตรวจสอบข้อมูลระหว่างหน่วยงาน', sortOrder: 12 },
  { code: 'NOTIFICATION_MANAGEMENT',  name: 'จัดการการแจ้งเตือน',            sortOrder: 13 },
  { code: 'AUDIT_LOG',                name: 'ดูประวัติการใช้งาน',             sortOrder: 14 },
  { code: 'ROLE_MANAGEMENT',          name: 'จัดการ Role และ Permission',     sortOrder: 15 },
];

// module ที่มีแค่ view (ไม่มี create/edit/delete)
const VIEW_ONLY_MODULES = new Set(['AUDIT_LOG']);

const METHODS = ['view', 'create', 'edit', 'delete'] as const;

// ─────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────

const ROLES = [
  { code: 'STUDENT', name: 'นักศึกษา',          description: 'ยื่นคำร้อง และดูข้อมูลตัวเอง' },
  { code: 'ADVISOR', name: 'อาจารย์ที่ปรึกษา',   description: 'ดูนักศึกษา และอนุมัติคำร้อง' },
  { code: 'STAFF',   name: 'เจ้าหน้าที่',         description: 'จัดการนักศึกษา คำร้อง เอกสาร และผู้ใช้งาน' },
  { code: 'ADMIN',   name: 'ผู้ดูแลระบบ',          description: 'กำหนด Role และ Permission ในระบบ' },
  { code: 'DEAN',    name: 'คณบดี / รองคณบดี',    description: 'อนุมัติคำร้องในระดับคณบดี' },
];

// ─────────────────────────────────────────────────────
// DEFAULT PERMISSIONS PER ROLE
// ─────────────────────────────────────────────────────

// permission codes ที่ ADVISOR ได้รับ
const ADVISOR_PERMISSIONS = new Set([
  'REQUEST_MANAGEMENT.view',
  'REQUEST_MANAGEMENT.edit',
  'STUDENT_MANAGEMENT.view',
  'INTERSERVICE_MANAGEMENT.view',
  'NOTIFICATION_MANAGEMENT.view',
]);

// module ที่ STAFF ไม่ได้รับ (ROLE_MANAGEMENT เป็นของ ADMIN เท่านั้น)
const STAFF_EXCLUDED_MODULES = new Set(['ROLE_MANAGEMENT']);

// permission codes ที่ DEAN ได้รับ
const DEAN_PERMISSIONS = new Set([
  'REQUEST_MANAGEMENT.view',
  'REQUEST_MANAGEMENT.edit',
  'NOTIFICATION_MANAGEMENT.view',
]);

// permission codes ที่ ADMIN ได้รับ
const ADMIN_PERMISSIONS = new Set([
  'ROLE_MANAGEMENT.view',
  'ROLE_MANAGEMENT.create',
  'ROLE_MANAGEMENT.edit',
  'ROLE_MANAGEMENT.delete',
  'USER_MANAGEMENT.view',
  'USER_MANAGEMENT.create',
  'USER_MANAGEMENT.edit',
  'USER_MANAGEMENT.delete',
  'AUDIT_LOG.view',
]);

// ─────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // 1. สร้าง Modules
  console.log('📦 Creating modules...');
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: { name: mod.name, sortOrder: mod.sortOrder },
      create: { code: mod.code, name: mod.name, sortOrder: mod.sortOrder, level: 1 },
    });
  }

  // 2. สร้าง Permissions (MODULE.method)
  console.log('🔑 Creating permissions...');
  for (const mod of MODULES) {
    const methods = VIEW_ONLY_MODULES.has(mod.code) ? ['view'] : [...METHODS];
    const module = await prisma.module.findUnique({ where: { code: mod.code } });
    if (!module) continue;

    for (const method of methods) {
      const code = `${mod.code}.${method}`;
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          moduleId: module.id,
          method,
          code,
          description: `${method} - ${mod.name}`,
        },
      });
    }
  }

  // 3. สร้าง Roles
  console.log('👥 Creating roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: { code: role.code, name: role.name, description: role.description, isActive: true },
    });
  }

  // 4. Assign permissions ให้แต่ละ role
  console.log('🔗 Assigning permissions to roles...');
  const allPermissions = await prisma.permission.findMany({ include: { module: true } });

  for (const role of ROLES) {
    const roleRecord = await prisma.role.findUnique({ where: { code: role.code } });
    if (!roleRecord) continue;

    let targetPermissions: typeof allPermissions = [];

    if (role.code === 'STUDENT') {
      // STUDENT ไม่มี permission (ใช้ ownership check แทน)
      targetPermissions = [];

    } else if (role.code === 'ADVISOR') {
      targetPermissions = allPermissions.filter(p => ADVISOR_PERMISSIONS.has(p.code));

    } else if (role.code === 'STAFF') {
      // STAFF ได้ทุก permission ยกเว้น ROLE_MANAGEMENT
      targetPermissions = allPermissions.filter(
        p => !STAFF_EXCLUDED_MODULES.has(p.module.code)
      );

    } else if (role.code === 'ADMIN') {
      targetPermissions = allPermissions.filter(p => ADMIN_PERMISSIONS.has(p.code));
    } else if (role.code === 'DEAN') {
      targetPermissions = allPermissions.filter(p => DEAN_PERMISSIONS.has(p.code));
    }

    for (const perm of targetPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleRecord.id, permissionId: perm.id } },
        update: {},
        create: { roleId: roleRecord.id, permissionId: perm.id },
      });
    }

    console.log(`  ✅ ${role.code}: ${targetPermissions.length} permissions`);
  }

  // 5. สร้าง default admin user
  console.log('👤 Creating default admin user...');
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (adminRole) {
    const adminUser = await prisma.user.upsert({
      where: { email: 'pichamonisme@gmail.com' },
      update: {},
      create: {
        email: 'pichamonisme@gmail.com',
        name: 'Pichamon (Admin)',
        isActive: true,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
    console.log('  ✅ Admin user: pichamonisme@gmail.com (Google login)');
  }

  // 6. migrate User.role (String) → UserRole records
  console.log('🔄 Migrating User.role → UserRole...');
  const users = await prisma.user.findMany({ where: { role: { not: null } } });
  let migrated = 0;

  for (const user of users) {
    if (!user.role) continue;
    const roleRecord = await prisma.role.findUnique({ where: { code: user.role } });
    if (!roleRecord) continue;

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
      update: {},
      create: { userId: user.id, roleId: roleRecord.id },
    });
    migrated++;
  }

  console.log(`  ✅ Migrated ${migrated} users`);

  // 7. Seed template variables
  console.log('🔤 Seeding template variables...');
  const DEFAULT_VARIABLES = [
    { key: 'student_name',     label: 'Student Name' },
    { key: 'student_id',       label: 'Student ID' },
    { key: 'student_title',    label: 'Title (Mr./Mrs./Miss)' },
    { key: 'thai_tel',         label: 'Thai Tel. No.' },
    { key: 'email',            label: 'Email' },
    { key: 'education_level',  label: 'Education Level' },
    { key: 'funding_type',     label: 'Funding Type' },
    { key: 'scholarship_name', label: 'Scholarship Name' },
    { key: 'program',          label: 'Program' },
    { key: 'destination',      label: 'Destination City & Country' },
    { key: 'purpose',          label: 'Purpose of Leave' },
    { key: 'duration_days',    label: 'Duration (days/months)' },
    { key: 'leave_start',      label: 'Leave Start Date' },
    { key: 'leave_end',        label: 'Leave End Date' },
    { key: 'visa_expiry',      label: 'Visa Expiry' },
    { key: 'advisor_name',     label: 'Advisor Name' },
    { key: 'date',             label: 'Current Date' },
    { key: 'visa_expiry_date', label: 'Visa Expiry Date' },
    { key: 'days_remaining',   label: 'Days Remaining' },
    { key: 'request_type',     label: 'Request Type' },
    { key: 'status',           label: 'Status' },
    { key: 'dean_name',        label: 'Dean Name' },
  ];

  for (const v of DEFAULT_VARIABLES) {
    await prisma.templateVariable.upsert({
      where:  { key: v.key },
      update: {},
      create: v,
    });
  }
  console.log(`  ✅ ${DEFAULT_VARIABLES.length} template variables seeded`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
