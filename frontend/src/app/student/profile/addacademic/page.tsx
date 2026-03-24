'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload, FiX } from 'react-icons/fi';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

const DOC_TYPES = ['Transcript', 'Degree Certificate', 'Enrollment Certificate', 'Other'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function AcademicPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({ docType: '', institution: '', issueDate: '' });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...urls]);
  }

  function removeImage(i: number) {
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
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
        <h1 className="text-2xl font-semibold text-primary">Academic Document</h1>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Document Type">
            <select value={form.docType} onChange={set('docType')} className={selectCls}>
              <option value="">Select Type</option>
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Institution">
            <input value={form.institution} onChange={set('institution')} placeholder="e.g. Khon Kaen University" className={inputCls} />
          </Field>
          <Field label="Issue Date">
            <input value={form.issueDate} onChange={set('issueDate')} type="date" className={inputCls} />
          </Field>
        </div>

        <hr className="border-gray-100" />

        {/* Upload */}
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Document Images</label>
          <div className="flex flex-wrap gap-3">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt={`Doc ${i + 1}`} className="w-40 h-52 object-cover rounded-xl border border-gray-200" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <FiX size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-96 h-60 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition text-sm"
            >
              
              Upload image Document
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple onChange={handleFiles} className="hidden" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('academicDocumentCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
