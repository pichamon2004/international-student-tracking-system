'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine, RiDeleteBinLine, RiImageLine } from 'react-icons/ri';
import { studentMeApi, visaApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';
import { Field, Section, inputCls, withValue, strOptions, type Option } from '@/components/profile/FormUI';
import { fmtDate } from '@/components/profile/ProfileUI';

const VISA_TYPES: Option[] = [
  { value: 'ED',       label: 'ED · Education' },
  { value: 'Non-ED',   label: 'Non-ED · Non-immigrant' },
  { value: 'Tourist',  label: 'Tourist' },
  { value: 'Transit',  label: 'Transit' },
  { value: 'Business', label: 'Business' },
  { value: 'Other',    label: 'Other' },
];
const ENTRY_OPTIONS: Option[] = [
  { value: '1', label: '1 · Single entry' },
  { value: '2', label: '2 · Double entry' },
  { value: 'M', label: 'M · Multiple entries' },
];
const SEX_OPTIONS: Option[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'USA', 'UK', 'Other'];

const MAX_FILE_MB = 5; // backend uploadImage limit (upload.middleware.ts)

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';
const UPLOAD_SLOTS: { key: UploadKey; title: string; field: 'imageUrl' | 'arrivalImageUrl' | 'departedImageUrl' | 'passportImageUrl' }[] = [
  { key: 'visa',     title: 'Visa sticker',    field: 'imageUrl' },
  { key: 'arrival',  title: 'Arrival stamp',   field: 'arrivalImageUrl' },
  { key: 'departed', title: 'Departure stamp', field: 'departedImageUrl' },
  { key: 'passport', title: 'Passport page',   field: 'passportImageUrl' },
];

function VisaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa:     useRef<HTMLInputElement>(null),
    arrival:  useRef<HTMLInputElement>(null),
    departed: useRef<HTMLInputElement>(null),
    passport: useRef<HTMLInputElement>(null),
  };

  const [images, setImages] = useState<Record<UploadKey, string | null>>(
    { visa: null, arrival: null, departed: null, passport: null }
  );
  // Documents the student cleared with the bin button — saved as null
  const [removed, setRemoved] = useState<Record<UploadKey, boolean>>(
    { visa: false, arrival: false, departed: false, passport: false }
  );

  const [form, setForm] = useState({
    passport:        '',
    issuingCountry:  '',
    placeOfIssue:    '',
    validFrom:       '',
    validUntil:      '',
    visaType:        '',
    numberOfEntries: '',
    sex:             '',
    givenName:       '',
    surname:         '',
    dateOfBirth:     '',
    nationality:     '',
    remarks:         '',
  });

  const [passportOptions, setPassportOptions] = useState<Option[]>([]);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      setPassportOptions(s.passports.map(p => ({ value: p.passportNumber, label: `${p.passportNumber} · ${p.issuingCountry}` })));

      setForm(prev => ({
        ...prev,
        passport:    prev.passport || s.passports[0]?.passportNumber || '',
        givenName:   s.firstNameEn ?? '',
        surname:     s.lastNameEn ?? '',
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
        nationality: s.nationality ?? '',
        sex: s.gender === 'Male' ? 'M' : s.gender === 'Female' ? 'F' : '',
      }));

      if (isEdit && id) {
        return visaApi.getAll(s.id).then(vRes => {
          const visa = vRes.data.data.find(v => v.id === Number(id));
          if (visa) {
            setForm(prev => ({
              ...prev,
              issuingCountry:  visa.issuingCountry ?? '',
              placeOfIssue:    visa.issuingPlace ?? '',
              validFrom:       visa.issueDate ? visa.issueDate.slice(0, 10) : '',
              validUntil:      visa.expiryDate ? visa.expiryDate.slice(0, 10) : '',
              visaType:        visa.visaType ?? '',
              numberOfEntries: visa.entries ?? '',
              remarks:         visa.remarks ?? '',
            }));
            setImages({
              visa:     visa.imageUrl ?? null,
              arrival:  visa.arrivalImageUrl ?? null,
              departed: visa.departedImageUrl ?? null,
              passport: visa.passportImageUrl ?? null,
            });
          }
        });
      }
    }).catch(() => {});
  }, [isEdit, id]);

  const setVal = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));
  const setText = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  function handleFile(slotKey: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`File is larger than ${MAX_FILE_MB} MB`);
        e.target.value = '';
        return;
      }
      setImages(prev => ({ ...prev, [slotKey]: URL.createObjectURL(file) }));
      setRemoved(prev => ({ ...prev, [slotKey]: false }));
    };
  }

  function clearFile(slotKey: UploadKey) {
    const input = refs[slotKey].current;
    if (input) input.value = '';
    setImages(prev => ({ ...prev, [slotKey]: null }));
    setRemoved(prev => ({ ...prev, [slotKey]: true }));
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.visaType || !form.issuingCountry || !form.validFrom || !form.validUntil) {
      toast.error('Please fill in Visa type, Issuing country, and Validity');
      return;
    }
    if (form.validUntil < form.validFrom) {
      toast.error('Validity end date must be after the start date');
      return;
    }
    setSaving(true);
    try {
      const { default: api } = await import('@/lib/api');
      const uploadSlot = async (key: UploadKey): Promise<string | undefined> => {
        const file = refs[key].current?.files?.[0];
        if (!file) return undefined;
        const fd = new FormData();
        fd.append('image', file);
        const res = await api.post(`/students/${studentNumId}/visas/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data.url as string;
      };

      const uploaded = await Promise.all(UPLOAD_SLOTS.map(s => uploadSlot(s.key)));
      // New file → its URL; cleared → null; untouched → left out (unchanged)
      const imagePayload: Record<string, string | null> = {};
      UPLOAD_SLOTS.forEach((slot, i) => {
        if (uploaded[i] !== undefined) imagePayload[slot.field] = uploaded[i]!;
        else if (removed[slot.key]) imagePayload[slot.field] = null;
      });

      const base = {
        visaType:       form.visaType,
        issuingCountry: form.issuingCountry,
        issuingPlace:   form.placeOfIssue || undefined,
        issueDate:      form.validFrom,
        expiryDate:     form.validUntil,
        entries:        form.numberOfEntries || undefined,
        remarks:        form.remarks || undefined,
      };

      const res = isEdit && id
        ? await visaApi.update(studentNumId, Number(id), { ...base, ...imagePayload })
        : await visaApi.create(studentNumId, { ...base, status: 'ACTIVE', ...imagePayload });

      if (res.status === 202) {
        toast.success('Change submitted — awaiting staff approval');
        router.back();
        return;
      }
      setProgressField('visaCompleted', true);
      toast.success(isEdit ? 'Visa updated' : 'Visa added');
      router.back();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const subtitle = isEdit && form.visaType && form.validFrom && form.validUntil
    ? `${form.visaType} · Valid ${fmtDate(form.validFrom)} – ${fmtDate(form.validUntil)}`
    : null;

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
            <h1 className="text-2xl font-semibold text-primary">{isEdit ? 'Edit Visa' : 'Add Visa'}</h1>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <p className="text-xs text-gray-500 pt-2 shrink-0"><span className="text-red-500">*</span> Required field</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 -mr-2 pr-2">
          {/* 1 · Visa details */}
          <Section n={1} title="Visa details" subtitle="Copy these from the visa sticker in your passport.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Passport" hint="The passport this visa is stamped in">
                <CustomSelect value={form.passport} onChange={setVal('passport')} options={passportOptions} placeholder="Select" />
              </Field>
              <Field label="Visa type" required>
                <CustomSelect value={form.visaType} onChange={setVal('visaType')} options={withValue(VISA_TYPES, form.visaType)} placeholder="Select" />
              </Field>
              <Field label="Number of entries">
                <CustomSelect value={form.numberOfEntries} onChange={setVal('numberOfEntries')} options={withValue(ENTRY_OPTIONS, form.numberOfEntries)} placeholder="Select" />
              </Field>
              <Field label="Issuing country" required hint="Where the Thai embassy or consulate is">
                <CustomSelect value={form.issuingCountry} onChange={setVal('issuingCountry')} options={strOptions(COUNTRIES, form.issuingCountry)} placeholder="Select" />
              </Field>
              <Field label="Place of issue">
                <input value={form.placeOfIssue} onChange={setText('placeOfIssue')} placeholder="e.g. Kunming" className={inputCls} />
              </Field>
              <Field label="Validity" required hint="From – until, as printed on the visa" className="sm:col-span-1 lg:col-span-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <DateSelect value={form.validFrom} onChange={setVal('validFrom')} placeholder="From" />
                  <span className="text-gray-400">–</span>
                  <DateSelect value={form.validUntil} onChange={setVal('validUntil')} placeholder="Until" />
                </div>
              </Field>
            </div>
          </Section>

          {/* 2 · Holder details */}
          <Section n={2} title="Holder details" subtitle="Exactly as printed on the visa, which may differ from your profile.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Given name">
                <input value={form.givenName} onChange={setText('givenName')} className={inputCls} />
              </Field>
              <Field label="Surname">
                <input value={form.surname} onChange={setText('surname')} className={inputCls} />
              </Field>
              <Field label="Sex">
                <CustomSelect value={form.sex} onChange={setVal('sex')} options={SEX_OPTIONS} placeholder="Select" />
              </Field>
              <Field label="Date of birth">
                <DateSelect value={form.dateOfBirth} onChange={setVal('dateOfBirth')} />
              </Field>
              <Field label="Nationality">
                <CustomSelect value={form.nationality} onChange={setVal('nationality')} options={strOptions(NATIONALITIES, form.nationality)} placeholder="Select" />
              </Field>
            </div>
          </Section>

          {/* 3 · Documents */}
          <Section n={3} title="Documents" subtitle={`JPG or PNG image, up to ${MAX_FILE_MB} MB each. Make sure the text is readable.`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {UPLOAD_SLOTS.map(({ key, title }) => (
                <div key={key} className="flex flex-col gap-2 min-w-0">
                  <span className="text-xs font-semibold text-primary">{title}</span>
                  <button
                    type="button"
                    onClick={() => refs[key].current?.click()}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden hover:border-primary/50 transition"
                  >
                    {images[key] ? (
                      <img src={images[key]!} alt={title} className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-gray-400">
                        <RiImageLine size={22} />
                        <span className="text-[11px]">Click to upload</span>
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refs[key].current?.click()}
                      className="flex-1 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition"
                    >
                      {images[key] ? 'Replace' : 'Upload'}
                    </button>
                    {images[key] && (
                      <button
                        type="button"
                        onClick={() => clearFile(key)}
                        title={`Remove ${title.toLowerCase()}`}
                        className="w-8 h-8 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition"
                      >
                        <RiDeleteBinLine size={14} />
                      </button>
                    )}
                  </div>
                  <input ref={refs[key]} type="file" accept="image/*" onChange={handleFile(key)} className="hidden" />
                </div>
              ))}
            </div>
          </Section>

          {/* 4 · Remarks */}
          <Section n={4} title="Remarks" optional>
            <textarea value={form.remarks} onChange={setText('remarks')} rows={3}
              placeholder="Anything staff should know about this visa"
              className={`${inputCls} resize-y`} />
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 shrink-0">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add visa'}
          </button>
        </div>
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
