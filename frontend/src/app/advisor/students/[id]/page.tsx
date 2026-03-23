'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiMapPinLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { BsPeopleFill } from "react-icons/bs";

type VisaStatus = 'Active' | 'Expired' | 'Expiring Soon';
type Tab = 'Personal' | 'Passport & Visa' | 'Health Insurance' | 'Academic Record' | 'Dependents';

interface StudentDetail {
  id: string;
  studentId: string;
  name: string;
  nationality: string;
  faculty: string;
  degree: string;
  email: string;
  phone: string;
  address: string;
  visaStatus: VisaStatus;
  visaExpiry: string;
  ecName: string;
  ecEmail: string;
  ecPhone: string;
  ecRelationship: string;
  personal: { label: string; value: string }[];
  passport: { label: string; value: string }[];
  visa: { label: string; value: string }[];
  insurance: { label: string; value: string }[];
  dependents: { name: string; relation: string; nationality: string; passportNo: string }[];
  activities: { date: string; description: string; status: string; statusColor: 'green' | 'yellow' | 'red' | 'blue' }[];
  missingCount: number;
  passportImageUrl: string;
  visaImageUrls: [string, string, string];
  insuranceImageUrl: string;
  academicRecordImageUrl: string;
}

const mockStudents: Record<string, StudentDetail> = {
  '1': {
    id: '1', studentId: '653040001-7', name: 'Zhang Wei', nationality: 'Chinese',
    faculty: 'College of Engineering', degree: "Master's Degree",
    email: 'zhang.wei@kkumail.com', phone: '+66 81 234 5678', address: '123 KKU Dormitory, Khon Kaen',
    visaStatus: 'Active', visaExpiry: '31/12/2025',
    ecName: 'Zhang Ming', ecEmail: 'zhang.ming@gmail.com', ecPhone: '+86 10 1234 5678', ecRelationship: 'Parent',
    personal: [
      { label: 'Prefix',          value: 'Mr.' },
      { label: 'First Name',      value: 'Zhang' },
      { label: 'Middle Name',     value: '—' },
      { label: 'Last Name',       value: 'Wei' },
      { label: 'Date of Birth',   value: '15/03/1999' },
      { label: 'Gender',          value: 'Male' },
      { label: 'Religion',        value: 'Buddhism' },
      { label: 'Home Country',    value: 'China' },
      { label: 'Home Address',    value: 'Beijing, China' },
      { label: 'Program',         value: 'Computer Engineering' },
      { label: 'Faculty',         value: 'College of Computing' },
    ],
    passport: [
      { label: 'Prefix',          value: 'Mr.' },
      { label: 'Surname',         value: 'Wei' },
      { label: 'Middle Name',     value: '—' },
      { label: 'Given Name',      value: 'Zhang' },
      { label: 'Birth Date',      value: '15/03/1999' },
      { label: 'Nationality',     value: 'Chinese' },
      { label: 'Nationality ID',  value: '110000199903150001' },
      { label: 'Place of Birth',  value: 'Beijing, China' },
      { label: 'Date of Issue',   value: '01/01/2020' },
      { label: 'Expiry Date',     value: '01/01/2030' },
    ],
    visa: [
      { label: 'Passport',        value: 'E12345678' },
      { label: 'Place of Issue',  value: 'Beijing' },
      { label: 'Valid From',      value: '01/01/2024' },
      { label: 'Valid Until',     value: '31/12/2025' },
      { label: 'Type of Visa',    value: 'ED' },
      { label: 'Number of Entries', value: 'Multiple' },
    ],
    insurance: [
      { label: 'Provider',        value: 'Krungthai-AXA' },
      { label: 'Coverage',        value: '40,000 THB' },
      { label: 'Valid from',        value: '31/05/2025' },
      { label: 'Valid Until',     value: '31/05/2025' },
    ],
    dependents: [],
    activities: [
      { date: '01/01/2025', description: 'Leave Request Form',  status: 'Staff Of College Approved', statusColor: 'yellow' },
      { date: '01/01/2025', description: 'Visa Added',          status: 'Updated',                   statusColor: 'green'  },
    ],
    missingCount: 2,
    passportImageUrl: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
    visaImageUrls: ['https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoiea5WJFKQ_q-vVykcmQbLSlEKWMXs-3vIg&s', 'https://preview.redd.it/my-slightly-terrifying-thai-entry-stamp-and-extension-stamp-v0-55v5a48pef1e1.jpeg?width=1080&crop=smart&auto=webp&s=80dc2da7eb9416bad4032d9b01586d06919f1a76', 'https://loyaltylobby.com/wp-content/uploads/2022/08/Thai-Entry-Stamps.jpeg'],
    insuranceImageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png',
    academicRecordImageUrl: 'https://online.fliphtml5.com/fkehc/cwmu/files/shot.jpg',
  },
};

