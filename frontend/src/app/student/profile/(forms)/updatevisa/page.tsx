'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const VISA_TYPES = ['ED', 'Non-ED', 'Tourist', 'Transit', 'Business', 'Other'];
const SEX_OPTIONS = ['M', 'F'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const PASSPORT_OPTIONS = ['UA51234567', 'E12345678', 'A98765432'];

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';

const UPLOAD_SLOTS: { key: UploadKey; title: string }[] = [
  { key: 'visa',      title: 'Upload Image Latest Visa\npermission / Sticker' },
  { key: 'arrival',   title: 'Upload Image Latest admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed',  title: 'Upload Image Latest Departed\n(Departure from Thailand)' },
  { key: 'passport',  title: 'Upload Passport Image' },
];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

const MOCK_VISAS = [
  {
    id: 1,
    passport: 'UA51234567',
    placeOfIssue: 'Bangkok',
    validFrom: '2024-01-01',
    validUntil: '2026-12-31',
    visaType: 'ED',
    numberOfEntries: 'Multiple',
    sex: 'F',
    givenName: 'Pichamon',
    surname: 'Phongphrathapet',
    dateOfBirth: '1998-03-15',
    nationality: 'Thai',
    remarks: 'Study purposes',
    images: { visa: null, arrival: null, departed: null, passport: null } as Record<UploadKey, string | null>,
  },
];

function VisaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;
  const existing = isEdit ? MOCK_VISAS.find(v => v.id === Number(id)) ?? null : null;

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa:      useRef<HTMLInputElement>(null),
    arrival:   useRef<HTMLInputElement>(null),
    departed:  useRef<HTMLInputElement>(null),
    passport:  useRef<HTMLInputElement>(null),
  };

  const [images, setImages] = useState<Record<UploadKey, string | null>>(
    existing?.images ?? { visa: null, arrival: null, departed: null, passport: null }
  );

  const [form, setForm] = useState({
    passport:        existing?.passport        ?? '',
    placeOfIssue:    existing?.placeOfIssue    ?? '',
    validFrom:       existing?.validFrom       ?? '',
    validUntil:      existing?.validUntil      ?? '',
    visaType:        existing?.visaType        ?? '',
    numberOfEntries: existing?.numberOfEntries ?? '',
    sex:             existing?.sex             ?? '',
    givenName:       existing?.givenName       ?? '',
    surname:         existing?.surname         ?? '',
    dateOfBirth:     existing?.dateOfBirth     ?? '',
    nationality:     existing?.nationality     ?? '',
    remarks:         existing?.remarks         ?? '',
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(slotKey: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setImages(prev => ({ ...prev, [slotKey]: URL.createObjectURL(file) }));
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
          {isEdit ? 'Edit Visa' : 'Add Visa'}
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Select Passport">
            <select value={form.passport} onChange={set('passport')} className={selectCls}>
              <option value=""></option>
              {PASSPORT_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Place of issue">
            <input value={form.placeOfIssue} onChange={set('placeOfIssue')} className={inputCls} />
          </Field>
          <Field label="Valid From">
            <input value={form.validFrom} onChange={set('validFrom')} type="date" className={inputCls} />
          </Field>
          <Field label="Valid Until">
            <input value={form.validUntil} onChange={set('validUntil')} type="date" className={inputCls} />
          </Field>
          <Field label="Type of Visa / Category">
            <select value={form.visaType} onChange={set('visaType')} className={selectCls}>
              <option value=""></option>
              {VISA_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Number of Entries">
            <input value={form.numberOfEntries} onChange={set('numberOfEntries')} className={inputCls} />
          </Field>
          <Field label="Sex">
            <select value={form.sex} onChange={set('sex')} className={selectCls}>
              <option value=""></option>
              {SEX_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Given Name">
            <input value={form.givenName} onChange={set('givenName')} className={inputCls} />
          </Field>
          <Field label="Surname">
            <input value={form.surname} onChange={set('surname')} className={inputCls} />
          </Field>
          <Field label="Date of Birth">
            <input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Nationality">
            <select value={form.nationality} onChange={set('nationality')} className={selectCls}>
              <option value=""></option>
              {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Remarks">
            <input value={form.remarks} onChange={set('remarks')} className={inputCls} />
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
                <img src={images[key]!} alt={key} className="w-full h-full object-contain rounded-xl max-h-28" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                  <FiUpload size={20} />
                  <p className="text-xs font-medium text-gray-500 whitespace-pre-line">{title}</p>
                  <p className="text-[11px]">Drop file here or click to upload</p>
                </div>
              )}
              <input ref={refs[key]} type="file" accept="image/*" onChange={handleFile(key)} className="hidden" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('visaCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function VisaPage() {
  return (
    <Suspense>
      <VisaForm />
    </Suspense>
  );
}
