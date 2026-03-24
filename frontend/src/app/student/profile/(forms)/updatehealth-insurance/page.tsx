'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function HealthInsurancePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: '', policyNo: '', coverage: '',
    validFrom: '', validUntil: '',
  });

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
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
        <h1 className="text-2xl font-semibold text-primary">Update My Health Insurance</h1>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Insurance Company Name">
            <input value={form.provider} onChange={set('provider')} placeholder="e.g. Krungthai-AXA" className={inputCls} />
          </Field>
          <Field label="Policy No.">
            <input value={form.policyNo} onChange={set('policyNo')} placeholder="Policy Number" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Coverage Amount (THB)">
            <input value={form.coverage} onChange={set('coverage')} placeholder="e.g. 40,000" className={inputCls} />
          </Field>
          <Field label="Start Date">
            <input value={form.validFrom} onChange={set('validFrom')} type="date" className={inputCls} />
          </Field>
          <Field label="End date">
            <input value={form.validUntil} onChange={set('validUntil')} type="date" className={inputCls} />
          </Field>
        </div>

        <hr className="border-gray-100" />

        {/* Upload */}
        <div className="grid grid-cols-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-primary/50 transition min-h-60 bg-gray-50 p-4 text-center"
          >
            {preview ? (
              <img src={preview} alt="Insurance" className="w-full object-contain rounded-xl max-h-48" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                <FiUpload size={24} />
                <p className="text-sm font-medium text-gray-500">Upload Insurance Card / Document Image</p>
                <p className="text-xs">Drop file here or click to upload</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('healthInsuranceCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
