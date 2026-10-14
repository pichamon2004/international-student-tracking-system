'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine, RiUploadLine, RiInformationLine, RiDeleteBinLine } from 'react-icons/ri';
import { studentMeApi, healthInsuranceApi, type ApiHealthInsurance } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';
import { Field, Section, inputCls } from '@/components/profile/FormUI';
import { fmtDate } from '@/components/profile/ProfileUI';

const COVERAGE_TYPES = [
  'Inpatient (IPD)',
  'Inpatient + Outpatient (IPD/OPD)',
  'Accident',
  'Comprehensive',
  'Other',
];

const MAX_FILE_MB = 5; // backend uploadImage limit (upload.middleware.ts)

/* Card upload drop zone — click or drag a file in */
function CardUpload({ preview, hint, onFile, onClear }: {
  preview: string | null; hint: string; onFile: (file: File) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`aspect-[16/9] rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition ${
          dragOver ? 'border-primary bg-primary/5' : 'border-primary/25 bg-[#F3F7FD] hover:border-primary/50'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Insurance card" className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <span className="w-9 h-9 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm">
              <RiUploadLine size={18} />
            </span>
            <span className="text-sm font-semibold text-primary">Click to upload or drag a file here</span>
            <span className="text-[11px] text-gray-500">{hint}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = ''; // allow picking the same file again after clearing
          }}
        />
      </div>
      {preview && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex-1 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition">
            Replace
          </button>
          <button type="button" onClick={onClear} title="Remove"
            className="w-8 h-8 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition">
            <RiDeleteBinLine size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

type Side = 'front' | 'back';

function HealthInsuranceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const [form, setForm] = useState({ provider: '', policyNo: '', coverage: '', validFrom: '', validUntil: '' });
  // Preview shown in each slot; `files` holds newly picked files, `cleared` marks removed ones
  const [previews, setPreviews] = useState<Record<Side, string | null>>({ front: null, back: null });
  const [files, setFiles] = useState<Record<Side, File | null>>({ front: null, back: null });
  const [cleared, setCleared] = useState<Record<Side, boolean>>({ front: false, back: false });

  const [currentPolicy, setCurrentPolicy] = useState<ApiHealthInsurance | null>(null);
  const [visaExpiry, setVisaExpiry] = useState<string | null>(null);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      setVisaExpiry(s.visas?.[0]?.expiryDate ?? null);
      return healthInsuranceApi.getAll(s.id).then(hRes => {
        const all = hRes.data.data;
        setCurrentPolicy(all.find(h => h.isCurrent) ?? null);
        if (isEdit && id) {
          const ins = all.find(h => h.id === Number(id));
          if (ins) {
            setForm({
              provider:   ins.provider ?? '',
              policyNo:   ins.policyNumber ?? '',
              coverage:   ins.coverageType ?? '',
              validFrom:  ins.startDate ? ins.startDate.slice(0, 10) : '',
              validUntil: ins.expiryDate ? ins.expiryDate.slice(0, 10) : '',
            });
            setPreviews({ front: ins.fileUrl ?? null, back: ins.backFileUrl ?? null });
          }
        }
      });
    }).catch(() => {});
  }, [isEdit, id]);

  const setVal = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));
  const setText = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  function pickFile(side: Side, file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a JPG or PNG image');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File is larger than ${MAX_FILE_MB} MB`);
      return;
    }
    setFiles(prev => ({ ...prev, [side]: file }));
    setPreviews(prev => ({ ...prev, [side]: URL.createObjectURL(file) }));
    setCleared(prev => ({ ...prev, [side]: false }));
  }

  function clearFile(side: Side) {
    setFiles(prev => ({ ...prev, [side]: null }));
    setPreviews(prev => ({ ...prev, [side]: null }));
    setCleared(prev => ({ ...prev, [side]: true }));
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.provider.trim() || !form.policyNo.trim() || !form.coverage || !form.validFrom || !form.validUntil) {
      toast.error('Please fill in all required policy details');
      return;
    }
    if (form.validUntil <= form.validFrom) {
      toast.error('Coverage must end after it starts');
      return;
    }
    if (!previews.front) {
      toast.error('Please upload the front of your insurance card');
      return;
    }
    setSaving(true);
    try {
      const { default: api } = await import('@/lib/api');
      const upload = async (file: File | null): Promise<string | undefined> => {
        if (!file) return undefined;
        const fd = new FormData();
        fd.append('image', file);
        const res = await api.post(`/students/${studentNumId}/health-insurance/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data.url as string;
      };
      const [frontUrl, backUrl] = await Promise.all([upload(files.front), upload(files.back)]);

      const base = {
        provider:     form.provider.trim(),
        policyNumber: form.policyNo.trim(),
        coverageType: form.coverage,
        startDate:    form.validFrom,
        expiryDate:   form.validUntil,
      };

      let res;
      if (isEdit && id) {
        res = await healthInsuranceApi.update(studentNumId, Number(id), {
          ...base,
          ...(frontUrl !== undefined && { fileUrl: frontUrl }),
          ...(backUrl !== undefined ? { backFileUrl: backUrl } : cleared.back ? { backFileUrl: null } : {}),
        });
      } else {
        res = await healthInsuranceApi.create(studentNumId, {
          ...base,
          ...(frontUrl !== undefined && { fileUrl: frontUrl }),
          ...(backUrl !== undefined && { backFileUrl: backUrl }),
        });
      }

      if (res.status === 202) {
        toast.success('Change submitted — awaiting staff approval');
        router.push('/student/profile/health-insurance');
        return;
      }
      setProgressField('healthInsuranceCompleted', true);
      toast.success(isEdit ? 'Policy updated' : 'Policy added');
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // "Start on <current policy end> or earlier … end on or after your visa expiry"
  const tipParts = [
    !isEdit && currentPolicy && `start on ${fmtDate(currentPolicy.expiryDate)} or earlier so there is no gap in cover`,
    visaExpiry && `end on or after your visa expiry date (${fmtDate(visaExpiry)})`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* The card keeps its size; only the sections scroll */}
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition shrink-0"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-primary">{isEdit ? 'Edit policy' : 'Add new policy'}</h1>
            <p className="text-xs text-gray-500">Health insurance</p>
          </div>
          <p className="text-xs text-gray-500 pt-2 shrink-0"><span className="text-red-500">*</span> Required field</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 -mr-2 pr-2">
          {!isEdit && currentPolicy && (
            <div className="flex items-start gap-2 rounded-xl bg-[#F3F7FD] px-4 py-3 text-xs text-gray-700">
              <RiInformationLine size={15} className="text-primary shrink-0 mt-px" />
              <span>
                Once saved, this becomes your current policy. Your policy with <strong>{currentPolicy.provider}</strong>{' '}
                (ends {fmtDate(currentPolicy.expiryDate)}) moves to Policy history.
              </span>
            </div>
          )}

          {/* 1 · Policy details */}
          <Section n={1} title="Policy details" subtitle="Copy these from your insurance card or policy document.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Insurance provider" required>
                <input value={form.provider} onChange={setText('provider')} placeholder="e.g. company name on your card" className={inputCls} />
              </Field>
              <Field label="Policy number" required>
                <input value={form.policyNo} onChange={setText('policyNo')} placeholder="As shown on the card" className={inputCls} />
              </Field>
              <Field label="Coverage type" required>
                <CustomSelect
                  value={form.coverage}
                  onChange={setVal('coverage')}
                  // keep older free-text values selectable
                  options={form.coverage && !COVERAGE_TYPES.includes(form.coverage) ? [...COVERAGE_TYPES, form.coverage] : COVERAGE_TYPES}
                  placeholder="Select coverage"
                />
              </Field>
              <Field label="Coverage period" required className="sm:col-span-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <DateSelect value={form.validFrom} onChange={setVal('validFrom')} placeholder="From" />
                  <span className="text-gray-400">–</span>
                  <DateSelect value={form.validUntil} onChange={setVal('validUntil')} placeholder="Until" />
                </div>
                {tipParts.length > 0 && (
                  <p className="text-[11px] text-gray-500">Tip: {tipParts.join(', and ')}.</p>
                )}
              </Field>
            </div>
          </Section>

          {/* 2 · Insurance card */}
          <Section n={2} title="Insurance card" required subtitle={`JPG or PNG image, up to ${MAX_FILE_MB} MB each. The name and dates must be readable.`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              <Field label="Front of card" required>
                <CardUpload preview={previews.front} hint={`JPG or PNG · max ${MAX_FILE_MB} MB`}
                  onFile={f => pickFile('front', f)} onClear={() => clearFile('front')} />
              </Field>
              <Field label="Back of card" optional>
                <CardUpload preview={previews.back} hint="Useful if it lists the coverage or hotline"
                  onFile={f => pickFile('back', f)} onClear={() => clearFile('back')} />
              </Field>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save policy'}
          </button>
        </div>
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
