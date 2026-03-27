'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';
import { studentMeApi, healthInsuranceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import DateSelect from '@/components/ui/DateSelect';

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

function HealthInsuranceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: '', policyNo: '', coverage: '',
    validFrom: '', validUntil: '',
  });
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      if (isEdit && id) {
        return healthInsuranceApi.getAll(s.id).then(hRes => {
          const ins = hRes.data.data.find(h => h.id === Number(id));
          if (ins) {
            setForm({
              provider:  ins.provider ?? '',
              policyNo:  ins.policyNumber ?? '',
              coverage:  ins.coverageType ?? '',
              validFrom: ins.startDate ? ins.startDate.slice(0, 10) : '',
              validUntil: ins.expiryDate ? ins.expiryDate.slice(0, 10) : '',
            });
            if (ins.fileUrl) setPreview(ins.fileUrl);
          }
        });
      }
    }).catch(() => {});
  }, [isEdit, id]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.provider || !form.validFrom || !form.validUntil) {
      toast.error('Please fill in Provider, Start Date, and End Date');
      return;
    }
    setSaving(true);
    try {
      // Upload insurance image if a new file was selected
      let fileUrl: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const { default: api } = await import('@/lib/api');
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await api.post(`/students/${studentNumId}/health-insurance/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = uploadRes.data.data.url;
      }

      if (isEdit && id) {
        await healthInsuranceApi.update(studentNumId, Number(id), {
          provider:     form.provider,
          policyNumber: form.policyNo || undefined,
          coverageType: form.coverage || undefined,
          startDate:    form.validFrom,
          expiryDate:   form.validUntil,
          ...(fileUrl !== undefined && { fileUrl }),
        });
      } else {
        await healthInsuranceApi.create(studentNumId, {
          provider:     form.provider,
          policyNumber: form.policyNo || undefined,
          coverageType: form.coverage || undefined,
          startDate:    form.validFrom,
          expiryDate:   form.validUntil,
          ...(fileUrl !== undefined && { fileUrl }),
        });
      }
      setProgressField('healthInsuranceCompleted', true);
      toast.success(isEdit ? 'Health insurance updated' : 'Health insurance added');
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
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
          {isEdit ? 'Edit Health Insurance' : 'Update My Health Insurance'}
        </h1>
      </div>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Insurance Company Name *">
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
          <Field label="Start Date *">
            <DateSelect value={form.validFrom} onChange={(v) => setForm(p => ({ ...p, validFrom: v }))} />
          </Field>
          <Field label="End Date *">
            <DateSelect value={form.validUntil} onChange={(v) => setForm(p => ({ ...p, validUntil: v }))} />
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
          disabled={saving}
          onClick={handleSave}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function HealthInsurancePage() {
  return (
    <Suspense>
      <HealthInsuranceForm />
    </Suspense>
  );
}
