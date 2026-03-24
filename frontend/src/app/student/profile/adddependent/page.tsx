'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FaPlus } from 'react-icons/fa6';
import { FiTrash2, FiUpload } from 'react-icons/fi';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

interface Dependent {
  id: number;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  relationship: string;
  phone: string;
  visaExpiry: string;
  images: Record<UploadKey, string | null>;
}

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

const emptyForm = { prefix: '', firstName: '', middleName: '', lastName: '', email: '', relationship: '', phone: '', visaExpiry: '' };

const UPLOAD_SLOTS = [
  { key: 'visa' as const,     title: 'Upload  Image Latest Visa\npermission / Sticker' },
  { key: 'arrival' as const,  title: 'Upload  Image Latest  admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed' as const, title: 'Upload  Image Latest  Departed\n(Departure from Thailand)' },
  { key: 'passport' as const, title: 'Upload  Passport Image' },
];

const emptyImages: Record<UploadKey, string | null> = { visa: null, arrival: null, departed: null, passport: null };

export default function DependentPage() {
  const router = useRouter();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [form, setForm] = useState(emptyForm);

  const visaRef     = useRef<HTMLInputElement>(null);
  const arrivalRef  = useRef<HTMLInputElement>(null);
  const departedRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);
  const uploadRefs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa: visaRef, arrival: arrivalRef, departed: departedRef, passport: passportRef,
  };
  const [images, setImages] = useState<Record<UploadKey, string | null>>(emptyImages);

  function handleFile(key: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setImages(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    };
  }

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function addDependent() {
    if (!form.firstName) return;
    setDependents(prev => [...prev, { ...form, id: Date.now(), images }]);
    setForm(emptyForm);
    setImages(emptyImages);
  }

  function remove(id: number) {
    setDependents(prev => prev.filter(d => d.id !== id));
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
        <h1 className="text-2xl font-semibold text-primary">Add My Dependent Information</h1>
      </div>

      {/* Add form */}
      <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-sm font-semibold text-primary">Add Dependent</p>
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
            <input value={form.relationship} onChange={set('relationship')} placeholder="Advisor, Faculty Staff" className={inputCls} />
          </Field>
          <Field label="Phone No.">
            <input value={form.phone} onChange={set('phone')} placeholder="+66 xx xxx xxxx" className={inputCls} />
          </Field>
          <Field label="Visa Expiry Date">
            <input value={form.visaExpiry} onChange={set('visaExpiry')} type="date" className={inputCls} />
          </Field>
        </div>
        {/* Upload slots inside form */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {UPLOAD_SLOTS.slice(0, 3).map(({ key, title }) => (
            <div
              key={key}
              onClick={() => uploadRefs[key].current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-36 bg-white p-4 text-center"
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
              <input ref={uploadRefs[key]} type="file" accept="image/*" onChange={handleFile(key)} onClick={e => e.stopPropagation()} className="hidden" />
            </div>
          ))}
          <div
            onClick={() => uploadRefs.passport.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-36 bg-white p-4 text-center"
          >
            {images.passport ? (
              <img src={images.passport} alt="passport" className="w-full object-contain rounded-xl max-h-28" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                <FiUpload size={20} />
                <p className="text-xs font-medium text-gray-500">Upload  Passport Image</p>
                <p className="text-[11px]">Drop file here or click to upload</p>
              </div>
            )}
            <input ref={uploadRefs.passport} type="file" accept="image/*" onChange={handleFile('passport')} onClick={e => e.stopPropagation()} className="hidden" />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={addDependent}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-primary/90 transition"
          >
            <FaPlus size={13} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      {dependents.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">Dependents ({dependents.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Name</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Relationship</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Phone No.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Visa Expiry</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-primary/60">Documents</th>
                  <th className="sticky right-0 bg-white py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {dependents.map(d => (
                  <tr key={d.id} className="border-b border-gray-100 last:border-none">
                    <td className="py-2.5 px-3 font-medium text-primary">{[d.prefix, d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ')}</td>
                    <td className="py-2.5 px-3 text-gray-500">{d.email}</td>
                    <td className="py-2.5 px-3 text-gray-500">{d.relationship}</td>
                    <td className="py-2.5 px-3 text-gray-500">{d.phone}</td>
                    <td className="py-2.5 px-3 text-gray-500">{d.visaExpiry || '—'}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        {(Object.entries(d.images) as [UploadKey, string | null][]).filter(([, url]) => url).map(([key, url]) => (
                          <img key={key} src={url!} alt={key} title={key} className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                        ))}
                        {Object.values(d.images).every(v => !v) && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="sticky right-0 bg-white py-2.5 px-3">
                      <button onClick={() => remove(d.id)} className="text-red-400 hover:text-red-600 transition">
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">No dependents added yet.</p>
      )}

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
