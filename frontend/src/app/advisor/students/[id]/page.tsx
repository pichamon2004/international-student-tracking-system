'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiMapPinLine } from 'react-icons/ri';
import { clsx } from 'clsx';

type VisaStatus = 'Active' | 'Expired' | 'Expiring Soon';
type Tab = 'Personal' | 'Passport' | 'Visa' | 'Insurance' | 'Dependents';

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
  personal: { label: string; value: string }[];
  passport: { label: string; value: string }[];
  visa: { label: string; value: string }[];
  insurance: { label: string; value: string }[];
  dependents: { name: string; relation: string; nationality: string; passportNo: string }[];
}

const mockStudents: Record<string, StudentDetail> = {
  '1': {
    id: '1', studentId: '653040001-7', name: 'Zhang Wei', nationality: 'Chinese',
    faculty: 'College of Engineering', degree: "Master's Degree",
    email: 'zhang.wei@kkumail.com', phone: '+66 81 234 5678', address: '123 KKU Dormitory, Khon Kaen',
    visaStatus: 'Active', visaExpiry: '31/12/2025',
    personal: [
      { label: 'Date of Birth',   value: '15/03/1999' },
      { label: 'Gender',          value: 'Male' },
      { label: 'Religion',        value: 'Buddhism' },
      { label: 'Home Country',    value: 'China' },
      { label: 'Home Address',    value: 'Beijing, China' },
      { label: 'Emergency Contact', value: 'Zhang Ming (+86 10 1234 5678)' },
    ],
    passport: [
      { label: 'Passport No.',    value: 'E12345678' },
      { label: 'Issue Date',      value: '01/01/2020' },
      { label: 'Expiry Date',     value: '01/01/2030' },
      { label: 'Issued By',       value: 'Ministry of Public Security, China' },
    ],
    visa: [
      { label: 'Visa Type',       value: 'Non-Immigrant ED' },
      { label: 'Visa No.',        value: 'TH-2024-00123' },
      { label: 'Issue Date',      value: '01/01/2024' },
      { label: 'Expiry Date',     value: '31/12/2025' },
      { label: 'Issued At',       value: 'Royal Thai Embassy, Beijing' },
      { label: '90-Day Report',   value: '01/04/2025' },
    ],
    insurance: [
      { label: 'Provider',        value: 'Krungthai-AXA' },
      { label: 'Policy No.',      value: 'KTA-2024-789012' },
      { label: 'Coverage',        value: '40,000 THB' },
      { label: 'Valid Until',     value: '31/05/2025' },
    ],
    dependents: [],
  },
  '2': {
    id: '2', studentId: '653040002-5', name: 'Joanna Sofia', nationality: 'Indonesian',
    faculty: 'College of Computing', degree: "Master's Degree",
    email: 'joanna.sofia@kkumail.com', phone: '+66 82 345 6789', address: '45 KKU Dormitory, Khon Kaen',
    visaStatus: 'Expiring Soon', visaExpiry: '15/04/2025',
    personal: [
      { label: 'Date of Birth',   value: '22/07/2000' },
      { label: 'Gender',          value: 'Female' },
      { label: 'Religion',        value: 'Islam' },
      { label: 'Home Country',    value: 'Indonesia' },
      { label: 'Home Address',    value: 'Jakarta, Indonesia' },
      { label: 'Emergency Contact', value: 'Sofia Rahman (+62 21 9876 5432)' },
    ],
    passport: [
      { label: 'Passport No.',    value: 'B98765432' },
      { label: 'Issue Date',      value: '10/06/2021' },
      { label: 'Expiry Date',     value: '10/06/2031' },
      { label: 'Issued By',       value: 'Directorate General of Immigration, Indonesia' },
    ],
    visa: [
      { label: 'Visa Type',       value: 'Non-Immigrant ED' },
      { label: 'Visa No.',        value: 'TH-2024-00456' },
      { label: 'Issue Date',      value: '15/04/2024' },
      { label: 'Expiry Date',     value: '15/04/2025' },
      { label: 'Issued At',       value: 'Royal Thai Embassy, Jakarta' },
      { label: '90-Day Report',   value: '15/04/2025' },
    ],
    insurance: [
      { label: 'Provider',        value: 'Thai Life Insurance' },
      { label: 'Policy No.',      value: 'TLI-2024-112233' },
      { label: 'Coverage',        value: '40,000 THB' },
      { label: 'Valid Until',     value: '30/04/2025' },
    ],
    dependents: [],
  },
};

const TABS: Tab[] = ['Personal', 'Passport', 'Visa', 'Insurance', 'Dependents'];

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

          {/* Academic */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-2">
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Academic</p>
            <p className="text-sm font-semibold text-primary">{s.faculty}</p>
            <p className="text-xs text-gray-500">{s.degree}</p>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-gray-100 pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-2 rounded-t-xl text-sm font-medium transition-all duration-200',
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
          <div className="bg-secondary rounded-2xl p-6">
            {activeTab === 'Personal'   && <InfoGrid items={s.personal} />}
            {activeTab === 'Passport'   && <InfoGrid items={s.passport} />}
            {activeTab === 'Visa'       && <InfoGrid items={s.visa} />}
            {activeTab === 'Insurance'  && <InfoGrid items={s.insurance} />}
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
