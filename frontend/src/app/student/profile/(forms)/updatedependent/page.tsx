'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

const UPLOAD_SLOTS: { key: UploadKey; title: string }[] = [
  { key: 'visa',     title: 'Upload Image Latest Visa\npermission / Sticker' },
  { key: 'arrival',  title: 'Upload Image Latest admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed', title: 'Upload Image Latest Departed\n(Departure from Thailand)' },
  { key: 'passport', title: 'Upload Passport Image' },
];

const MOCK_DEPENDENTS = [
  {
    id: 1,
    prefix: 'Mrs.',
    firstName: 'Malee',
    middleName: '',
    lastName: 'Phongphrathapet',
    email: 'malee@gmail.com',
    relationship: 'Parent',
    phone: '+66 81 111 2222',
    visaExpiry: '2024-12-31',
    images: { visa: null, arrival: null, departed: null, passport: 'https://wacinfotech.com/images/OS550/passport-thai-mrp.jpg' } as Record<UploadKey, string | null>,
  },
];

function DependentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;
  const existing = isEdit ? MOCK_DEPENDENTS.find(d => d.id === Number(id)) ?? null : null;

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa:     useRef<HTMLInputElement>(null),
    arrival:  useRef<HTMLInputElement>(null),
    departed: useRef<HTMLInputElement>(null),
    passport: useRef<HTMLInputElement>(null),
  };

  const [images, setImages] = useState<Record<UploadKey, string | null>>(
    existing?.images ?? { visa: null, arrival: null, departed: null, passport: null }
  );

  const [form, setForm] = useState({
    prefix:       existing?.prefix       ?? '',
    firstName:    existing?.firstName    ?? '',
    middleName:   existing?.middleName   ?? '',
    lastName:     existing?.lastName     ?? '',
    email:        existing?.email        ?? '',
    relationship: existing?.relationship ?? '',
    phone:        existing?.phone        ?? '',
    visaExpiry:   existing?.visaExpiry   ?? '',
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(key: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setImages(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    };
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6 flex-1">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">
          {isEdit ? 'Edit Dependent' : 'Add Dependent'}
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Prefix">
            <select value={form.prefix} onChange={set('prefix')} className={selectCls}>
              <option value="">— Select —</option>
              {PREFIXES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="First Name">
            <input value={form.firstName} onChange={set('firstName')} placeholder="First Name" className={inputCls} />
          </Field>
          <Field label="Middle Name">
            <input value={form.middleName} onChange={set('middleName')} placeholder="Middle Name" className={inputCls} />
          </Field>
          <Field label="Last Name">
            <input value={form.lastName} onChange={set('lastName')} placeholder="Last Name" className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Relationship">
            <input value={form.relationship} onChange={set('relationship')} placeholder="e.g. Parent, Spouse" className={inputCls} />
          </Field>
          <Field label="Phone No.">
            <input value={form.phone} onChange={set('phone')} placeholder="+66 xx xxx xxxx" className={inputCls} />
          </Field>
          <Field label="Visa Expiry Date">
            <input value={form.visaExpiry} onChange={set('visaExpiry')} type="date" className={inputCls} />
          </Field>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {UPLOAD_SLOTS.map(({ key, title }) => (
            <div
              key={key}
              onClick={() => refs[key].current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-36 bg-gray-50 p-4 text-center"
            >
              {images[key] ? (
                <img src={images[key]!} alt={key} className="w-full object-contain rounded-xl max-h-28" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                  <FiUpload size={20} />
                  <p className="text-xs font-medium text-gray-500 whitespace-pre-line">{title}</p>
                  <p className="text-[11px]">Drop file here or click to upload</p>
                </div>
              )}
              <input ref={refs[key]} type="file" accept="image/*" onChange={handleFile(key)} onClick={e => e.stopPropagation()} className="hidden" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('dependentCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function DependentPage() {
  return (
    <Suspense>
      <DependentForm />
    </Suspense>
  );
}
