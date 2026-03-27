'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';
import { studentMeApi, visaApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const VISA_TYPES = ['ED', 'Non-ED', 'Tourist', 'Transit', 'Business', 'Other'];
const SEX_OPTIONS = ['M', 'F'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'USA', 'UK', 'Other'];

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';

const UPLOAD_SLOTS: { key: UploadKey; title: string }[] = [
  { key: 'visa',      title: 'Upload Image Latest Visa\npermission / Sticker' },
  { key: 'arrival',   title: 'Upload Image Latest admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed',  title: 'Upload Image Latest Departed\n(Departure from Thailand)' },
  { key: 'passport',  title: 'Upload Passport Image' },
];

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

function VisaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    visa:      useRef<HTMLInputElement>(null),
    arrival:   useRef<HTMLInputElement>(null),
    departed:  useRef<HTMLInputElement>(null),
    passport:  useRef<HTMLInputElement>(null),
  };

  const [images, setImages] = useState<Record<UploadKey, string | null>>(
    { visa: null, arrival: null, departed: null, passport: null }
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

  const [passportOptions, setPassportOptions] = useState<string[]>([]);
  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      setPassportOptions(s.passports.map(p => p.passportNumber));

      setForm(prev => ({
        ...prev,
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
              visa:      visa.imageUrl ?? null,
              arrival:   visa.arrivalImageUrl ?? null,
              departed:  visa.departedImageUrl ?? null,
              passport:  visa.passportImageUrl ?? null,
            });
          }
        });
      }
    }).catch(() => {});
  }, [isEdit, id]);

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

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.visaType || !form.issuingCountry || !form.validFrom || !form.validUntil) {
      toast.error('Please fill in Visa Type, Issuing Country, Valid From, and Valid Until');
      return;
    }
    setSaving(true);
    try {
      // Upload images for each slot that has a new file selected
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

      const [imageUrl, arrivalImageUrl, departedImageUrl, passportImageUrl] = await Promise.all([
        uploadSlot('visa'),
        uploadSlot('arrival'),
        uploadSlot('departed'),
        uploadSlot('passport'),
      ]);

      const imagePayload = {
        ...(imageUrl          !== undefined && { imageUrl }),
        ...(arrivalImageUrl   !== undefined && { arrivalImageUrl }),
        ...(departedImageUrl  !== undefined && { departedImageUrl }),
        ...(passportImageUrl  !== undefined && { passportImageUrl }),
      };

      if (isEdit && id) {
        await visaApi.update(studentNumId, Number(id), {
          visaType:       form.visaType,
          issuingCountry: form.issuingCountry,
          issuingPlace:   form.placeOfIssue || undefined,
          issueDate:      form.validFrom,
          expiryDate:     form.validUntil,
          entries:        form.numberOfEntries || undefined,
          remarks:        form.remarks || undefined,
          ...imagePayload,
        });
      } else {
        await visaApi.create(studentNumId, {
          visaType:       form.visaType,
          issuingCountry: form.issuingCountry,
          issuingPlace:   form.placeOfIssue || undefined,
          issueDate:      form.validFrom,
          expiryDate:     form.validUntil,
          entries:        form.numberOfEntries || undefined,
          remarks:        form.remarks || undefined,
          status:         'ACTIVE',
          ...imagePayload,
        });
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
            <CustomSelect value={form.passport} onChange={(val) => setForm(p => ({ ...p, passport: val }))} options={passportOptions} />
          </Field>
          <Field label="Issuing Country *">
            <CustomSelect value={form.issuingCountry} onChange={(val) => setForm(p => ({ ...p, issuingCountry: val }))} options={COUNTRIES} />
          </Field>
          <Field label="Place of Issue">
            <input value={form.placeOfIssue} onChange={set('placeOfIssue')} className={inputCls} />
          </Field>
          <Field label="Valid From *">
            <DateSelect value={form.validFrom} onChange={(v) => setForm(p => ({ ...p, validFrom: v }))} />
          </Field>
          <Field label="Valid Until *">
            <DateSelect value={form.validUntil} onChange={(v) => setForm(p => ({ ...p, validUntil: v }))} />
          </Field>
          <Field label="Type of Visa / Category *">
            <CustomSelect value={form.visaType} onChange={(val) => setForm(p => ({ ...p, visaType: val }))} options={VISA_TYPES} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Number of Entries">
            <input value={form.numberOfEntries} onChange={set('numberOfEntries')} className={inputCls} />
          </Field>
          <Field label="Sex">
            <CustomSelect value={form.sex} onChange={(val) => setForm(p => ({ ...p, sex: val }))} options={SEX_OPTIONS} />
          </Field>
          <Field label="Given Name">
            <input value={form.givenName} onChange={set('givenName')} className={inputCls} />
          </Field>
          <Field label="Surname">
            <input value={form.surname} onChange={set('surname')} className={inputCls} />
          </Field>
          <Field label="Date of Birth">
            <DateSelect value={form.dateOfBirth} onChange={(v) => setForm(p => ({ ...p, dateOfBirth: v }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Nationality">
            <CustomSelect value={form.nationality} onChange={(val) => setForm(p => ({ ...p, nationality: val }))} options={NATIONALITIES} />
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

export default function VisaPage() {
  return (
    <Suspense>
      <VisaForm />
    </Suspense>
  );
}
