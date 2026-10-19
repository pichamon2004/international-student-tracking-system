'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { defaultProgress, UserProfileProgress } from '@/lib/progressStore';
import { RiMailLine, RiPhoneLine } from 'react-icons/ri';
import { BsExclamation } from 'react-icons/bs';
import {
    LuTriangleAlert, LuExternalLink, LuArrowRight,
} from 'react-icons/lu';
import { PersonIcon, PassportIcon, DocumentIcon, HealthIcon, AcademicCapIcon, PeopleIcon } from '@/components/icons/ProfileIcons';
import type { IconType } from 'react-icons';
import { studentMeApi, studentApi, type ApiPassport, type ApiVisa, type ApiHealthInsurance } from '@/lib/api';
import toast from 'react-hot-toast';
import { advisorFullName } from '@/lib/names';

const INTERSERVICE_URL = 'https://interservice.kku.ac.th';

type ProfileCard = { label: string; description: string; href: string; Icon: IconType };

// classic: the earlier look (big centered icon + label)
const profileSections: { title: string; classic?: boolean; cards: ProfileCard[] }[] = [
    {
        title: 'Identity & travel documents',
        classic: true,
        cards: [
            { label: 'Personal Information', description: 'Name, contact details and address', href: '/student/profile/personal', Icon: PersonIcon },
            { label: 'Passport', description: 'Passport number, issue and expiry dates', href: '/student/profile/passport', Icon: PassportIcon },
            { label: 'Visa', description: 'Visa type, validity and extensions', href: '/student/profile/visa', Icon: DocumentIcon },
        ],
    },
    {
        title: 'Study & family',
        classic: true,
        cards: [
            { label: 'Health Insurance', description: 'Policy, provider and coverage period', href: '/student/profile/health-insurance', Icon: HealthIcon },
            { label: 'Academic Record', description: 'Program, enrollment status and grades', href: '/student/profile/academic', Icon: AcademicCapIcon },
            { label: 'Dependent', description: 'Family members staying with you', href: '/student/profile/dependent', Icon: PeopleIcon },
        ],
    },
];

const todoItems: { label: string; href: string; progressKey: keyof UserProfileProgress }[] = [
    { label: 'Update my personal information', href: '/student/profile/updatepersonal', progressKey: 'personalInfoCompleted' },
    { label: 'Add my Passport', href: '/student/profile/updatepassport', progressKey: 'passportCompleted' },
    { label: 'Add my Visa', href: '/student/profile/updatevisa', progressKey: 'visaCompleted' },
    { label: 'Add my Health Insurance', href: '/student/profile/updatehealth-insurance', progressKey: 'healthInsuranceCompleted' },
    { label: 'Add my Academic Document', href: '/student/profile/updateacademic', progressKey: 'academicDocumentCompleted' },
    { label: 'Add my Dependent', href: '/student/profile/dependent', progressKey: 'dependentCompleted' },
];

const LEVEL_LABEL: Record<string, string> = {
    PHD: 'DOCTORAL DEGREE',
    MASTER: "MASTER'S DEGREE",
    BACHELOR: "BACHELOR'S DEGREE",
};

