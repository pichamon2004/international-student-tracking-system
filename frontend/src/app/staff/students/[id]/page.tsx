'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiMapPinLine, RiCheckboxCircleLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { BsPeopleFill } from 'react-icons/bs';
import Button from '@/components/ui/Button';
import { RenewalDetailModal, type RenewalModalData } from '@/components/RenewalDetailModal';

type VisaStatus = 'Active' | 'Expired' | 'Expiring Soon';
type Tab = 'Student Information' | 'Passport & Visa' | 'Health Insurance' | 'Academic Record' | 'Recent Activity' | 'Renewal History';

/* ─── Types ───────────────────────────────────────────────── */

interface PassportRecord {
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  isCurrent: boolean;
  imageUrl?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

interface VisaRecord {
  passportNo: string;
  visaType: string;
  placeOfIssue: string;
  validFrom: string;
  validUntil: string;
  entries: string;
  isCurrent: boolean;
  imageUrls?: string[];
}

interface InsuranceRecord {
  provider: string;
  policyNumber: string;
  coverageType: string;
  startDate: string;
  expiryDate: string;
  isCurrent: boolean;
  imageUrl?: string;
}

interface StudentDetail {
  studentId: string; name: string; email: string; phone: string; address: string;
  nationality: string; faculty: string; degree: string;
  visaStatus: VisaStatus;
  infoStatus: 'not_added' | 'complete'; missingCount: number;
  ecName: string; ecEmail: string; ecPhone: string; ecRelationship: string;
  // Flat current-record display
  personal: { label: string; value: string }[];
  passport: { label: string; value: string }[];
  visa: { label: string; value: string }[];
  insurance: { label: string; value: string }[];
  passportImageUrl: string;
  visaImageUrls: string[];
  insuranceImageUrl: string;
  academicRecordImageUrl: string;
  // History arrays
  passports: PassportRecord[];
  visas: VisaRecord[];
  insurances: InsuranceRecord[];
  activity: { date: string; type: string; detail: string; status: string }[];
}

/* ─── Mock Data ───────────────────────────────────────────── */

const mockStudents: Record<string, StudentDetail> = {
  '1': {
    studentId: '663380599-8', name: 'Thitikorn Suwanbutwipha', email: 'thitikorn.su@kkumail.com',
    phone: '+66 81 987 6543', address: '456 KKU Dormitory, Khon Kaen',
    nationality: 'Vietnamese', faculty: 'College of Computing', degree: 'Ph.D.',
    visaStatus: 'Active',
    infoStatus: 'not_added', missingCount: 2,
    ecName: 'Nguyen Van A', ecEmail: 'nguyen.a@gmail.com', ecPhone: '+84 90 123 4567', ecRelationship: 'Parent',

    personal: [
      { label: 'Prefix',       value: 'Mr.' },
      { label: 'First Name',   value: 'Thitikorn' },
      { label: 'Middle Name',  value: '—' },
      { label: 'Last Name',    value: 'Suwanbutwipha' },
      { label: 'Birth Date',   value: '01/01/1998' },
      { label: 'Gender',       value: 'Male' },
      { label: 'Religion',     value: 'Buddhism' },
      { label: 'Nationality',  value: 'Vietnamese' },
      { label: 'Home Country', value: 'Vietnam' },
      { label: 'Program',      value: 'Geo-Informatics' },
      { label: 'Degree',       value: 'Ph.D.' },
    ],

    passport: [
      { label: 'Prefix',         value: 'Mr.' },
      { label: 'Surname',        value: 'Suwanbutwipha' },
      { label: 'Middle Name',    value: '—' },
      { label: 'Given Name',     value: 'Thitikorn' },
      { label: 'Birth Date',     value: '01/01/1998' },
      { label: 'Nationality',    value: 'Vietnamese' },
      { label: 'Nationality ID', value: '001234567890' },
      { label: 'Place of Birth', value: 'Hanoi, Vietnam' },
      { label: 'Date of Issue',  value: '01/03/2024' },
      { label: 'Expiry Date',    value: '01/03/2034' },
    ],

    visa: [
      { label: 'Passport',          value: 'B98765432' },
      { label: 'Place of Issue',    value: 'Bangkok' },
      { label: 'Valid From',        value: '15/04/2025' },
      { label: 'Valid Until',       value: '14/04/2026' },
      { label: 'Type of Visa',      value: 'ED' },
      { label: 'Number of Entries', value: 'Multiple' },
    ],

    insurance: [
      { label: 'Provider',      value: 'AXA Insurance' },
      { label: 'Policy No.',    value: 'AXA-2025-88001' },
      { label: 'Coverage Type', value: 'Comprehensive' },
      { label: 'Valid From',    value: '01/08/2025' },
      { label: 'Valid Until',   value: '31/07/2026' },
    ],

    passportImageUrl: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
    visaImageUrls: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoiea5WJFKQ_q-vVykcmQbLSlEKWMXs-3vIg&s',
      'https://loyaltylobby.com/wp-content/uploads/2022/08/Thai-Entry-Stamps.jpeg',
    ],
    insuranceImageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png',
    academicRecordImageUrl: 'https://online.fliphtml5.com/fkehc/cwmu/files/shot.jpg',

    passports: [
      { passportNumber: 'B98765432', issuingCountry: 'Vietnam', issueDate: '01/03/2024', expiryDate: '01/03/2034', isCurrent: true,
        imageUrl: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
        mrzLine1: 'P<VNMSUWANBUTWIPHA<<THITIKORN<<<<<<<<<<<<<<',
        mrzLine2: 'B987654321VNM9801015M3403014<<<<<<<<<<<<<<8' },
      { passportNumber: 'A12345678', issuingCountry: 'Vietnam', issueDate: '01/03/2014', expiryDate: '01/03/2024', isCurrent: false,
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Chinese_Biometric_Passport.jpg/320px-Chinese_Biometric_Passport.jpg',
        mrzLine1: 'P<VNMSUWANBUTWIPHA<<THITIKORN<<<<<<<<<<<<<<',
        mrzLine2: 'A123456781VNM9801015M2403014<<<<<<<<<<<<<<4' },
    ],
    visas: [
      { passportNo: 'B98765432', visaType: 'ED', placeOfIssue: 'Bangkok', validFrom: '15/04/2025', validUntil: '14/04/2026', entries: 'Multiple', isCurrent: true,
        imageUrls: ['https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoiea5WJFKQ_q-vVykcmQbLSlEKWMXs-3vIg&s', 'https://loyaltylobby.com/wp-content/uploads/2022/08/Thai-Entry-Stamps.jpeg'] },
      { passportNo: 'A12345678', visaType: 'ED', placeOfIssue: 'Hanoi',   validFrom: '15/04/2024', validUntil: '14/04/2025', entries: 'Single',   isCurrent: false,
        imageUrls: ['https://loyaltylobby.com/wp-content/uploads/2022/08/Thai-Entry-Stamps.jpeg'] },
      { passportNo: 'A12345678', visaType: 'ED', placeOfIssue: 'Hanoi',   validFrom: '15/04/2023', validUntil: '14/04/2024', entries: 'Single',   isCurrent: false,
        imageUrls: ['https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoiea5WJFKQ_q-vVykcmQbLSlEKWMXs-3vIg&s'] },
    ],
    insurances: [
      { provider: 'AXA Insurance',       policyNumber: 'AXA-2025-88001', coverageType: 'Comprehensive', startDate: '01/08/2025', expiryDate: '31/07/2026', isCurrent: true,
        imageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png' },
      { provider: 'Thai Life Insurance', policyNumber: 'TLI-2024-44320', coverageType: 'Inpatient',     startDate: '01/08/2024', expiryDate: '31/07/2025', isCurrent: false,
        imageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png' },
      { provider: 'Thai Life Insurance', policyNumber: 'TLI-2023-32100', coverageType: 'Inpatient',     startDate: '01/08/2023', expiryDate: '31/07/2024', isCurrent: false,
        imageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png' },
    ],

    activity: [
      { date: '01/03/2025', type: 'Passport',        detail: 'Updated passport (B98765432)',    status: 'Updated' },
      { date: '15/04/2025', type: 'Visa',             detail: 'Renewed ED visa',                status: 'Updated' },
      { date: '01/08/2025', type: 'Health Insurance', detail: 'Renewed AXA Comprehensive plan', status: 'Updated' },
      { date: '01/01/2025', type: 'Leave Request',    detail: 'Staff of College Approved',      status: 'Approved' },
    ],
  },
};

const TABS: Tab[] = ['Student Information', 'Passport & Visa', 'Health Insurance', 'Academic Record', 'Recent Activity', 'Renewal History'];

const visaStatusConfig: Record<VisaStatus, string> = {
  'Active':        'bg-green-100 text-green-700',
  'Expiring Soon': 'bg-yellow-100 text-yellow-700',
  'Expired':       'bg-red-100 text-red-600',
};

/* ─── Helpers ─────────────────────────────────────────────── */

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary/50">{label}</span>
          <span className="text-sm font-semibold text-primary">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}

function CurrentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <RiCheckboxCircleLine size={12} /> Current
    </span>
  );
}

