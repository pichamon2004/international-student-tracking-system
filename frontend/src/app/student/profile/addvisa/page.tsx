'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const VISA_TYPES = ['ED', 'Non-ED', 'Tourist', 'Transit', 'Business', 'Other'];
const SEX_OPTIONS = ['M', 'F'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const PASSPORT_OPTIONS = ['E12345678', 'A98765432'];

const UPLOAD_SLOTS = [
  { key: 'visa' as const,     title: 'Upload  Image Latest Visa\npermission / Sticker' },
  { key: 'arrival' as const,  title: 'Upload  Image Latest  admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed' as const, title: 'Upload  Image Latest  Departed\n(Departure from Thailand)' },
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

type UploadKey = 'visa' | 'arrival' | 'departed';

export default function VisaPage() {
  const router = useRouter();

  const visaRef     = useRef<HTMLInputElement>(null);
  const arrivalRef  = useRef<HTMLInputElement>(null);
  const departedRef = useRef<HTMLInputElement>(null);
  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa: visaRef, arrival: arrivalRef, departed: departedRef,
  };

  const [images, setImages] = useState<Record<UploadKey, string | null>>({
    visa: null, arrival: null, departed: null,
  });

  const [form, setForm] = useState({
    passport: '', placeOfIssue: '',
    validFrom: '', validUntil: '',
    visaType: '', numberOfEntries: '',
    sex: '', givenName: '', surname: '',
    dateOfBirth: '', nationality: '', remarks: '',
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
        <h1 className="text-2xl font-semibold text-primary">Add My Visa</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {UPLOAD_SLOTS.map(({ key, title }) => (
            <div
              key={key}
              onClick={() => refs[key].current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-60 bg-gray-50 p-4 text-center"
            >
              {images[key] ? (
                <img src={images[key]!} alt={key} className="w-full h-full object-contain rounded-xl max-h-36" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                  
                  <p className="text-sm font-medium text-gray-500 whitespace-pre-line">{title}</p>
                  <p className="text-xs">Drop file here or click to upload</p>
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
