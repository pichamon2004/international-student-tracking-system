'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { RiSearchLine, RiAddLine, RiCloseLine, RiUserAddLine } from 'react-icons/ri';
import Button from '@/components/ui/Button';
import type { ApiStudent } from '@/lib/api';

const LEVEL_LABELS: Record<string, string> = { BACHELOR: "Bachelor's", MASTER: "Master's", PHD: 'Ph.D.' };

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Inactive'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function registrationLabel(status: string, step: number): { label: string; cls: string } {
  if (status === 'ACTIVE') return { label: 'Active', cls: 'bg-green-100 text-green-700' };
  if (status === 'PENDING_APPROVAL') {
    if (step === 0) return { label: 'Awaiting Phase 1', cls: 'bg-gray-100 text-gray-600' };
    if (step === 1) return { label: 'Phase 1 Review',   cls: 'bg-yellow-100 text-yellow-700' };
    if (step === 2) return { label: 'Phase 2 Review',   cls: 'bg-blue-100 text-blue-700' };
  }
  if (status === 'REJECTED')  return { label: 'Rejected',  cls: 'bg-red-100 text-red-500' };
  if (status === 'SUSPENDED') return { label: 'Suspended', cls: 'bg-orange-100 text-orange-600' };
  return { label: status, cls: 'bg-gray-100 text-gray-500' };
}