function fmtDate(val: string | null | undefined) {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface StudentCardProps {
    studentId: string;
    idNo: string;
    name: string;
    faculty: string;
    degree: string;
    enrollmentDate: string | null;
    expectedGraduation: string | null;
    photoUrl?: string | null;
}

function StudentCard({ studentId, idNo, name, faculty, degree, enrollmentDate, expectedGraduation, photoUrl }: StudentCardProps) {
    const barcodeVal = idNo || studentId || 'N/A';
    return (
        <div className="bg-white rounded-2xl shadow-sm w-full mx-auto border border-gray-100 flex lg:h-70 2xl:h-80">
            <div className='w-1/3 p-4 md:p-3 lg:p-4 flex flex-col items-center justify-between'>
                <div className="h-[85%] w-full rounded-xl bg-primary/10 border flex items-center justify-center text-primary text-4xl font-bold overflow-hidden">
                    {photoUrl ? (
                        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        (name.split(' ').find(w => w.length > 2) ?? '?')[0]?.toUpperCase() ?? '?'
                    )}
                </div>
                <div className="flex flex-col items-center justify-center text-xs 2xl:text-sm text-black">
                    <span>Issue {fmtDate(enrollmentDate)}</span>
                    <span>expiry {fmtDate(expectedGraduation)}</span>
                </div>
            </div>
            <div className='p-4 md:p-3 lg:p-4 flex-1 flex flex-col items-start justify-between'>
                <div>
                    <div className="flex items-center gap-3 py-2 md:py-0.5 lg:py-2">
                        <div className="w-10 h-50 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/kkulogo.png" alt="KKU" className="w-8 h-14 md:w-6 md:h-10 lg:w-8 lg:h-14 2xl:w-10 2xl:h-16 object-contain" />
                        </div>
                        <div className="flex flex-col leading-tight gap-3 md:gap-1 lg:gap-3">
                            <span className="text-[#A73B24] text-sm md:text-xs lg:text-sm 2xl:text-base font-normal">มหาวิทยาลัยขอนแก่น</span>
                            <span className="text-[#A73B24] text-sm md:text-xs lg:text-sm 2xl:text-base font-normal tracking-wide">KHON KAEN UNIVERSITY</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm md:text-xs lg:text-sm 2xl:text-base text-black justify-center">
                        <p><span className="font-semibold">Student ID No. :</span> {studentId || '—'}</p>
                        <p><span className="font-semibold">Identification No. :</span> {idNo || '—'}</p>
                        <p className="mt-1 md:mt-0.5 lg:mt-1 font-normal">{name || '—'}</p>
                        <p className="font-normal">{faculty || '—'}</p>
                        <p className="font-normal">{degree || '—'}</p>
                    </div>
                </div>
                <div className="w-full flex items-end justify-between pr-3">
                    <div className="flex-1 overflow-hidden md:[&_svg]:h-9 lg:[&_svg]:h-auto">
                        <Barcode
                            value={barcodeVal}
                            width={1.2}
                            height={32}
                            fontSize={9}
                            margin={0}
                        />
                    </div>
                    <div className='flex flex-col items-center md:[&_svg]:w-10 md:[&_svg]:h-10 lg:[&_svg]:w-auto lg:[&_svg]:h-auto'>
                        <QRCode value={barcodeVal} size={52} />
                        <label className='text-[8px] mt-0'>{studentId}</label>
                    </div>
                </div>
            </div>
        </div>
    );
}

// '—' is the placeholder used while data loads / when a field is missing
const hasValue = (v: string) => !!v && v !== '—';

function initials(name: string): string {
    const words = name.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Assoc\. Prof|Asst\. Prof)\.?\s+/i, '').split(/\s+/).filter(Boolean);
    return (words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '');
}

function ContactRow({ role, name, phone, email }: { role: string; name: string; phone: string; email: string }) {
    const known = hasValue(name);
    return (
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-gray-100 p-3 md:p-2.5 lg:p-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#DEEBFF] text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {known ? initials(name).toUpperCase() : '?'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{role}</span>
                <span className="text-sm font-semibold text-gray-800 truncate" title={known ? name : undefined}>
                    {known ? name : 'Not assigned yet'}
                </span>
                {known && (
                    <>
                        <span className="text-xs text-gray-500 truncate" title={hasValue(email) ? email : undefined}>
                            {hasValue(email) ? email : 'No email listed'}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{hasValue(phone) ? phone : 'No phone listed'}</span>
                    </>
                )}
            </div>
            <div className="flex flex-col md:flex-row lg:flex-col gap-1.5 shrink-0">
                {hasValue(email) && (
                    <a href={`mailto:${email}`} title={`Email ${name}`}
                        className="w-9 h-9 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition">
                        <RiMailLine size={16} />
                    </a>
                )}
                {hasValue(phone) && (
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} title={`Call ${name}`}
                        className="w-9 h-9 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-lg border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/5 transition">
                        <RiPhoneLine size={16} />
                    </a>
                )}
            </div>
        </div>
    );
}

