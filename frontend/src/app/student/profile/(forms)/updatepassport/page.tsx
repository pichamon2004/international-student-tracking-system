'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'United States', 'United Kingdom', 'Other'];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary appearance-none';
const labelCls = 'text-xs font-medium text-primary mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function fmtDate(val: string) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sexFromPrefix(prefix: string) {
  return prefix === 'Mr.' ? 'M' : prefix ? 'F' : '—';
}

const MOCK_PASSPORTS = [
  {
    id: 1,
    passportNo: 'UA51234567',
    prefix: 'Miss',
    givenName: 'Pichamon',
    middleName: '',
    surname: 'Phongphrathapet',
    nationality: 'Thai',
    nationalityId: '1123100110110',
    placeOfBirth: 'Khon Kaen',
    country: 'Thailand',
    birthDate: '1998-03-15',
    dateOfIssue: '2020-06-01',
    expiryDate: '2030-05-31',
    image: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg',
  },
];

function PassportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;
  const existing = isEdit ? MOCK_PASSPORTS.find(p => p.id === Number(id)) ?? null : null;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existing?.image ?? null);

  const [form, setForm] = useState({
    passportNo:    existing?.passportNo    ?? '',
    prefix:        existing?.prefix        ?? '',
    surname:       existing?.surname       ?? '',
    middleName:    existing?.middleName    ?? '',
    givenName:     existing?.givenName     ?? '',
    nationality:   existing?.nationality   ?? '',
    nationalityId: existing?.nationalityId ?? '',
    placeOfBirth:  existing?.placeOfBirth  ?? '',
    country:       existing?.country       ?? '',
    birthDate:     existing?.birthDate     ?? '',
    dateOfIssue:   existing?.dateOfIssue   ?? '',
    expiryDate:    existing?.expiryDate    ?? '',
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  const fullName = [form.prefix, form.givenName, form.middleName, form.surname].filter(Boolean).join(' ') || '—';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">
          {isEdit ? 'Edit Passport' : 'Add Passport'}
        </h1>
      </div>

      {/* Top: Upload + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-56 bg-gray-50"
        >
          {preview ? (
            <img src={preview} alt="Passport" className="w-full h-full object-contain rounded-2xl max-h-64" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400 select-none">
              <FiUpload size={32} />
              <p className="text-base font-medium text-gray-500">Upload Passport Image</p>
              <p className="text-sm">Drop file here or click to upload</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>

        {/* Passport preview card */}
        <div className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 bg-white shadow-sm text-sm min-h-56">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Country Code</span>
              <span className="text-sm font-medium text-gray-700">{form.country ? form.country.slice(0, 2).toUpperCase() : 'TH'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Passport No.</span>
              <span className="text-sm font-bold text-primary">{form.passportNo || 'UA51234567'}</span>
            </div>
          </div>
          <p className="text-base font-semibold text-gray-800">{fullName}</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Nationality</span>
              <span className="text-xs font-medium text-gray-700">{form.nationality || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Date of birth</span>
              <span className="text-xs font-medium text-gray-700">{fmtDate(form.birthDate)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Identification No.</span>
              <span className="text-xs font-medium text-gray-700">{form.nationalityId || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Sex</span>
              <span className="text-xs font-medium text-gray-700">{sexFromPrefix(form.prefix)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Place of birth</span>
              <span className="text-xs font-medium text-gray-700">{form.placeOfBirth || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Issuing Authority</span>
              <span className="text-xs font-medium text-gray-700">{form.country || '—'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Date of issue</span>
              <span className="text-xs font-medium text-gray-700">{fmtDate(form.dateOfIssue)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Date of Expiry</span>
              <span className="text-xs font-medium text-gray-700">{fmtDate(form.expiryDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Passport No">
            <input value={form.passportNo} onChange={set('passportNo')} placeholder="e.g. UA51234567" className={inputCls} />
          </Field>
          <Field label="Prefix">
            <div className="relative">
              <select value={form.prefix} onChange={set('prefix')} className={selectCls}>
                <option value="">— Select —</option>
                {PREFIXES.map(p => <option key={p}>{p}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
            </div>
          </Field>
          <Field label="Surname">
            <input value={form.surname} onChange={set('surname')} placeholder="Surname" className={inputCls} />
          </Field>
          <Field label="Given Name">
            <input value={form.givenName} onChange={set('givenName')} placeholder="Given Name" className={inputCls} />
          </Field>
          <Field label="Middle Name">
            <input value={form.middleName} onChange={set('middleName')} placeholder="Middle Name" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Nationality">
            <div className="relative">
              <select value={form.nationality} onChange={set('nationality')} className={selectCls}>
                <option value="">Select</option>
                {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
            </div>
          </Field>
          <Field label="Your National ID">
            <input value={form.nationalityId} onChange={set('nationalityId')} placeholder="ID Number" className={inputCls} />
          </Field>
          <Field label="Place of birth">
            <input value={form.placeOfBirth} onChange={set('placeOfBirth')} placeholder="City" className={inputCls} />
          </Field>
          <Field label="Country">
            <div className="relative">
              <select value={form.country} onChange={set('country')} className={selectCls}>
                <option value="">Select</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
            </div>
          </Field>
          <Field label="Date of birth">
            <input value={form.birthDate} onChange={set('birthDate')} type="date" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Date of issue">
            <input value={form.dateOfIssue} onChange={set('dateOfIssue')} type="date" className={inputCls} />
          </Field>
          <Field label="Date of expiry">
            <input value={form.expiryDate} onChange={set('expiryDate')} type="date" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('passportCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function PassportPage() {
  return (
    <Suspense>
      <PassportForm />
    </Suspense>
  );
}
