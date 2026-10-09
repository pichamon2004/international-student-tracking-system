'use client';

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { RiSearchLine, RiAddLine, RiCloseLine, RiUserAddLine, RiUploadLine, RiForbidLine, RiCheckLine, RiDeleteBinLine } from 'react-icons/ri';
import Button from '@/components/ui/Button';
import { studentApi, type ApiStudent } from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';
import ImportModal from '@/components/ImportModal';
import { useAuthStore } from '@/lib/auth';
import toast from 'react-hot-toast';

const STUDENT_COLUMNS = [
  { key: 'titleEn',      label: 'Prefix',      required: false, example: 'Mr.' },
  { key: 'firstNameEn',  label: 'First Name',  required: true,  example: 'Jane' },
  { key: 'middleNameEn', label: 'Middle Name', required: false, example: '' },
  { key: 'lastNameEn',   label: 'Last Name',   required: true,  example: 'Doe' },
  { key: 'email',        label: 'Gmail',       required: true,  example: 'student@gmail.com' },
  { key: 'studentId',    label: 'Student ID',  required: false, example: '6630400012' },
  { key: 'nationality',  label: 'Country',     required: false, example: 'Thai' },
  { key: 'program',      label: 'Program',     required: false, example: 'Computer Science' },
  { key: 'level',        label: 'Degree',      required: false, example: 'MASTER' },
  { key: 'dateOfBirth',  label: 'Birth Date',  required: false, example: '2000-01-31' },
];

const LEVEL_LABELS: Record<string, string> = { BACHELOR: "Bachelor's", MASTER: "Master's", PHD: 'Ph.D.' };

const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Inactive'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function registrationLabel(status: string, step: number): { label: string; cls: string } {
  if (status === 'ACTIVE' && step === 1) return { label: 'Pending Setup',  cls: 'bg-sky-50 text-sky-600' };
  if (status === 'ACTIVE')               return { label: 'Active',         cls: 'bg-green-100 text-green-700' };
  if (status === 'PENDING_APPROVAL')     return { label: 'Pending Review', cls: 'bg-blue-100 text-blue-700' };
  if (status === 'REJECTED')             return { label: 'Rejected',       cls: 'bg-red-100 text-red-500' };
  if (status === 'SUSPENDED')            return { label: 'Suspended',      cls: 'bg-orange-100 text-orange-600' };
  return { label: status, cls: 'bg-gray-100 text-gray-500' };
}

