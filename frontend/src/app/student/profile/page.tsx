'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { getProgress, defaultProgress, UserProfileProgress } from '@/lib/progressStore';

const mockStudent = {
    photo: 'https://api.computing.kku.ac.th//storage/images/1661876218-pusadeeseresangtakul1_1.png',
    studentId: '033380305-4',
    identificationNo: '1123100110110',
    name: 'Miss Pichamon Phongphrathapet',
    faculty: 'FACULTY OF COLLEGE OF COMPUTING',
    degree: 'DOCTORAL DEGREE',
    issueDate: '13 May 2023',
    expiryDate: '31 May 2027',
};

const todoItems: { label: string; href: string; progressKey: keyof UserProfileProgress }[] = [
    { label: 'Update my personal information', href: '/student/profile/updatepersonal', progressKey: 'personalInfoCompleted' },
    { label: 'Add my Passport',                href: '/student/profile/addpassport',    progressKey: 'passportCompleted' },
    { label: 'Add my Visa',                    href: '/student/profile/addvisa',        progressKey: 'visaCompleted' },
    { label: 'Add my Health Insurance',        href: '/student/profile/addhealth-insurance', progressKey: 'healthInsuranceCompleted' },
    { label: 'Add my Academic Document',       href: '/student/profile/addacademic',   progressKey: 'academicDocumentCompleted' },
    { label: 'Add my Dependent',               href: '/student/profile/adddependent',  progressKey: 'dependentCompleted' },
];

function StudentCard() {
    return (
        <div className="bg-white rounded-2xl shadow-sm  w-full mx-auto border border-gray-100 flex md:h-70 2xl:h-80">
            <div className='w-1/3 p-4 flex flex-col items-center justify-between'>
                <img
                    src={mockStudent.photo}
                    alt="Student"
                    className="h-[85%] w-full object-cover rounded-xl flex-shrink-0 border "
                />
                <div className="flex flex-col items-center justify-center text-xs 2xl:text-sm text-black">
                    <span>Issue {mockStudent.issueDate}</span>
                    <span>expiry {mockStudent.expiryDate}</span>
                </div>
            </div>
            <div className='p-4 flex-1 flex flex-col items-start justify-between'>
                <div>
                    <div className="flex items-center gap-3  py-2">
                        <div className="w-10 h-50 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src="/kkulogo.png" alt="KKU" className="w-8 h-14 2xl:w-10 2xl:h-16 object-contain" />
                        </div>
                        <div className="flex flex-col leading-tight gap-3">
                            <span className="text-[#A73B24] text-sm 2xl:text-md font-normal">มหาวิทยาลัยขอนแก่น</span>
                            <span className="text-[#A73B24] text-sm 2xl:text-md font-normal tracking-wide">KHON KAEN UNIVERSITY</span>
                        </div>
                    </div>
                    {/* Info */}
                    <div className="flex flex-col gap-0.5 text-sm 2xl:text-md text-black justify-center">
                        <p><span className="font-semibold">Student ID No. :</span> {mockStudent.studentId}</p>
                        <p><span className="font-semibold">Identification No. :</span> {mockStudent.identificationNo}</p>
                        <p className="mt-1 font-normal  ">{mockStudent.name}</p>
                        <p className="font-normal ">{mockStudent.faculty}</p>
                        <p className="font-normal ">{mockStudent.degree}</p>

                    </div>
                </div>
                {/* Barcode + QR */}
                <div className="w-full flex items-end justify-between pr-3">
                    <div className="flex-1 overflow-hidden">
                        <Barcode
                            value={mockStudent.identificationNo}
                            width={1.2}
                            height={32}
                            fontSize={9}
                            margin={0}
                        />
                    </div>
                    <div className='flex flex-col items-center'>
                        <QRCode value={mockStudent.studentId} size={52} />
                        <label htmlFor="" className='text-[8px] mt-0'>{mockStudent.studentId}</label>
                    </div>
                </div>
            </div>


        </div>
    );
}

export default function StudentProfilePage() {
    const router = useRouter();
    const [progress, setProgress] = useState<UserProfileProgress>(defaultProgress);

    useEffect(() => {
        setProgress(getProgress());
    }, []);

    return (
        <div className="grid md:grid-cols-5 gap-6 flex-1">
            {/* Left: Student Card */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
                <StudentCard />
                <div className="bg-white rounded-2xl shadow-sm flex-1" />
            </div>

            {/* Right: To-do List */}
            <div className="bg-white rounded-2xl shadow-sm px-8 pt-6 py-8 flex flex-col gap-6 col-span-3">
                <h2 className="text-3xl font-semibold text-primary mb-10">To-do list</h2>
                <div className="flex flex-col flex-1">
                    {todoItems.map(({ label, href, progressKey }, i) => {
                        const done = progress[progressKey];
                        const isLast = i === todoItems.length - 1;
                        return (
                            <div key={label} className={`flex flex-col ${!isLast ? 'flex-1' : ''}`}>
                                {/* Circle + content row */}
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
                                {/* Connecting line */}
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
            </div>
        </div>
    );
}
