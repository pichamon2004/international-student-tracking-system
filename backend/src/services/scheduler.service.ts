import cron from 'node-cron';
import prisma from '../utils/prisma';
import { createNotifications } from './notification.service';
import { sendEmail } from './email.service';

const ALERT_DAYS = [90, 60, 30, 15, 7];

async function checkVisaExpiry() {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + Math.max(...ALERT_DAYS));

  const activeVisas = await prisma.visa.findMany({
    where: { status: 'ACTIVE', expiryDate: { lte: maxDate } },
    include: {
      student: {
        select: {
          id: true, userId: true, advisorId: true,
          firstNameEn: true, lastNameEn: true, email: true,
          user: { select: { email: true } },
          advisor: { select: { userId: true, user: { select: { email: true } } } },
        },
      },
    },
  });

  for (const visa of activeVisas) {
    const days = Math.ceil((visa.expiryDate.getTime() - today.getTime()) / 86_400_000);
    if (!ALERT_DAYS.includes(days)) continue;

    const userIds = [visa.student.userId];
    if (visa.student.advisor?.userId) userIds.push(visa.student.advisor.userId);

    const name = `${visa.student.firstNameEn ?? ''} ${visa.student.lastNameEn ?? ''}`.trim();
    await createNotifications(userIds, {
      type: 'VISA_ALERT',
      title: `Visa Expiring in ${days} Day(s)`,
      message: `Student ${name}'s ${visa.visaType} visa expires on ${visa.expiryDate.toDateString()}.`,
      link: `/staff/students/${visa.student.id}`,
    });

    // ส่ง email แจ้งเตือนนักศึกษา
    const studentEmail = visa.student.email || visa.student.user.email;
    if (studentEmail) {
      await sendEmail(
        studentEmail,
        `[IST] Visa Expiring in ${days} Day(s) — Action Required`,
        `<p>Dear ${name},</p>
         <p>Your <strong>${visa.visaType}</strong> visa will expire on <strong>${visa.expiryDate.toDateString()}</strong> (${days} day(s) remaining).</p>
         <p>Please contact your advisor or the international student office to start the visa renewal process.</p>`
      );
    }

    // ส่ง email แจ้ง advisor ด้วย
    const advisorEmail = visa.student.advisor?.user?.email;
    if (advisorEmail) {
      await sendEmail(
        advisorEmail,
        `[IST] Student Visa Alert — ${name} (${days} days)`,
        `<p>Dear Advisor,</p>
         <p>Student <strong>${name}</strong>'s <strong>${visa.visaType}</strong> visa will expire on <strong>${visa.expiryDate.toDateString()}</strong> (${days} day(s) remaining).</p>
         <p>Please advise the student to initiate the renewal process promptly.</p>`
      );
    }

    // Upsert VisaRenewal record
    await prisma.visaRenewal.upsert({
      where: { studentId: visa.studentId } as { studentId: number },
      update: { daysRemaining: days, notifiedAt: today, isResolved: false },
      create: { studentId: visa.studentId, daysRemaining: days, notifiedAt: today },
    });
  }

  console.log(`[Scheduler] Visa check done. ${activeVisas.length} visa(s) checked.`);
}

async function checkPassportExpiry() {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + Math.max(...ALERT_DAYS));

  const passports = await prisma.passport.findMany({
    where: { isCurrent: true, expiryDate: { lte: maxDate } },
    include: {
      student: { select: { id: true, userId: true, firstNameEn: true, lastNameEn: true } },
    },
  });

  for (const pp of passports) {
    const days = Math.ceil((pp.expiryDate.getTime() - today.getTime()) / 86_400_000);
    if (!ALERT_DAYS.includes(days)) continue;

    const name = `${pp.student.firstNameEn ?? ''} ${pp.student.lastNameEn ?? ''}`.trim();
    await createNotifications([pp.student.userId], {
      type: 'VISA_ALERT',
      title: `Passport Expiring in ${days} Day(s)`,
      message: `Your passport (${pp.passportNumber}) expires on ${pp.expiryDate.toDateString()}.`,
      link: `/student/profile`,
    });
  }

  console.log(`[Scheduler] Passport check done. ${passports.length} passport(s) checked.`);
}

async function checkHealthInsuranceExpiry() {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + Math.max(...ALERT_DAYS));

  const insurances = await prisma.healthInsurance.findMany({
    where: { isCurrent: true, expiryDate: { lte: maxDate } },
    include: { student: { select: { userId: true } } },
  });

  for (const ins of insurances) {
    const days = Math.ceil((ins.expiryDate.getTime() - today.getTime()) / 86_400_000);
    if (!ALERT_DAYS.includes(days)) continue;

    await createNotifications([ins.student.userId], {
      type: 'VISA_ALERT',
      title: `Health Insurance Expiring in ${days} Day(s)`,
      message: `Your health insurance (${ins.provider}) expires on ${ins.expiryDate.toDateString()}. Please renew it.`,
      link: `/student/profile`,
    });
  }

  console.log(`[Scheduler] Health insurance check done. ${insurances.length} insurance(s) checked.`);
}

async function checkDependentExpiry() {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + Math.max(...ALERT_DAYS));

  const dependents = await prisma.dependent.findMany({
    where: {
      OR: [
        { passportExpiry: { lte: maxDate, not: null } },
        { visaExpiry: { lte: maxDate, not: null } },
      ],
    },
    include: { student: { select: { userId: true } } },
  });

  for (const dep of dependents) {
    for (const { expiry, label } of [
      { expiry: dep.passportExpiry, label: 'passport' },
      { expiry: dep.visaExpiry, label: 'visa' },
    ]) {
      if (!expiry) continue;
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
      if (!ALERT_DAYS.includes(days)) continue;

      await createNotifications([dep.student.userId], {
        type: 'VISA_ALERT',
        title: `Dependent ${label.charAt(0).toUpperCase() + label.slice(1)} Expiring in ${days} Day(s)`,
        message: `${dep.firstName}'s ${label} expires on ${expiry.toDateString()}.`,
        link: `/student/profile`,
      });
    }
  }

  console.log(`[Scheduler] Dependent check done. ${dependents.length} dependent(s) checked.`);
}

export function startScheduler() {
  // Run every day at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily expiry checks...');
    await Promise.allSettled([
      checkVisaExpiry(),
      checkPassportExpiry(),
      checkHealthInsuranceExpiry(),
      checkDependentExpiry(),
    ]);
  });

  console.log('✅ Scheduler started — daily expiry checks at 08:00');
}
