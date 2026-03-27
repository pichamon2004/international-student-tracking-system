'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { studentApi, studentMeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.'];

const COUNTRIES = [
  'Afghanistan', 'Bangladesh', 'Cambodia', 'China', 'India', 'Indonesia', 'Japan',
  'Laos', 'Malaysia', 'Mongolia', 'Myanmar', 'Nepal', 'Pakistan', 'Philippines',
  'South Korea', 'Sri Lanka', 'Taiwan', 'Thailand', 'Vietnam',
  'Australia', 'France', 'Germany', 'United Kingdom', 'United States', 'Other',
];

const PROGRAMS = [
  'M.Sc. Computer Science and Information Technology',
  'M.Sc. Data Science and Artificial Intelligence (International Program)',
  'M.Sc. Geo-Informatics',
  'Ph.D. Computer Science and Information Technology (International Program)',
  'Ph.D. Geo-Informatics',
];

const DEGREES = [
  { value: 'BACHELOR', label: "Bachelor's Degree" },
  { value: 'MASTER',   label: "Master's Degree" },
  { value: 'PHD',      label: 'Doctoral Degree (Ph.D.)' },
];

const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const labelCls  = 'text-xs font-semibold text-primary mb-1 block';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function StudentRegisterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [reEntry, setReEntry] = useState(false);
  const [form, setForm] = useState({
    titleEn:     '',
    firstNameEn: '',
    middleNameEn:'',
    lastNameEn:  '',
    homeCountry: '',
    program:     '',
    level:       '',
    dateOfBirth: '',
  });

  // Pre-fill name fields from staff-created student record
  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setForm(prev => ({
        ...prev,
        titleEn:     s.titleEn      ?? '',
        firstNameEn: s.firstNameEn  ?? '',
        middleNameEn:s.middleNameEn ?? '',
        lastNameEn:  s.lastNameEn   ?? '',
      }));
    }).catch(() => {/* ignore – fields stay empty */});
  }, []);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSend() {
    if (!form.firstNameEn || !form.lastNameEn || !form.dateOfBirth) {
      toast.error('Please fill in First Name, Last Name, and Birth Date');
      return;
    }
    setSaving(true);
    try {
      await studentApi.registerPhase1({
        titleEn:      form.titleEn      || undefined,
        firstNameEn:  form.firstNameEn,
        middleNameEn: form.middleNameEn || undefined,
        lastNameEn:   form.lastNameEn,
        homeCountry:  form.homeCountry  || undefined,
        program:      form.program      || undefined,
        level:        (form.level as 'BACHELOR' | 'MASTER' | 'PHD') || undefined,
        dateOfBirth:  new Date(form.dateOfBirth).toISOString(),
      });
      toast.success('Registration submitted! Waiting for staff approval.');
      router.replace('/student/pending');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to submit registration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      {/* Modal-style card */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 flex flex-col gap-5">

        <h2 className="text-2xl font-bold text-primary">Create Account</h2>

        {/* Row 1: Prefix / First / Middle */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prefix">
            <CustomSelect value={form.titleEn} onChange={(val) => setForm(p => ({ ...p, titleEn: val }))} options={PREFIXES} placeholder="— Select —" />
          </Field>
          <Field label="First Name">
            <input value={form.firstNameEn} onChange={set('firstNameEn')} placeholder="First Name" className={inputCls} />
          </Field>
          <Field label="Middle Name">
            <input value={form.middleNameEn} onChange={set('middleNameEn')} placeholder="Middle Name" className={inputCls} />
          </Field>
        </div>

        {/* Row 2: Last Name */}
        <div className="grid grid-cols-1 gap-3">
          <Field label="Last Name">
            <input value={form.lastNameEn} onChange={set('lastNameEn')} placeholder="Last Name" className={inputCls} />
          </Field>
        </div>

        {/* Row 3: Country / Program */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            <CustomSelect value={form.homeCountry} onChange={(val) => setForm(p => ({ ...p, homeCountry: val }))} options={COUNTRIES} placeholder="Select Country" />
          </Field>
          <Field label="Program">
            <CustomSelect value={form.program} onChange={(val) => setForm(p => ({ ...p, program: val }))} options={PROGRAMS} placeholder="Select Program" />
          </Field>
        </div>

        {/* Row 4: Degree / Birth Date */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Degree">
            <CustomSelect value={form.level} onChange={(val) => setForm(p => ({ ...p, level: val }))} options={DEGREES} placeholder="Select Degree" />
          </Field>
          <Field label="Birth Date">
            <DateSelect value={form.dateOfBirth} onChange={(v) => setForm(p => ({ ...p, dateOfBirth: v }))} />
          </Field>
        </div>

        {/* Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reEntry}
            onChange={e => setReEntry(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-gray-600">I have already applied for a re-entry permit</span>
        </label>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={saving}
            className="bg-primary text-white font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Sending…' : 'Send'}
          </button>
        </div>

      </div>
    </div>
  );
}