function fullName(s: ApiStudent) {
  const parts = [s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

/* helper to build a null-filled ApiStudent base */
const base = (overrides: Partial<ApiStudent> & Pick<ApiStudent, 'id' | 'registrationStatus' | 'registrationStep' | 'createdAt' | 'updatedAt'>): ApiStudent => ({
  studentId: null,
  titleEn: null, firstNameEn: null, middleNameEn: null, lastNameEn: null,
  dateOfBirth: null, gender: null, nationality: null, religion: null, homeCountry: null,
  email: null, phone: null, addressInThailand: null, homeAddress: null,
  emergencyContact: null, emergencyEmail: null, emergencyPhone: null, emergencyRelation: null,
  faculty: null, program: null, level: null,
  enrollmentDate: null, expectedGraduation: null, scholarship: null, advisorId: null,
  ...overrides,
});

/* ── Mock students covering all onboarding states ── */
const mockStudents: ApiStudent[] = [
  base({
    id: 1, studentId: '663040001-8',
    titleEn: 'Mr.', firstNameEn: 'Aung', lastNameEn: 'Kyaw',
    email: 'aung.kyaw@kkumail.com', phone: '+95-9-123-4567',
    nationality: 'Myanmar', homeCountry: 'Myanmar',
    dateOfBirth: '1998-05-10', gender: 'MALE', religion: 'Buddhism',
    addressInThailand: '88/2 KKU Dormitory, Mueang Khon Kaen 40002',
    homeAddress: '45 Bogyoke Road, Yangon, Myanmar',
    emergencyContact: 'Ma Aye', emergencyEmail: 'ma.aye@gmail.com',
    emergencyPhone: '+95-9-876-5432', emergencyRelation: 'Parent',
    faculty: 'College of Computing', program: 'M.Sc. Computer Science and Information Technology',
    level: 'MASTER', enrollmentDate: '2024-08-01', expectedGraduation: '2026-07-31',
    scholarship: 'ASEAN & GMS', advisorId: 1,
    registrationStatus: 'ACTIVE', registrationStep: 2,
    createdAt: '2024-07-01T09:00:00Z', updatedAt: '2024-08-15T10:30:00Z',
  }),
  base({
    id: 2, studentId: '663040002-6',
    titleEn: 'Ms.', firstNameEn: 'Liu', lastNameEn: 'Chen',
    email: 'liu.chen@kkumail.com', phone: '+86-135-0000-1234',
    nationality: 'Chinese', homeCountry: 'China',
    dateOfBirth: '1997-11-20', gender: 'FEMALE', religion: 'Buddhism',
    addressInThailand: '12/1 Near KKU International House, Khon Kaen 40002',
    homeAddress: '28 Wangfujing Street, Beijing, China',
    emergencyContact: 'Chen Wei', emergencyEmail: 'chen.wei@gmail.com',
    emergencyPhone: '+86-138-0000-5678', emergencyRelation: 'Parent',
    faculty: 'College of Computing', program: 'Ph.D. Geo-Informatics',
    level: 'PHD', enrollmentDate: '2024-08-01', expectedGraduation: '2028-07-31',
    scholarship: 'ทุนลุ่มแม่น้ำโขง', advisorId: 1,
    registrationStatus: 'ACTIVE', registrationStep: 2,
    createdAt: '2024-07-02T09:00:00Z', updatedAt: '2024-08-16T10:30:00Z',
  }),
  base({
    id: 3, studentId: '673040003-4',
    titleEn: 'Ms.', firstNameEn: 'Maria', lastNameEn: 'Santos',
    email: 'maria.santos@kkumail.com', phone: '+63-917-000-1234',
    nationality: 'Filipino', homeCountry: 'Philippines',
    addressInThailand: '12/3 Moo 4, Nai Mueang, Mueang Khon Kaen 40000',
    homeAddress: '45 Rizal Street, Manila, Philippines',
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 2,
    createdAt: '2025-01-10T09:00:00Z', updatedAt: '2025-03-01T08:00:00Z',
  }),
  base({
    id: 4, studentId: '673040004-2',
    titleEn: 'Mr.', firstNameEn: 'Rahul', lastNameEn: 'Sharma',
    email: 'rahul.sharma@kkumail.com', phone: '+91-98765-43210',
    nationality: 'Indian', homeCountry: 'India',
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 1,
    createdAt: '2025-02-15T09:00:00Z', updatedAt: '2025-02-20T10:00:00Z',
  }),
  base({
    id: 5, studentId: '673040005-9',
    firstNameEn: 'Joanna', lastNameEn: 'Sofia',
    email: 'joanna.sofia@gmail.com',
    registrationStatus: 'PENDING_APPROVAL', registrationStep: 0,
    createdAt: '2025-03-20T11:00:00Z', updatedAt: '2025-03-20T11:00:00Z',
  }),
  base({
    id: 6, studentId: '663040006-7',
    titleEn: 'Mr.', firstNameEn: 'Mohammed', lastNameEn: 'Al-Rashid',
    email: 'mohammed.r@kkumail.com', phone: '+966-50-000-1234',
    nationality: 'Saudi Arabian', homeCountry: 'Saudi Arabia',
    faculty: 'College of Computing', program: 'M.Sc. Data Science and Artificial Intelligence (International Program)',
    level: 'MASTER', enrollmentDate: '2023-08-01', expectedGraduation: '2025-07-31',
    scholarship: 'Self-support', advisorId: 2,
    registrationStatus: 'SUSPENDED', registrationStep: 2,
    createdAt: '2023-07-01T09:00:00Z', updatedAt: '2025-01-10T09:00:00Z',
  }),
];

/* ── Add Student Modal ── */
interface AddStudentFormData {
  email: string;
  studentId: string;
  firstNameEn: string;
  middleNameEn: string;
  lastNameEn: string;
}

const inputCls = (err?: string) =>
  clsx('border rounded-xl px-4 py-2.5 text-sm text-primary placeholder-gray-400 bg-gray-50 outline-none focus:border-primary transition-colors',
    err ? 'border-red-400' : 'border-gray-200');
const labelCls = 'text-xs font-semibold text-primary/60 uppercase tracking-wide';

function AddStudentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: AddStudentFormData) => void }) {
  const [form, setForm] = useState<AddStudentFormData>({
    email: '', studentId: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddStudentFormData, string>>>({});

  const validate = () => {
    const e: Partial<Record<keyof AddStudentFormData, string>> = {};
    if (!form.email.trim())       e.email       = 'Gmail address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.studentId.trim())   e.studentId   = 'Student ID is required';
    if (!form.firstNameEn.trim()) e.firstNameEn = 'First name is required';
    if (!form.lastNameEn.trim())  e.lastNameEn  = 'Last name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onAdd(form); };

  const field = (key: keyof AddStudentFormData, label: string, placeholder: string, type = 'text', required = true) => (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} placeholder={placeholder} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={inputCls(errors[key])} />
      {errors[key] && <p className="text-xs text-red-500 pl-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RiUserAddLine size={18} className="text-primary" />
            <p className="font-semibold text-primary">Add New Student</p>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200">
            <RiCloseLine size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            Pre-register a student account. They will log in and complete their profile in Phase 1 &amp; 2.
          </p>

          {/* Name row */}
          <div className="grid grid-cols-3 gap-3">
            {field('firstNameEn',  'First Name',   'e.g. Maria')}
            {field('middleNameEn', 'Middle Name',  'optional', 'text', false)}
            {field('lastNameEn',   'Last Name',    'e.g. Santos')}
          </div>

          {/* Email */}
          {field('email', 'Gmail Address', 'student@gmail.com', 'email')}

          {/* Student ID */}
          {field('studentId', 'Student ID', 'e.g. 673040001-2')}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
          <Button variant="primary" label="Add Student" onClick={handleSubmit} />
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function StaffStudentPage() {
  const router = useRouter();
  const [students, setStudents] = useState<ApiStudent[]>(mockStudents);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const name = fullName(s).toLowerCase();
    const matchSearch =
      name.includes(q) ||
      (s.studentId ?? '').includes(q) ||
      (s.email ?? '').toLowerCase().includes(q);
    const status = s.registrationStatus;
    const step = s.registrationStep;
    const matchFilter =
      filter === 'All' ||
      (filter === 'Active'   && status === 'ACTIVE') ||
      (filter === 'Pending'  && status === 'PENDING_APPROVAL') ||
      (filter === 'Inactive' && (status === 'REJECTED' || status === 'SUSPENDED'));
    return matchSearch && matchFilter;
  });

  const handleAdd = (data: AddStudentFormData) => {
    const newStudent: ApiStudent = base({
      id: Date.now(),
      studentId: data.studentId,
      firstNameEn: data.firstNameEn || null,
      middleNameEn: data.middleNameEn || null,
      lastNameEn: data.lastNameEn || null,
      email: data.email,
      registrationStatus: 'PENDING_APPROVAL',
      registrationStep: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setStudents(prev => [newStudent, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-2xl font-semibold text-primary">Student Management</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all duration-200"
        >
          <RiAddLine size={16} />
          + Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 bg-gray-50 focus-within:border-primary transition-colors w-full">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name, ID, or email..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
                filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm border-t">
          <thead>
            <tr className="border-b">
              <th className="text-left py-4 px-4 font-semibold text-primary">Student ID</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Name / Email</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Nationality</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Level</th>
              <th className="text-left py-4 px-4 font-semibold text-primary">Program</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Reg. Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">No students found</td></tr>
            ) : filtered.map(s => {
              const { label, cls } = registrationLabel(s.registrationStatus, s.registrationStep);
              const name = fullName(s);
              return (
                <tr key={s.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">{s.studentId ?? '—'}</td>
                  <td className="py-3 px-4">
                    {name !== '—' ? (
                      <>
                        <p className="text-primary font-medium">{name}</p>
                        {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                      </>
                    ) : (
                      <p className="text-gray-400 italic text-xs">{s.email ?? '—'}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-primary">{s.nationality ?? '—'}</td>
                  <td className="py-3 px-4 text-primary">{LEVEL_LABELS[s.level ?? ''] ?? s.level ?? '—'}</td>
                  <td className="py-3 px-4 text-primary">{s.program ?? '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cls)}>{label}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button variant="info" onClick={() => router.push(`/staff/students/${s.id}`)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
