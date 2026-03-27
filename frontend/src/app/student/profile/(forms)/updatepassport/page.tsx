'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload, FiLoader } from 'react-icons/fi';
import { studentMeApi, passportApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'United States', 'United Kingdom', 'Other'];

// MRZ 3-letter country/nationality code → dropdown value
const MRZ_NATIONALITY: Record<string, string> = {
  THA: 'Thai', CHN: 'Chinese', JPN: 'Japanese', VNM: 'Vietnamese',
  MMR: 'Myanmar', KHM: 'Cambodian', LAO: 'Laotian', IDN: 'Indonesian',
  USA: 'American', GBR: 'British', KOR: 'Other', IND: 'Other',
};
const MRZ_COUNTRY: Record<string, string> = {
  THA: 'Thailand', CHN: 'China', JPN: 'Japan', VNM: 'Vietnam',
  MMR: 'Myanmar', KHM: 'Cambodia', LAO: 'Laos', IDN: 'Indonesia',
  USA: 'United States', GBR: 'United Kingdom',
};

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

function fmtDate(val: string) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sexFromPrefix(prefix: string) {
  return prefix === 'Mr.' ? 'M' : prefix ? 'F' : '—';
}

function PassportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [form, setForm] = useState({
    passportNo:    '',
    prefix:        '',
    surname:       '',
    givenName:     '',
    middleName:    '',
    nationality:   '',
    nationalityId: '',
    placeOfBirth:  '',
    country:       '',
    birthDate:     '',
    dateOfIssue:   '',
    expiryDate:    '',
  });

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);

      setForm(prev => ({
        ...prev,
        prefix:      s.titleEn ?? '',
        givenName:   s.firstNameEn ?? '',
        middleName:  s.middleNameEn ?? '',
        surname:     s.lastNameEn ?? '',
        nationality: s.nationality ?? '',
        country:     s.homeCountry ?? '',
        birthDate:   s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
      }));

      const passport = s.passports?.[0];
      if (passport) {
        setForm(prev => ({
          ...prev,
          passportNo:  passport.passportNumber ?? '',
          country:     passport.issuingCountry ?? prev.country,
          dateOfIssue: passport.issueDate ? passport.issueDate.slice(0, 10) : '',
          expiryDate:  passport.expiryDate ? passport.expiryDate.slice(0, 10) : '',
        }));
        if (passport.imageUrl?.startsWith('http')) setPreview(passport.imageUrl);
      }
    }).catch((err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to load passport data');
    });
  }, [isEdit, id]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));

    // Auto OCR scan
    if (!studentNumId) return;
    setScanning(true);
    try {
      const { default: api } = await import('@/lib/api');
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post(`/students/${studentNumId}/passport/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data.data;

      if (d.method === 'none') {
        toast('Could not read passport data — please fill in manually', { icon: '⚠️' });
        return;
      }

      // Map MRZ codes → dropdown values
      const nat = d.nationality ? (MRZ_NATIONALITY[d.nationality] ?? 'Other') : '';
      const cty = d.issuingCountry ? (MRZ_COUNTRY[d.issuingCountry] ?? '') : '';

      setForm(prev => ({
        ...prev,
        passportNo:    d.passportNumber  || prev.passportNo,
        surname:       d.lastName        || prev.surname,
        givenName:     d.firstName       || prev.givenName,
        nationality:   nat               || prev.nationality,
        country:       cty               || prev.country,
        birthDate:     d.dateOfBirth     || prev.birthDate,
        expiryDate:    d.expiryDate      || prev.expiryDate,
        // VIZ fields (Tesseract from visual zone)
        dateOfIssue:   d.dateOfIssue     || prev.dateOfIssue,
        placeOfBirth:  d.placeOfBirth    || prev.placeOfBirth,
        nationalityId: d.personalNo      || prev.nationalityId,
        // Map sex to prefix if not already set
        prefix: prev.prefix || (d.sex === 'M' ? 'Mr.' : d.sex === 'F' ? 'Ms.' : ''),
      }));

      const confidence = d.confidence ?? 0;
      if (confidence >= 70) {
        toast.success(`Passport scanned (${d.method}) — confidence ${confidence}%`);
      } else {
        toast(`Partial scan (${confidence}%) — please verify fields`, { icon: '⚠️' });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'OCR scan failed — please fill in manually');
    } finally {
      setScanning(false);
    }
  }

  const fullName = [form.prefix, form.givenName, form.middleName, form.surname].filter(Boolean).join(' ') || '—';

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.passportNo || !form.country || !form.dateOfIssue || !form.expiryDate) {
      toast.error('Please fill in Passport No., Issuing Country, Issue Date, and Expiry Date');
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('image', selectedFile);
          const { default: api } = await import('@/lib/api');
          const uploadRes = await api.post(`/students/${studentNumId}/passport/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          imageUrl = uploadRes.data.data.url;
        } catch (uploadErr: unknown) {
          const uploadMsg = (uploadErr as { response?: { data?: { message?: string } } })?.response?.data?.message;
          toast.error(`Image upload failed: ${uploadMsg || 'check R2 config'}`);
        }
      }

      await passportApi.upsert(studentNumId, {
        passportNumber: form.passportNo,
        issuingCountry: form.country,
        issueDate:      form.dateOfIssue,
        expiryDate:     form.expiryDate,
        placeOfIssue:   form.placeOfBirth || undefined,
        isCurrent:      true,
        imageUrl,
      });
      setProgressField('passportCompleted', true);
      toast.success(isEdit ? 'Passport updated' : 'Passport saved');
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
        <div className="flex flex-col gap-2">
          <div
            onClick={() => !scanning && fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition min-h-56 bg-gray-50 ${scanning ? 'border-primary/50 cursor-wait' : 'border-gray-300 cursor-pointer hover:border-primary/50'}`}
          >
            {scanning ? (
              <div className="flex flex-col items-center gap-3 text-primary select-none">
                <FiLoader size={32} className="animate-spin" />
                <p className="text-base font-medium">Scanning passport…</p>
                <p className="text-sm text-gray-400">Using OCR to read data</p>
              </div>
            ) : preview ? (
              <img
                src={preview}
                alt="Passport"
                className="w-full h-full object-contain rounded-2xl max-h-64"
                onError={() => setPreview(null)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400 select-none">
                <FiUpload size={32} />
                <p className="text-base font-medium text-gray-500">Upload Passport Image</p>
                <p className="text-sm text-center px-4">Click to upload — system will auto-read passport data</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFile} className="hidden" />
          </div>
          {preview && !scanning && (
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-primary underline text-center"
            >
              Change image
            </button>
          )}
        </div>

        {/* Passport preview card */}
        <div className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-3 bg-white shadow-sm text-sm min-h-56">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Country Code</span>
              <span className="text-sm font-medium text-gray-700">{form.country ? form.country.slice(0, 2).toUpperCase() : '—'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Passport No.</span>
              <span className="text-sm font-bold text-primary">{form.passportNo || '—'}</span>
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
              <span className="text-[10px] text-gray-400">Issuing Country</span>
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
          <Field label="Passport No *">
            <input value={form.passportNo} onChange={set('passportNo')} placeholder="e.g. UA51234567" className={inputCls} />
          </Field>
          <Field label="Prefix">
            <CustomSelect value={form.prefix} onChange={(val) => setForm(p => ({ ...p, prefix: val }))} options={PREFIXES} placeholder="— Select —" />
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
            <CustomSelect value={form.nationality} onChange={(val) => setForm(p => ({ ...p, nationality: val }))} options={NATIONALITIES} placeholder="Select" />
          </Field>
          <Field label="Your National ID">
            <input value={form.nationalityId} onChange={set('nationalityId')} placeholder="ID Number" className={inputCls} />
          </Field>
          <Field label="Place of birth">
            <input value={form.placeOfBirth} onChange={set('placeOfBirth')} placeholder="City" className={inputCls} />
          </Field>
          <Field label="Issuing Country *">
            <CustomSelect value={form.country} onChange={(val) => setForm(p => ({ ...p, country: val }))} options={COUNTRIES} placeholder="Select" />
          </Field>
          <Field label="Date of birth">
            <DateSelect value={form.birthDate} onChange={(v) => setForm(p => ({ ...p, birthDate: v }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Date of issue *">
            <DateSelect value={form.dateOfIssue} onChange={(v) => setForm(p => ({ ...p, dateOfIssue: v }))} />
          </Field>
          <Field label="Date of expiry *">
            <DateSelect value={form.expiryDate} onChange={(v) => setForm(p => ({ ...p, expiryDate: v }))} />
          </Field>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-2">
        <button
          disabled={saving || scanning}
          onClick={handleSave}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
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
