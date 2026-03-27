'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { RiArrowLeftLine, RiSearchLine, RiDeleteBinLine, RiAddLine, RiUpload2Line, RiCloseLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import { RiArrowDropDownLine } from "react-icons/ri";
import { advisorApi, studentApi, type ApiStudent } from '@/lib/api';
import toast from 'react-hot-toast';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Asst. Prof.', 'Assoc. Prof.', 'Prof.'];
const NATIONALITIES = ['Thai', 'Chinese', 'Vietnamese', 'Myanmar', 'Lao', 'Indonesian', 'American', 'Other'];

type AssignedStudent = {
  id: number;
  studentId: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  email: string | null;
};

export default function AdvisorEditPage() {
  const router = useRouter();
  const params = useParams();
  const advisorId = Number(params.id);

  const [prefix, setPrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add-student picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [allStudents, setAllStudents] = useState<ApiStudent[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);

  const [openPrefix, setOpenPrefix] = useState(false);
  const prefixRef = useRef<HTMLDivElement>(null);

  const [openNationality, setOpenNationality] = useState(false);
  const nationalityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    advisorApi.getById(advisorId)
      .then(res => {
        const a = res.data.data;
        setPrefix(a.titleEn ?? '');
        setFirstName(a.firstNameEn ?? '');
        setLastName(a.lastNameEn ?? '');
        setTel(a.phone ?? '');
        setEmail(a.email ?? '');
        if (a.students) {
          setStudents(a.students.map(s => ({
            id: s.id,
            studentId: s.studentId,
            firstNameEn: s.firstNameEn,
            lastNameEn: s.lastNameEn,
            email: null,
          })));
        }
      })
      .catch(() => toast.error('Failed to load advisor'))
      .finally(() => setLoading(false));
  }, [advisorId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        prefixRef.current && !prefixRef.current.contains(e.target as Node) &&
        nationalityRef.current && !nationalityRef.current.contains(e.target as Node)
      ) {
        setOpenPrefix(false);
        setOpenNationality(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await advisorApi.updateById(advisorId, {
        titleEn: prefix || undefined,
        firstNameEn: firstName || undefined,
        lastNameEn: lastName || undefined,
        phone: tel || undefined,
      });
      toast.success('Advisor updated');
      router.back();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveStudent(studentNumId: number) {
    try {
      await studentApi.update(studentNumId, { advisorId: null } as never);
      setStudents(prev => prev.filter(s => s.id !== studentNumId));
      toast.success('Student removed from advisor');
    } catch {
      toast.error('Failed to remove student');
    }
  }

  const openPicker = useCallback(async () => {
    setShowPicker(true);
    setPickerSearch('');
    setPickerLoading(true);
    try {
      const res = await studentApi.getAll({ limit: 200 });
      setAllStudents(res.data.data);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setPickerLoading(false);
    }
  }, []);

  async function handleAssignStudent(student: ApiStudent) {
    setAssigning(student.id);
    try {
      await studentApi.update(student.id, { advisorId } as never);
      setStudents(prev => [...prev, {
        id: student.id,
        studentId: student.studentId,
        firstNameEn: student.firstNameEn,
        lastNameEn: student.lastNameEn,
        email: null,
      }]);
      toast.success(`Assigned ${student.firstNameEn ?? student.studentId}`);
    } catch {
      toast.error('Failed to assign student');
    } finally {
      setAssigning(null);
    }
  }

  const filteredStudents = students.filter(s => {
    const name = [s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ').toLowerCase();
    const sid = (s.studentId ?? '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || sid.includes(q);
  });

  if (loading) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-4">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  // Students already assigned to this advisor (to exclude from picker)
  const assignedIds = new Set(students.map(s => s.id));
  const pickerStudents = allStudents.filter(s => {
    if (assignedIds.has(s.id)) return false;
    if (!pickerSearch) return true;
    const q = pickerSearch.toLowerCase();
    const name = [s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ').toLowerCase();
    return name.includes(q) || (s.studentId ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">

      {/* Student Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-primary">Assign Student</span>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600"><RiCloseLine size={20} /></button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
                <RiSearchLine size={14} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {pickerLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              ) : pickerStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No students found</div>
              ) : pickerStudents.map(s => {
                const name = [s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ') || s.studentId || 'Unknown';
                return (
                  <div key={s.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{name}</p>
                      <p className="text-xs text-gray-400">{s.studentId ?? '—'}</p>
                    </div>
                    <button
                      onClick={() => handleAssignStudent(s)}
                      disabled={assigning === s.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition shrink-0"
                    >
                      {assigning === s.id ? '…' : 'Assign'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">Edit Advisor</h1>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT: Personal Information Form */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-5">
            <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Personal Information</p>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {(firstName[0] ?? '') + (lastName[0] ?? '')}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                <RiUpload2Line size={15} />
                Upload New Photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Prefix */}
              <div ref={prefixRef} className="flex flex-col gap-1 relative">
                <label className="text-xs font-medium text-primary/50">Prefix</label>
                <button
                  onClick={() => setOpenPrefix(prev => !prev)}
                  className="group w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary"
                >
                  {prefix || '— Select —'}
                  <span className={clsx('text-gray-400 text-2xl transition-all duration-200 group-hover:text-primary', openPrefix && 'rotate-180')}>
                    <RiArrowDropDownLine />
                  </span>
                </button>
                {openPrefix && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    {PREFIXES.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPrefix(p); setOpenPrefix(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm hover:bg-primary/10', prefix === p ? 'text-primary font-medium' : 'text-gray-600')}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* First Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Middle Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  placeholder="(optional)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors placeholder-gray-300"
                />
              </div>

              {/* Tel */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Tel No.</label>
                <input
                  type="text"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Nationality */}
              <div ref={nationalityRef} className="flex flex-col gap-1 md:col-span-2 relative">
                <label className="text-xs font-medium text-primary/50">Nationality</label>
                <button
                  onClick={() => setOpenNationality(prev => !prev)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
                >
                  {nationality || '— Select —'}
                  <span className={clsx('text-gray-400 text-2xl transition-all duration-200', openNationality && 'rotate-180')}>
                    <RiArrowDropDownLine />
                  </span>
                </button>
                {openNationality && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {NATIONALITIES.map(n => (
                      <button
                        key={n}
                        onClick={() => { setNationality(n); setOpenNationality(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors', nationality === n ? 'text-primary font-medium' : 'text-gray-600')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" label="Cancel" onClick={() => router.back()} />
            <Button variant="primary" label={saving ? 'Saving…' : 'Save Changes'} onClick={handleSave} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-5">

          {/* Tasks Overview */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Tasks Overview</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Students', value: students.length },
                { label: 'Done Request', value: '—' },
                { label: 'Request To Do', value: '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1">
                  <p className="text-xl font-bold text-primary">{value}</p>
                  <p className="text-xs text-gray-400 text-center leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Students */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Assigned Students</p>
              <button onClick={openPicker} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <RiAddLine size={14} />
                Add Students
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-primary transition-colors">
              <RiSearchLine size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Student List */}
            <div className="flex flex-col gap-2">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No students assigned</p>
              ) : (
                filteredStudents.map(s => {
                  const name = [s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ') || s.studentId || 'Unknown';
                  return (
                    <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.studentId ?? ''}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(s.id)}
                        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
                      >
                        <RiDeleteBinLine size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