function PastBadge() {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Past
    </span>
  );
}

function HistoryTableHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mt-6 mb-2">
      {label}
    </p>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function StaffStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Student Information');
  const [renewalModal, setRenewalModal] = useState<RenewalModalData | null>(null);

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

        {/* ── Left: Profile Card ── */}
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

          {/* Info Status */}
          {s.infoStatus === 'not_added' ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-red-600 font-medium">
                Missing {s.missingCount} item{s.missingCount !== 1 ? 's' : ''}
              </p>
              <Button variant="warning" label="Follow Up" onClick={() => {}} />
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-sm text-green-700 font-medium">All information completed</p>
            </div>
          )}

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
            <span className="text-sm font-semibold text-primary mt-1">{s.ecName}</span>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMailLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span className="break-all">{s.ecEmail}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <RiPhoneLine size={15} className="shrink-0 text-primary/50" />
              <span>{s.ecPhone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <BsPeopleFill size={15} className="shrink-0 text-primary/50" />
              <span>{s.ecRelationship}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

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

          {/* ── Student Information ── */}
          {activeTab === 'Student Information' && (
            <div className="bg-secondary rounded-2xl p-6">
              <InfoGrid items={s.personal} />
            </div>
          )}

          {/* ── Passport & Visa ── */}
          {activeTab === 'Passport & Visa' && (
            <div className="flex flex-col gap-4">

              <div className="flex flex-col lg:flex-row gap-4">
                {/* Passport column */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-sm font-semibold text-primary">Passport Information</p>
                    <InfoGrid items={s.passport} />
                  </div>
                  <img
                    src={s.passportImageUrl}
                    alt="Passport"
                    className="w-full md:w-3/5 object-cover rounded-xl bg-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                {/* Visa column */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                    <p className="text-sm font-semibold text-primary">Visa Information</p>
                    <InfoGrid items={s.visa} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {s.visaImageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Visa stamp ${i + 1}`}
                        className="h-36 w-full object-contain rounded-xl bg-gray-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── Health Insurance ── */}
          {activeTab === 'Health Insurance' && (
            <div className="flex flex-col gap-4">

              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                  <InfoGrid items={s.insurance} />
                </div>
                <img
                  src={s.insuranceImageUrl}
                  alt="Insurance"
                  className="w-full lg:w-1/2 object-cover rounded-xl bg-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

            </div>
          )}

          {/* ── Academic Record ── */}
          {activeTab === 'Academic Record' && (
            <div className="flex flex-col gap-3">
              <img
                src={s.academicRecordImageUrl}
                alt="Academic Record"
                className="w-full md:w-fit object-cover rounded-xl bg-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* ── Recent Activity ── */}
          {activeTab === 'Recent Activity' && (
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Detail</th>
                    <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.activity.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{a.date}</td>
                      <td className="py-3 px-4 text-primary font-medium">{a.type}</td>
                      <td className="py-3 px-4 text-primary">{a.detail || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="info" onClick={() => {}} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Renewal History ── */}
          {activeTab === 'Renewal History' && (
            <div className="flex flex-col gap-5">

              {/* PASSPORT */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Passport History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Passport No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Issuing Country</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Issue Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Expiry Date</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.passports.map((p, i) => (
                        <tr key={i} onClick={() => setRenewalModal({ kind: 'passport', data: {
                            ...p,
                            extraItems: s.passport.map(it =>
                              it.label === 'Date of Issue' ? { ...it, value: p.issueDate } :
                              it.label === 'Expiry Date'   ? { ...it, value: p.expiryDate } :
                              it
                            ),
                          } })}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', p.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 font-mono text-primary font-medium">{p.passportNumber}</td>
                          <td className="py-3 px-4 text-primary">{p.issuingCountry}</td>
                          <td className="py-3 px-4 text-primary">{p.issueDate}</td>
                          <td className="py-3 px-4 text-primary">{p.expiryDate}</td>
                          <td className="py-3 px-4 text-center">{p.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VISA */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Visa History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Passport No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Visa Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Valid From</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Valid Until</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.visas.map((v, i) => (
                        <tr key={i} onClick={() => setRenewalModal({ kind: 'visa', data: { ...v } })}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', v.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 font-mono text-primary">{v.passportNo}</td>
                          <td className="py-3 px-4 text-primary font-medium">{v.visaType}</td>
                          <td className="py-3 px-4 text-primary">{v.validFrom}</td>
                          <td className="py-3 px-4 text-primary">{v.validUntil}</td>
                          <td className="py-3 px-4 text-center">{v.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HEALTH INSURANCE */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Health Insurance History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Provider</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Policy No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Start Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Expiry Date</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.insurances.map((ins, i) => (
                        <tr key={i} onClick={() => setRenewalModal({ kind: 'insurance', data: { ...ins } })}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', ins.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 text-primary font-medium">{ins.provider}</td>
                          <td className="py-3 px-4 font-mono text-primary">{ins.policyNumber}</td>
                          <td className="py-3 px-4 text-primary">{ins.startDate}</td>
                          <td className="py-3 px-4 text-primary">{ins.expiryDate}</td>
                          <td className="py-3 px-4 text-center">{ins.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {renewalModal && (
        <RenewalDetailModal
          record={renewalModal}
          onClose={() => setRenewalModal(null)}
        />
      )}

    </div>
  );
}
