'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studentApi } from '@/lib/api';
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiMapPinLine, RiCheckboxCircleLine, RiCloseLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { BsPeopleFill } from 'react-icons/bs';
import Button from '@/components/ui/Button';
import { RenewalDetailModal, type RenewalModalData } from '@/components/RenewalDetailModal';

type VisaStatus = 'Active' | 'Expired' | 'Expiring Soon';
type Tab = 'Student Information' | 'Passport & Visa' | 'Health Insurance' | 'Recent Activity' | 'Renewal History';

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

interface AcademicHistoryItem {
  institution: string; country: string; degree: string; field: string;
  startYear: string; endYear: string; gpa?: string;
}

interface StudentDetail {
  studentId: string; name: string; email: string; phone: string; address: string;
  nationality: string; faculty: string; degree: string;
  visaStatus: VisaStatus;
  infoStatus: 'not_added' | 'complete'; missingCount: number;
  ecName: string; ecEmail: string; ecPhone: string; ecRelationship: string;
  academicHistory?: AcademicHistoryItem[];
  registrationStatus?: string; registrationStep?: number;
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
      { label: 'Prefix (EN)',        value: 'Mr.' },
      { label: 'First Name (EN)',    value: 'Thitikorn' },
      { label: 'Middle Name (EN)',   value: '—' },
      { label: 'Last Name (EN)',     value: 'Suwanbutwipha' },
      { label: 'Date of Birth',      value: '01/01/1998' },
      { label: 'Gender',             value: 'Male' },
      { label: 'Religion',           value: 'Buddhism' },
      { label: 'Nationality',        value: 'Vietnamese' },
      { label: 'Home Country',       value: 'Vietnam' },
      { label: 'Address in Thailand', value: '456 KKU Dormitory, Mueang Khon Kaen 40002' },
      { label: 'Home Address',       value: '12 Nguyen Trai, Hanoi, Vietnam' },
      { label: 'Phone',              value: '+66 81 987 6543' },
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
    registrationStatus: 'ACTIVE', registrationStep: 2,
  },
  /* Phase 2 Review — student submitted all 6 steps, staff needs to fill academic info */
  '3': {
    studentId: '673040003-4', name: 'Maria Santos', email: 'maria.santos@kkumail.com',
    phone: '+63-917-000-1234', address: '12/3 Moo 4, Nai Mueang, Mueang Khon Kaen 40000',
    nationality: 'Filipino', faculty: '—', degree: '—',
    visaStatus: 'Active',
    infoStatus: 'complete', missingCount: 0,
    ecName: 'Rosa Santos', ecEmail: 'rosa.santos@gmail.com', ecPhone: '+63-917-111-2222', ecRelationship: 'Mother',
    personal: [
      { label: 'Prefix (EN)',         value: 'Ms.' },
      { label: 'First Name (EN)',      value: 'Maria' },
      { label: 'Middle Name (EN)',     value: '—' },
      { label: 'Last Name (EN)',       value: 'Santos' },
      { label: 'Date of Birth',        value: '12/05/2003' },
      { label: 'Gender',               value: 'Female' },
      { label: 'Religion',             value: 'Roman Catholic' },
      { label: 'Nationality',          value: 'Filipino' },
      { label: 'Home Country',         value: 'Philippines' },
      { label: 'Address in Thailand',  value: '12/3 Moo 4, Nai Mueang, Mueang Khon Kaen 40000' },
      { label: 'Home Address',         value: '45 Rizal Street, Manila, Philippines' },
      { label: 'Phone',                value: '+63-917-000-1234' },
    ],
    passport: [
      { label: 'Passport No.',    value: 'P1234567A' },
      { label: 'Issuing Country', value: 'Philippines' },
      { label: 'Given Name',      value: 'MARIA' },
      { label: 'Surname',         value: 'SANTOS' },
      { label: 'Date of Birth',   value: '12/05/2003' },
      { label: 'Date of Issue',   value: '01/06/2022' },
      { label: 'Expiry Date',     value: '01/06/2027' },
    ],
    visa: [
      { label: 'Visa Type',         value: 'ED (Education)' },
      { label: 'Passport No.',      value: 'P1234567A' },
      { label: 'Place of Issue',    value: 'Royal Thai Embassy, Manila' },
      { label: 'Valid From',        value: '01/08/2025' },
      { label: 'Valid Until',       value: '31/07/2026' },
      { label: 'Number of Entries', value: 'Multiple' },
    ],
    insurance: [
      { label: 'Provider',      value: 'AXA Insurance Thailand' },
      { label: 'Policy No.',    value: 'AXA-2025-55002' },
      { label: 'Coverage Type', value: 'Inpatient + Outpatient' },
      { label: 'Valid From',    value: '01/08/2025' },
      { label: 'Valid Until',   value: '31/07/2026' },
    ],
    passportImageUrl: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
    visaImageUrls: ['https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoiea5WJFKQ_q-vVykcmQbLSlEKWMXs-3vIg&s'],
    insuranceImageUrl: 'https://www.tdi.texas.gov/artwork/compliance/bcbstx.png',
    academicRecordImageUrl: 'https://online.fliphtml5.com/fkehc/cwmu/files/shot.jpg',
    academicHistory: [
      { institution: 'University of Santo Tomas', country: 'Philippines', degree: "Bachelor's Degree", field: 'Computer Science', startYear: '2021', endYear: '2025', gpa: '3.72' },
    ],
    passports: [
      { passportNumber: 'P1234567A', issuingCountry: 'Philippines', issueDate: '01/06/2022', expiryDate: '01/06/2027', isCurrent: true },
    ],
    visas: [
      { passportNo: 'P1234567A', visaType: 'ED', placeOfIssue: 'Manila', validFrom: '01/08/2025', validUntil: '31/07/2026', entries: 'Multiple', isCurrent: true },
    ],
    insurances: [
      { provider: 'AXA Insurance Thailand', policyNumber: 'AXA-2025-55002', coverageType: 'Inpatient + Outpatient', startDate: '01/08/2025', expiryDate: '31/07/2026', isCurrent: true },
    ],
    activity: [
      { date: '01/03/2025', type: 'Registration', detail: 'Phase 2 — all documents submitted',  status: 'Pending Review' },
      { date: '20/01/2025', type: 'Registration', detail: 'Phase 1 approved by staff',          status: 'Approved' },
      { date: '10/01/2025', type: 'Registration', detail: 'Phase 1 — personal info submitted',  status: 'Submitted' },
    ],
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 2,
  },
  /* Phase 1 Review — student has confirmed basic info, waiting staff approval */
  '4': {
    studentId: '673040004-2', name: 'Rahul Sharma', email: 'rahul.sharma@kkumail.com',
    phone: '—', address: '—',
    nationality: '—', faculty: '—', degree: '—',
    visaStatus: 'Active',
    infoStatus: 'not_added', missingCount: 0,
    ecName: '—', ecEmail: '—', ecPhone: '—', ecRelationship: '—',
    /* Phase 1 only shows what was entered at account creation */
    personal: [
      { label: 'First Name', value: 'Rahul' },
      { label: 'Last Name',  value: 'Sharma' },
      { label: 'Email',      value: 'rahul.sharma@kkumail.com' },
      { label: 'Student ID', value: '673040004-2' },
    ],
    passport: [], visa: [], insurance: [],
    passportImageUrl: '', visaImageUrls: [], insuranceImageUrl: '', academicRecordImageUrl: '',
    passports: [], visas: [], insurances: [],
    activity: [
      { date: '20/02/2025', type: 'Registration', detail: 'Phase 1 submitted — pending staff approval', status: 'Pending' },
    ],
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 1,
  },
  /* Awaiting Phase 1 — account just created by staff, student has not started yet */
  '5': {
    studentId: '673040005-9', name: 'Joanna Sofia', email: 'joanna.sofia@gmail.com',
    phone: '—', address: '—',
    nationality: '—', faculty: '—', degree: '—',
    visaStatus: 'Active',
    infoStatus: 'not_added', missingCount: 0,
    ecName: '—', ecEmail: '—', ecPhone: '—', ecRelationship: '—',
    /* Only modal data is available */
    personal: [
      { label: 'First Name', value: 'Joanna' },
      { label: 'Last Name',  value: 'Sofia' },
      { label: 'Email',      value: 'joanna.sofia@gmail.com' },
      { label: 'Student ID', value: '673040005-9' },
    ],
    passport: [], visa: [], insurance: [],
    passportImageUrl: '', visaImageUrls: [], insuranceImageUrl: '', academicRecordImageUrl: '',
    passports: [], visas: [], insurances: [],
    activity: [
      { date: '20/03/2025', type: 'Registration', detail: 'Student account created by staff', status: 'Pending' },
    ],
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 0,
  },
};