const TABS: Tab[] = ['Personal', 'Passport & Visa', 'Health Insurance', 'Academic Record', 'Dependents'];


const visaStatusConfig: Record<VisaStatus, string> = {
  'Active':        'bg-green-100 text-green-700',
  'Expiring Soon': 'bg-yellow-100 text-yellow-700',
  'Expired':       'bg-red-100 text-red-600',
};

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary/50">{label}</span>
          <span className="text-sm font-semibold text-primary">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Personal');

  const s = mockStudents[id] ?? mockStudents['1'];
  const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase();

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">Student Profile</h1>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Profile Card */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-4">
          {/* Avatar */}
          <div className="bg-secondary rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
            <div className="text-center">
              <p className="font-semibold text-primary">{s.name}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{s.studentId}</p>
              <p className="text-xs text-gray-500 mt-1">{s.nationality}</p>
            </div>
            <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', visaStatusConfig[s.visaStatus])}>
              Visa: {s.visaStatus}
            </span>
          </div>

          {/* Contact */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Contact</p>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMailLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span className="break-all">{s.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <RiPhoneLine size={15} className="shrink-0 text-primary/50" />
              <span>{s.phone}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMapPinLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span>{s.address}</span>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Emergency Contact</p>
            <div className="flex items-start mt-3 text-sm text-primary">
              <span className="text-sm font-semibold text-primary">{s.ecName}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMailLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span className="text-sm text-primary break-all">{s.ecEmail}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <RiPhoneLine size={15} className="shrink-0 text-primary/50" />
              <span className="text-sm text-primary">{s.ecPhone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <BsPeopleFill size={15} className="shrink-0 text-primary/50" />
              <span className="text-sm text-primary">{s.ecRelationship}</span>
            </div>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Tab Bar */}
          <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-3 py-2 rounded-t-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-primary'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className={clsx('rounded-2xl', activeTab !== 'Passport & Visa' && activeTab !== 'Health Insurance' && activeTab !== 'Academic Record' && 'bg-secondary p-6')}>
            {activeTab === 'Personal'      && <InfoGrid items={s.personal} />}
            {activeTab === 'Passport & Visa' && (
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Passport Column */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-sm font-semibold text-primary">Passport Information</p>
                    <InfoGrid items={s.passport} />
                  </div>
                  <img
                    src={s.passportImageUrl}
                    alt="Passport"
                    className="w-full md:w-3/5 h-full object-cover rounded-xl bg-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                {/* Visa Column */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-sm font-semibold text-primary">Visa Information</p>
                    <InfoGrid items={s.visa} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {s.visaImageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Visa stamp ${i + 1}`}
                        className={clsx('h-48 sm:h-36 w-full object-contain rounded-xl bg-gray-200')}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'Health Insurance'  && (
              <div className="flex flex-col gap-3">
                <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                  <InfoGrid items={s.insurance} />
                </div>
                <img
                  src={s.insuranceImageUrl}
                  alt="Insurance"
                  className="w-full md:w-1/2 object-cover rounded-xl bg-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            {activeTab === 'Academic Record'  && (
              <div className="flex flex-col gap-3 h-full">
                <img
                  src={s.academicRecordImageUrl}
                  alt="Academic Record"
                  className="w-full h-full md:w-fit object-cover rounded-xl bg-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            {activeTab === 'Dependents' && (
              s.dependents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No dependents recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Relation</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Nationality</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Passport No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.dependents.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 text-primary font-medium">{d.name}</td>
                        <td className="py-2.5 px-3 text-gray-500">{d.relation}</td>
                        <td className="py-2.5 px-3 text-gray-500">{d.nationality}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-500 text-xs">{d.passportNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          
        </div>
      </div>

    </div>
  );
}
