'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { getProgress, defaultProgress, UserProfileProgress } from '@/lib/progressStore';
import { RiFileList3Line, RiHeartAdd2Line, RiGraduationCapLine, RiGroupLine } from 'react-icons/ri';
import { BsExclamation } from 'react-icons/bs';
import { LuUserRound } from 'react-icons/lu';
import { FaPassport } from 'react-icons/fa6';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { LuSchool } from 'react-icons/lu';
import { studentMeApi, studentApi, type ApiPassport, type ApiVisa, type ApiHealthInsurance } from '@/lib/api';
import toast from 'react-hot-toast';

const profileCards = [
    { label: 'Personal Information', href: '/student/profile/personal', Icon: LuUserRound },
    { label: 'Passport', href: '/student/profile/passport', Icon: FaPassport },
    { label: 'Visa', href: '/student/profile/visa', Icon: RiFileList3Line },
    { label: 'Health Insurance', href: '/student/profile/health-insurance', Icon: RiHeartAdd2Line },
    { label: 'Academic Record', href: '/student/profile/academic', Icon: RiGraduationCapLine },
    { label: 'Dependent', href: '/student/profile/dependent', Icon: RiGroupLine },
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
        <div className="bg-white rounded-2xl shadow-sm w-full mx-auto border border-gray-100 flex md:h-70 2xl:h-80">
            <div className='w-1/3 p-4 flex flex-col items-center justify-between'>
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
            <div className='p-4 flex-1 flex flex-col items-start justify-between'>
                <div>
                    <div className="flex items-center gap-3 py-2">
                        <div className="w-10 h-50 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/kkulogo.png" alt="KKU" className="w-8 h-14 2xl:w-10 2xl:h-16 object-contain" />
                        </div>
                        <div className="flex flex-col leading-tight gap-3">
                            <span className="text-[#A73B24] text-sm 2xl:text-base font-normal">มหาวิทยาลัยขอนแก่น</span>
                            <span className="text-[#A73B24] text-sm 2xl:text-base font-normal tracking-wide">KHON KAEN UNIVERSITY</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm 2xl:text-base text-black justify-center">
                        <p><span className="font-semibold">Student ID No. :</span> {studentId || '—'}</p>
                        <p><span className="font-semibold">Identification No. :</span> {idNo || '—'}</p>
                        <p className="mt-1 font-normal">{name || '—'}</p>
                        <p className="font-normal">{faculty || '—'}</p>
                        <p className="font-normal">{degree || '—'}</p>
                    </div>
                </div>
                <div className="w-full flex items-end justify-between pr-3">
                    <div className="flex-1 overflow-hidden">
                        <Barcode
                            value={barcodeVal}
                            width={1.2}
                            height={32}
                            fontSize={9}
                            margin={0}
                        />
                    </div>
                    <div className='flex flex-col items-center'>
                        <QRCode value={barcodeVal} size={52} />
                        <label className='text-[8px] mt-0'>{studentId}</label>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentProfilePage() {
    const router = useRouter();
    const [progress, setProgress] = useState<UserProfileProgress>(defaultProgress);
    const [regStep, setRegStep] = useState<number>(2); // default 2 = full access
    const [regStatus, setRegStatus] = useState<string>('ACTIVE');
    const [submittingPhase2, setSubmittingPhase2] = useState(false);
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
        const local = getProgress();
        setProgress(local);

        studentMeApi.get().then(res => {
            const s = res.data.data;
            const fullName = [s.titleEn, s.firstNameEn, s.middleNameEn, s.lastNameEn].filter(Boolean).join(' ');
            const passport = (s.passports as ApiPassport[])?.[0];
            const adv = s.advisor;
            const advisorName = adv
                ? [adv.titleEn, adv.firstNameEn, adv.lastNameEn].filter(Boolean).join(' ')
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

            // Derive ALL progress from real API data (not localStorage)
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
                dependentCompleted:        deps.length > 0 || local.dependentCompleted,
            });
        }).catch(console.error);
    }, []);

    const allDone = todoItems.every(({ progressKey }) => progress[progressKey]);
    // Show to-do list when Phase 1 is approved (step 1, ACTIVE) — student must complete Phase 2
    const showTodo = !allDone || (regStep === 1 && regStatus === 'ACTIVE');

    async function handleSubmitPhase2() {
        setSubmittingPhase2(true);
        try {
            await studentApi.submitPhase2();
            toast.success('Phase 2 submitted! Waiting for staff to complete your registration.');
            router.push('/student/pending');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'Failed to submit Phase 2');
        } finally {
            setSubmittingPhase2(false);
        }
    }

    return (
        <div className="grid md:grid-cols-5 gap-6 flex-1">
            {/* Left: Student Card */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
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
                <div className="flex flex-col gap-4 flex-1">
                    {[
                        {
                            Icon: LuSchool,
                            title: 'Staff Of College Contact',
                            name: studentData.staffName,
                            phone: studentData.staffPhone,
                            email: studentData.staffEmail,
                        },
                        {
                            Icon: FaChalkboardTeacher,
                            title: 'Advisor Contact',
                            name: studentData.advisorName,
                            phone: studentData.advisorPhone,
                            email: studentData.advisorEmail,
                        },
                    ].map(({ Icon, title, name, phone, email }) => (
                        <div key={title} className="bg-white rounded-2xl flex flex-col flex-1">
                            <div className="flex items-center gap-3 bg-[#BDE6FF] px-4 py-2 2xl:py-4 rounded-t-2xl">
                                <Icon className="text-primary text-2xl" />
                                <span className="text-primary font-normal text-xl">{title}</span>
                            </div>
                            <div className='flex flex-1 items-center px-4 py-2'>
                                <div className="text-sm 2xl:text-base text-primary flex flex-col gap-2 mr-5">
                                    <p><span className="font-medium">Name :</span></p>
                                    <p><span className="font-medium">Phone No. :</span></p>
                                    <p><span className="font-medium">Email :</span></p>
                                </div>
                                <div className="text-sm 2xl:text-base text-primary flex flex-col gap-2">
                                    <p>{name}</p>
                                    <p>{phone}</p>
                                    <p>{email}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: To-do List or Profile Cards */}
            <div className="bg-white rounded-2xl shadow-sm px-8 pt-6 py-8 flex flex-col gap-6 col-span-full md:col-span-3">
                {!showTodo ? (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold text-primary">Welcome <span className="font-semibold text-black ml-2">{studentData.firstName || 'Student'}</span></h2>
                            <div className='flex py-10 items-start justify-center'>
                                <BsExclamation className='text-[#EE4F4F] text-5xl' />
                                <p className="text-xl 2xl:text-2xl text-primary mt-2 text-center">
                                    Please keep your information updated in Interservice<br />at interservice.kku.ac.th
                                </p>
                                <BsExclamation className='text-[#EE4F4F] text-5xl' />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:gap-6 flex-1">
                            {profileCards.map(({ label, href, Icon }) => (
                                <button
                                    key={label}
                                    onClick={() => router.push(href)}
                                    className="flex flex-col items-center gap-3 border border-gray-200 rounded-2xl p-4 hover:border-primary/50 hover:shadow-sm transition"
                                >
                                    <div className='flex-1 flex items-center justify-center'>
                                        <Icon className="text-primary text-5xl 2xl:text-7xl" />
                                    </div>
                                    <div className='h-[30px]'>
                                        <span className="text-sm 2xl:text-base text-primary font-medium text-center">{label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-semibold text-primary">To-do list</h2>
                            {allDone && regStep === 1 && regStatus === 'ACTIVE' && (
                                <button
                                    onClick={handleSubmitPhase2}
                                    disabled={submittingPhase2}
                                    className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
                                >
                                    {submittingPhase2 ? 'Submitting…' : 'Submit Phase 2'}
                                </button>
                            )}
                        </div>
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