/* ─── Phase 2 Approve Modal ───────────────────────────────── */

const SCHOLARSHIP_OPTIONS = [
  'ทุนลุ่มแม่น้ำโขง',
  'ASEAN & GMS',
  'Self-support',
  'อื่นๆ',
] as const;

function Phase2ApproveModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const modalInputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition bg-white disabled:bg-gray-50 disabled:text-gray-400';
  const modalLabelCls = 'text-xs font-semibold text-gray-600 mb-1 block';

  const [form, setForm] = useState({ enrollmentDate: '', expectedGraduation: '', scholarship: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.enrollmentDate)     e.enrollmentDate     = 'Required';
    if (!form.expectedGraduation) e.expectedGraduation = 'Required';
    if (!form.scholarship)        e.scholarship        = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-primary">Complete Registration</p>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all">
            <RiCloseLine size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Fill in the student&apos;s current study details at College of Computing, KKU.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={modalLabelCls}>Enrollment Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.enrollmentDate}
                onChange={e => setForm(p => ({ ...p, enrollmentDate: e.target.value }))}
                className={clsx(modalInputCls, errors.enrollmentDate && 'border-red-400')} />
              {errors.enrollmentDate && <p className="text-xs text-red-500">{errors.enrollmentDate}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={modalLabelCls}>Expected Graduation <span className="text-red-400">*</span></label>
              <input type="date" value={form.expectedGraduation}
                onChange={e => setForm(p => ({ ...p, expectedGraduation: e.target.value }))}
                className={clsx(modalInputCls, errors.expectedGraduation && 'border-red-400')} />
              {errors.expectedGraduation && <p className="text-xs text-red-500">{errors.expectedGraduation}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={modalLabelCls}>Scholarship<span className="text-red-400">*</span></label>
            <select value={form.scholarship}
              onChange={e => setForm(p => ({ ...p, scholarship: e.target.value }))}
              className={clsx(modalInputCls, errors.scholarship && 'border-red-400')}>
              <option value="">Select scholarship type...</option>
              {SCHOLARSHIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {errors.scholarship && <p className="text-xs text-red-500">{errors.scholarship}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50">
            {saving ? 'Saving…' : '✓ Approve & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: Tab[] = ['Student Information', 'Passport & Visa', 'Health Insurance', 'Recent Activity', 'Renewal History'];

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

/* ─── Phase 2 Form ────────────────────────────────────────── */

const LEVEL_OPTIONS = ['MASTER', 'PHD'] as const;
const LEVEL_LABELS: Record<string, string> = { MASTER: "Master's (M.Sc.)", PHD: 'Ph.D.' };

const PROGRAMS_BY_LEVEL: Record<string, string[]> = {
  MASTER: [
    'M.Sc. Computer Science and Information Technology',
    'M.Sc. Data Science and Artificial Intelligence (International Program)',
    'M.Sc. Geo-Informatics',
  ],
  PHD: [
    'Ph.D. Computer Science and Information Technology (International Program)',
    'Ph.D. Geo-Informatics',
  ],
};

function Phase2Form({ studentDbId }: { studentDbId: number }) {
  const [form, setForm] = useState({
    faculty: '',
    program: '',
    level: '',
    enrollmentDate: '',
    expectedGraduation: '',
    scholarship: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition bg-white';
  const labelCls = 'text-xs font-semibold text-gray-600 mb-1 block';

  const handleSave = async () => {
    if (!form.faculty || !form.program || !form.level || !form.enrollmentDate || !form.expectedGraduation) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await studentApi.update(studentDbId, {
        faculty: form.faculty,
        program: form.program,
        level: form.level,
        enrollmentDate: new Date(form.enrollmentDate).toISOString(),
        expectedGraduation: new Date(form.expectedGraduation).toISOString(),
        scholarship: form.scholarship || undefined,
        registrationStatus: 'ACTIVE',
        registrationStep: 2,
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <RiCheckboxCircleLine size={32} className="text-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-green-700">Registration Phase 2 Completed</p>
          <p className="text-sm text-gray-500 mt-1">Academic information has been saved and the student status is now Active.</p>
        </div>
        <button onClick={() => setSaved(false)} className="text-xs text-primary underline">Edit again</button>
      </div>
    );
  }

  const programs = form.level ? (PROGRAMS_BY_LEVEL[form.level] ?? []) : [];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-primary">Registration Phase 2 — Academic Information</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Fill in the student&apos;s academic details to complete registration and activate their account.
          This section is staff-only and cannot be edited by the student.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Faculty / College <span className="text-red-400">*</span></label>
          <input value={form.faculty} onChange={e => setForm(p => ({ ...p, faculty: e.target.value }))}
            placeholder="e.g. College of Computing" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Degree Level <span className="text-red-400">*</span></label>
          <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value, program: '' }))} className={inputCls}>
            <option value="">Select level...</option>
            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Program <span className="text-red-400">*</span></label>
          <select value={form.program} onChange={e => setForm(p => ({ ...p, program: e.target.value }))} className={inputCls}
            disabled={!form.level}>
            <option value="">{form.level ? 'Select program...' : 'Select level first'}</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Enrollment Date (ปีที่เข้าศึกษา) <span className="text-red-400">*</span></label>
          <input type="date" value={form.enrollmentDate} onChange={e => setForm(p => ({ ...p, enrollmentDate: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Expected Graduation (ปีที่จบ) <span className="text-red-400">*</span></label>
          <input type="date" value={form.expectedGraduation} onChange={e => setForm(p => ({ ...p, expectedGraduation: e.target.value }))} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Scholarship</label>
          <input value={form.scholarship} onChange={e => setForm(p => ({ ...p, scholarship: e.target.value }))}
            placeholder="e.g. KKU International Scholarship (leave blank if none)" className={inputCls} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : '✓ Complete Registration (Phase 2)'}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

type ApprovalState = 'idle' | 'approved' | 'rejected' | 'approving_p2';

export default function StaffStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Student Information');
  const [renewalModal, setRenewalModal] = useState<RenewalModalData | null>(null);
  const [approval, setApproval] = useState<ApprovalState>('idle');

  const s = mockStudents[id] ?? mockStudents['1'];
  const regStep   = s.registrationStep   ?? 2;
  const regStatus = s.registrationStatus ?? 'ACTIVE';
  const isPending = regStatus === 'PENDING_APPROVAL' && approval === 'idle';
  const needsApproval = isPending && (regStep === 1 || regStep === 2);

  const rawName = s.name.trim().replace('—', '');
  const initials = rawName
    ? rawName.split(' ').map((w: string) => w[0]).join('').toUpperCase()
    : s.email.slice(0, 2).toUpperCase();

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
        <h1 className="text-2xl font-semibold text-primary flex-1">Student Profile</h1>

        {/* Approve / Reject — shown in header for Phase 1 & 2 review */}
        {needsApproval && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApproval('rejected')}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-all"
            >
              Reject
            </button>
            <button
              onClick={() => regStep === 2 ? setApproval('approving_p2') : setApproval('approved')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Awaiting Phase 1 notice */}
      {isPending && regStep === 0 && (
        <div className="px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0 animate-pulse" />
          Waiting for student to complete Phase 1.
        </div>
      )}

      {/* Post-action banners */}
      {approval === 'approved' && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
          <RiCheckboxCircleLine size={18} />
          Phase {regStep} approved — student can now proceed.
        </div>
      )}
      {approval === 'rejected' && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          Registration rejected. The student has been notified.
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left: Profile Card ── */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-4">

          {/* Avatar */}
          <div className="bg-secondary rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className={clsx('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold', rawName ? 'bg-primary' : 'bg-gray-400')}>
              {initials}
            </div>
            <div className="text-center">
              {rawName ? (
                <p className="font-semibold text-primary">{s.name}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Name not yet provided</p>
              )}
              <p className="text-xs text-gray-400 font-mono mt-0.5">{s.studentId}</p>
              <p className="text-xs text-gray-500 mt-1">{s.nationality !== '—' ? s.nationality : ''}</p>
              {isPending && (
                <span className={clsx('mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium',
                  regStep === 0 ? 'bg-gray-100 text-gray-600' :
                  regStep === 1 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700')}>
                  {regStep === 0 ? 'Awaiting Phase 1' : regStep === 1 ? 'Phase 1 Review' : 'Phase 2 Review'}
                </span>
              )}
            </div>
            {!isPending && (
              <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', visaStatusConfig[s.visaStatus])}>
                Visa: {s.visaStatus}
              </span>
            )}
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
            <div className="flex flex-col gap-3">
              {s.personal.length > 0 ? (
                <div className="bg-secondary rounded-2xl p-6">
                  <InfoGrid items={s.personal} />
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No information yet — student has not completed Phase 1.
                </div>
              )}
            </div>
          )}

          {/* ── Passport & Visa ── */}
          {activeTab === 'Passport & Visa' && (
            <div className="flex flex-col gap-3">
              {s.passport.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Passport column */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                      <p className="text-sm font-semibold text-primary">Passport Information</p>
                      <InfoGrid items={s.passport} />
                    </div>
                    {s.passportImageUrl && (
                      <img src={s.passportImageUrl} alt="Passport"
                        className="w-full md:w-3/5 object-cover rounded-xl bg-gray-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                  </div>
                  {/* Visa column */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                      <p className="text-sm font-semibold text-primary">Visa Information</p>
                      <InfoGrid items={s.visa} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {s.visaImageUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Visa stamp ${i + 1}`}
                          className="h-36 w-full object-contain rounded-xl bg-gray-200"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No passport or visa data — student has not completed Phase 2.
                </div>
              )}
            </div>
          )}

          {/* ── Health Insurance ── */}
          {activeTab === 'Health Insurance' && (
            <div className="flex flex-col gap-3">
              {s.insurance.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                    <InfoGrid items={s.insurance} />
                  </div>
                  {s.insuranceImageUrl && (
                    <img src={s.insuranceImageUrl} alt="Insurance"
                      className="w-full lg:w-1/2 object-cover rounded-xl bg-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  No insurance data — student has not completed Phase 2.
                </div>
              )}
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

      {approval === 'approving_p2' && (
        <Phase2ApproveModal
          onClose={() => setApproval('idle')}
          onConfirm={() => setApproval('approved')}
        />
      )}

    </div>
  );
}