function fullName(s: ApiStudent) {
  const parts = [s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.'];

/* ── Add Student Modal ── */
interface AddStudentFormData {
  titleEn: string;
  email: string;
  studentId: string;
  firstNameEn: string;
  middleNameEn: string;
  lastNameEn: string;
  nationality: string;
  program: string;
  level: string;
  dateOfBirth: string;
}

const inputCls = (err?: string) =>
  clsx('border rounded-xl px-4 py-2.5 text-sm text-primary placeholder-gray-400 bg-gray-50 outline-none focus:border-primary transition-colors',
    err ? 'border-red-400' : 'border-gray-200');
const labelCls = 'text-xs font-semibold text-primary/60 uppercase tracking-wide';

const DEGREE_OPTIONS = [
  { value: 'BACHELOR', label: "Bachelor's" },
  { value: 'MASTER',   label: "Master's" },
  { value: 'PHD',      label: 'Ph.D.' },
];

function AddStudentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: AddStudentFormData) => void }) {
  const [form, setForm] = useState<AddStudentFormData>({
    titleEn: '', email: '', studentId: '', firstNameEn: '', middleNameEn: '', lastNameEn: '',
    nationality: '', program: '', level: '', dateOfBirth: '',
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

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
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          <p className="text-sm text-gray-500">
            Pre-register a student account. They will log in and complete their profile in Phase 1 &amp; 2.
          </p>

          {/* Prefix + First + Middle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Prefix</label>
              <CustomSelect value={form.titleEn}
                onChange={(val) => setForm(f => ({ ...f, titleEn: val }))}
                options={PREFIXES}
                placeholder="—" />
            </div>
            {field('firstNameEn',  'First Name',   'e.g. Maria')}
            {field('middleNameEn', 'Middle Name',  'optional', 'text', false)}
          </div>

          {/* Last Name */}
          <div>
            {field('lastNameEn', 'Last Name', 'e.g. Santos')}
          </div>

          {/* Email */}
          {field('email', 'Gmail Address', 'student@gmail.com', 'email')}

          {/* Student ID */}
          {field('studentId', 'Student ID', 'e.g. 673040001-2')}

          {/* Country + Birth Date */}
          <div className="grid grid-cols-2 gap-3">
            {field('nationality', 'Country', 'e.g. Thai', 'text', false)}
            {field('dateOfBirth', 'Birth Date', '', 'date', false)}
          </div>

          {/* Program */}
          {field('program', 'Program', 'e.g. Computer Science', 'text', false)}

          {/* Degree */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Degree</label>
            <CustomSelect
              value={form.level}
              onChange={(val) => setForm(f => ({ ...f, level: val }))}
              options={DEGREE_OPTIONS}
              placeholder="— Select degree —"
            />
          </div>
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
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission('STUDENT_MANAGEMENT.edit');
  const canDelete = hasPermission('STUDENT_MANAGEMENT.delete');
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.getAll({ search, page: 1, limit: 200 });
      setStudents(res.data.data);
      setPagination({
        page: res.data.pagination.page,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
      });
    } catch {
      // Keep existing students on error
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadStudents, 300);
    return () => clearTimeout(t);
  }, [loadStudents]);

  const filtered = students.filter(s => {
    const status = s.registrationStatus;
    const step = s.registrationStep;
    const matchFilter =
      filter === 'All' ||
      (filter === 'Active'   && status === 'ACTIVE') ||
      (filter === 'Pending'  && status === 'PENDING_APPROVAL') ||
      (filter === 'Inactive' && (status === 'REJECTED' || status === 'SUSPENDED'));
    return matchFilter;
  });

  const handleAdd = async (data: AddStudentFormData) => {
    try {
      await studentApi.create({
        titleEn: data.titleEn || undefined,
        email: data.email,
        studentId: data.studentId || undefined,
        firstNameEn: data.firstNameEn,
        middleNameEn: data.middleNameEn || undefined,
        lastNameEn: data.lastNameEn,
        nationality: data.nationality || undefined,
        program: data.program || undefined,
        level: data.level || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
      });
      setShowAddModal(false);
      loadStudents();
    } catch {
      // error handled silently; form stays open
    }
  };

  const handleToggleSuspend = async (s: ApiStudent) => {
    const suspending = s.registrationStatus !== 'SUSPENDED';
    const name = fullName(s);
    setBusyId(s.id);
    try {
      await studentApi.update(s.id, { registrationStatus: suspending ? 'SUSPENDED' : 'ACTIVE' });
      toast.success(suspending ? `${name} suspended` : `${name} reactivated`);
      loadStudents();
    } catch {
      toast.error('Failed to update student status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s: ApiStudent) => {
    const name = fullName(s);
    if (!window.confirm(`Delete ${name}? This permanently removes their profile and all related records. This cannot be undone.`)) return;
    setBusyId(s.id);
    try {
      await studentApi.delete(s.id);
      toast.success(`${name} deleted`);
      setStudents(prev => prev.filter(x => x.id !== s.id));
    } catch {
      toast.error('Failed to delete student');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-2xl font-semibold text-primary">Student Management</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all duration-200"
          >
            <RiUploadLine size={16} />
            Import Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all duration-200"
          >
            <RiAddLine size={16} />
            Student
          </button>
        </div>
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
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
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
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="info" onClick={() => router.push(`/staff/students/${s.id}`)} />
                      {canEdit && (
                        s.registrationStatus === 'SUSPENDED' ? (
                          <Button
                            variant="success"
                            label="Activate"
                            icon={RiCheckLine}
                            disabled={busyId === s.id}
                            onClick={() => handleToggleSuspend(s)}
                          />
                        ) : (
                          <Button
                            variant="warning"
                            label="Suspend"
                            icon={RiForbidLine}
                            disabled={busyId === s.id}
                            onClick={() => handleToggleSuspend(s)}
                          />
                        )
                      )}
                      {canDelete && (
                        <Button
                          variant="danger"
                          label="Delete"
                          icon={RiDeleteBinLine}
                          disabled={busyId === s.id}
                          onClick={() => handleDelete(s)}
                        />
                      )}
                    </div>
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

      {showImportModal && (
        <ImportModal
          title="Import Students from Excel"
          columns={STUDENT_COLUMNS}
          importEndpoint="/students/import"
          templateFileName="student_template.xlsx"
          onClose={() => setShowImportModal(false)}
          onDone={loadStudents}
        />
      )}
    </div>
  );
}