export default function StudentProfilePage() {
    const router = useRouter();
    const [progress, setProgress] = useState<UserProfileProgress>(defaultProgress);
    const [regStep, setRegStep] = useState<number>(2); // default 2 = full access
    const [regStatus, setRegStatus] = useState<string>('ACTIVE');
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [studentData, setStudentData] = useState<{
        studentId: string;
        passportNumber: string;
        name: string;
        faculty: string;
        degree: string;
        enrollmentDate: string | null;
        expectedGraduation: string | null;
        firstName: string;
        advisorName: string;
        advisorPhone: string;
        advisorEmail: string;
        staffName: string;
        staffPhone: string;
        staffEmail: string;
        photoUrl: string | null;
    }>({
        studentId: '',
        passportNumber: '',
        name: '',
        faculty: '',
        degree: '',
        enrollmentDate: null,
        expectedGraduation: null,
        firstName: '',
        advisorName: '—',
        advisorPhone: '—',
        advisorEmail: '—',
        staffName: '—',
        staffPhone: '—',
        staffEmail: '—',
        photoUrl: null,
    });

    useEffect(() => {
        studentMeApi.get().then(res => {
            const s = res.data.data;
            const fullName = [s.titleEn, s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
            const passport = (s.passports as ApiPassport[])?.find(p => p.isCurrent);
            const adv = s.advisor;
            const advisorName = adv
                ? advisorFullName(adv)
                : '—';

            setStudentData({
                studentId: s.studentId ?? '',
                passportNumber: passport?.passportNumber ?? '',
                name: fullName,
                faculty: s.faculty ?? '',
                degree: LEVEL_LABEL[s.level ?? ''] ?? s.level ?? '',
                enrollmentDate: s.enrollmentDate ?? null,
                expectedGraduation: s.expectedGraduation ?? null,
                firstName: s.firstNameEn ?? '',
                advisorName,
                advisorPhone: adv?.phone ?? '—',
                advisorEmail: adv?.email ?? '—',
                staffName:  s.staffContact?.name  ?? '—',
                staffPhone: s.staffContact?.phone ?? '—',
                staffEmail: s.staffContact?.email ?? '—',
                photoUrl: s.photoUrl ?? null,
            });

            setRegStep(s.registrationStep ?? 2);
            setRegStatus(s.registrationStatus ?? 'ACTIVE');
            setRejectionReason(s.rejectionReason ?? null);

            // Derive all progress from real API data only
            const visas      = s.visas             as ApiVisa[];
            const insurances = s.healthInsurances   as ApiHealthInsurance[];
            const passports  = s.passports          as ApiPassport[];
            const academics  = (s as unknown as { academicDocuments: { id: number }[] }).academicDocuments ?? [];
            const deps       = (s as unknown as { dependents: { id: number }[] }).dependents ?? [];
            setProgress({
                personalInfoCompleted:    !!(s.firstNameEn && s.phone && s.nationality),
                passportCompleted:        passports.length > 0,
                visaCompleted:            visas.length > 0,
                healthInsuranceCompleted: insurances.length > 0,
                academicDocumentCompleted: academics.length > 0,
                dependentCompleted:        deps.length > 0,
            });
        }).catch(console.error);
    }, []);

    const allDone = todoItems.every(({ progressKey }) => progress[progressKey]);
    const wasRejected = regStatus === 'REJECTED';
    // Show to-do list when student account is new (step 1, ACTIVE) — must complete checklist first.
    // Also show it after a staff rejection so the student can fix info and resubmit.
    const showTodo = !allDone || wasRejected || (regStep === 1 && regStatus === 'ACTIVE');
    const canSubmit = allDone && (wasRejected || (regStep === 1 && regStatus === 'ACTIVE'));

    async function handleSubmitRegistration() {
        setSubmitting(true);
        try {
            await studentApi.submitPhase2();
            toast.success('Registration submitted! Waiting for staff to complete your registration.');
            router.push('/student/pending');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'Failed to submit registration');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        // Phones: everything stacked. Tablets (md): card + contacts side by side, the
        // welcome panel full width below. Desktop (lg): card + contacts | welcome panel.
        <div className="grid lg:grid-cols-5 md:grid-rows-[auto_1fr] lg:grid-rows-none gap-6 flex-1">
            {/* Left: Student Card */}
            <div className="col-span-1 lg:col-span-2 flex flex-col md:grid md:grid-cols-2 lg:flex gap-6">
                <StudentCard
                    studentId={studentData.studentId}
                    idNo={studentData.passportNumber}
                    name={studentData.name}
                    faculty={studentData.faculty}
                    degree={studentData.degree}
                    enrollmentDate={studentData.enrollmentDate}
                    expectedGraduation={studentData.expectedGraduation}
                    photoUrl={studentData.photoUrl}
                />
                {/* Contacts */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm p-5 md:p-3 lg:p-5 flex flex-col gap-4 md:gap-2 lg:gap-4">
                    <div className="flex items-center gap-2.5">
                        <span className="w-1 h-5 rounded-full bg-primary" />
                        <h2 className="text-lg md:text-base lg:text-lg font-semibold text-gray-800">Your contacts</h2>
                    </div>
                    {[
                        { role: 'College staff', name: studentData.staffName,   phone: studentData.staffPhone,   email: studentData.staffEmail },
                        { role: 'Advisor',       name: studentData.advisorName, phone: studentData.advisorPhone, email: studentData.advisorEmail },
                    ].map(c => <ContactRow key={c.role} {...c} />)}
                </div>
            </div>

            {/* Right: To-do List or Profile Cards */}
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 col-span-full lg:col-span-3">
                {!showTodo ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Welcome back, <span className="text-primary">{studentData.firstName || 'Student'}</span>
                        </h2>

                        {/* Interservice reminder */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                <LuTriangleAlert size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-900">Keep your information up to date in Interservice</p>
                                <p className="text-xs text-amber-900/80 mt-0.5">Make sure your details at interservice.kku.ac.th match your current documents.</p>
                            </div>
                            <a
                                href={INTERSERVICE_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition shrink-0"
                            >
                                Open Interservice <LuExternalLink size={16} />
                            </a>
                        </div>

                        {/* Sections stretch to fill the remaining height of the panel */}
                        <div className="flex-1 flex flex-col gap-5 min-h-0">
                        {profileSections.map(section => (
                            <section key={section.title} className="flex-1 flex flex-col gap-3">
                                <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {section.cards.map(({ label, description, href, Icon }) => section.classic ? (
                                        <button
                                            key={label}
                                            onClick={() => router.push(href)}
                                            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-primary/50 hover:shadow transition"
                                        >
                                            <Icon className="text-primary text-5xl" />
                                            <span className="text-base text-primary font-medium text-center">{label}</span>
                                        </button>
                                    ) : (
                                        <button
                                            key={label}
                                            onClick={() => router.push(href)}
                                            className="group flex flex-col items-start text-left gap-1.5 rounded-xl border border-primary/15 bg-[#F3F7FD] p-4 hover:border-primary/50 hover:shadow-sm transition"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-secondary text-primary flex items-center justify-center transition group-hover:bg-primary group-hover:text-white">
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-base font-semibold text-primary mt-1">{label}</span>
                                            <span className="text-xs text-gray-600 flex-1">{description}</span>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
                                                View details <LuArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-semibold text-primary">To-do list</h2>
                            {canSubmit && (
                                <button
                                    onClick={handleSubmitRegistration}
                                    disabled={submitting}
                                    className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : wasRejected ? 'Resubmit Registration' : 'Submit Registration'}
                                </button>
                            )}
                        </div>
                        {wasRejected && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <BsExclamation className="text-red-500 text-xl flex-shrink-0" />
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold text-red-600">Your registration was rejected</p>
                                    <p className="text-sm text-red-500">{rejectionReason || 'Please review your information and resubmit.'}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col flex-1">
                            {todoItems.map(({ label, href, progressKey }, i) => {
                                const done = progress[progressKey];
                                const isLast = i === todoItems.length - 1;
                                return (
                                    <div key={label} className={`flex flex-col ${!isLast ? 'flex-1' : ''}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-8 h-8 rounded-full border-2 flex-shrink-0 ${done ? 'bg-[#9DEA99] border-[#9DEA99]' : 'bg-white border-gray-300'}`} />
                                            <span className="flex-1 text-xl text-gray-700">{label}</span>
                                            <button
                                                onClick={() => router.push(href)}
                                                className={`text-sm font-medium px-5 py-1.5 rounded-lg transition ${done ? 'bg-[#9DEA99] text-white hover:bg-green-500' : 'bg-primary text-white hover:bg-primary/90'}`}
                                            >
                                                {done ? 'Done' : 'Go'}
                                            </button>
                                        </div>
                                        {!isLast && (
                                            <div className="flex gap-6 flex-1">
                                                <div className="w-8 flex flex-col items-center">
                                                    <div className={`w-[2px] flex-1 my-2 ${done ? 'bg-[#9DEA99]' : 'bg-gray-300'}`} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
