'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';
import { studentMeApi, dependentApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const GENDERS = ['Male', 'Female', 'Other'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const labelCls = 'text-xs font-medium text-primary mb-1';

type UploadKey = 'visa' | 'arrival' | 'departed' | 'passport';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

const UPLOAD_SLOTS: { key: UploadKey; title: string }[] = [
  { key: 'visa',     title: 'Upload Image Latest Visa\npermission / Sticker' },
  { key: 'arrival',  title: 'Upload Image Latest admitted stamp\n(Arrival to Thailand)' },
  { key: 'departed', title: 'Upload Image Latest Departed\n(Departure from Thailand)' },
  { key: 'passport', title: 'Upload Passport Image' },
];

function DependentForm() {
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

  const [form, setForm] = useState({
    prefix:       '',
    firstName:    '',
    middleName:   '',
    lastName:     '',
    email:        '',
    relationship: '',
    phone:        '',
    dateOfBirth:  '',
    gender:       '',
    nationality:  '',
    visaExpiry:   '',
  });

  const [studentNumId, setStudentNumId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data;
      setStudentNumId(s.id);
      if (isEdit && id) {
        return dependentApi.getAll(s.id).then(dRes => {
          const dep = dRes.data.data.find(d => d.id === Number(id));
          if (dep) {
            setForm({
              prefix:       dep.title ?? '',
              firstName:    dep.firstName ?? '',
              middleName:   dep.middleName ?? '',
              lastName:     dep.lastName ?? '',
              email:        '',
              relationship: dep.relationship ?? '',
              phone:        '',
              dateOfBirth:  dep.dateOfBirth ? dep.dateOfBirth.slice(0, 10) : '',
              gender:       dep.gender === 'MALE' ? 'Male' : dep.gender === 'FEMALE' ? 'Female' : dep.gender === 'OTHER' ? 'Other' : dep.gender ?? '',
              nationality:  dep.nationality ?? '',
              visaExpiry:   dep.visaExpiry ? dep.visaExpiry.slice(0, 10) : '',
            });
            setImages({
              passport: dep.passportImageUrl ?? null,
              visa:     dep.visaImageUrl ?? null,
              arrival:  dep.arrivalImageUrl ?? null,
              departed: dep.departedImageUrl ?? null,
            });
          }
        });
      }
    }).catch(() => {});
  }, [isEdit, id]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleFile(key: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setImages(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    };
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.relationship || !form.firstName || !form.lastName || !form.dateOfBirth || !form.gender || !form.nationality) {
      toast.error('Please fill in all required fields (*)');
      return;
    }
    setSaving(true);
    const genderMap: Record<string, string> = { Male: 'MALE', Female: 'FEMALE', Other: 'OTHER' };
    const genderEnum = genderMap[form.gender] ?? form.gender;
    try {
      // Upload images for all slots that have new files
      const { default: api } = await import('@/lib/api');
      const uploadSlot = async (key: UploadKey): Promise<string | undefined> => {
        const file = refs[key].current?.files?.[0];
        if (!file) return undefined;
        const fd = new FormData();
        fd.append('image', file);
        const res = await api.post(`/students/${studentNumId}/dependents/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data.url as string;
      };

      const [passportImageUrl, visaImageUrl, arrivalImageUrl, departedImageUrl] = await Promise.all([
        uploadSlot('passport'),
        uploadSlot('visa'),
        uploadSlot('arrival'),
        uploadSlot('departed'),
      ]);

      const imagePayload = {
        ...(passportImageUrl  !== undefined && { passportImageUrl }),
        ...(visaImageUrl      !== undefined && { visaImageUrl }),
        ...(arrivalImageUrl   !== undefined && { arrivalImageUrl }),
        ...(departedImageUrl  !== undefined && { departedImageUrl }),
      };

      if (isEdit && id) {
        await dependentApi.update(studentNumId, Number(id), {
          title:        form.prefix || undefined,
          firstName:    form.firstName,
          middleName:   form.middleName || undefined,
          lastName:     form.lastName,
          relationship: form.relationship,
          dateOfBirth:  form.dateOfBirth,
          gender:       genderEnum,
          nationality:  form.nationality,
          visaExpiry:   form.visaExpiry || undefined,
          ...imagePayload,
        });
      } else {
        await dependentApi.create(studentNumId, {
          title:        form.prefix || undefined,
          firstName:    form.firstName,
          middleName:   form.middleName || undefined,
          lastName:     form.lastName,
          relationship: form.relationship,
          dateOfBirth:  form.dateOfBirth,
          gender:       genderEnum,
          nationality:  form.nationality,
          visaExpiry:   form.visaExpiry || undefined,
          visaStatus:   'ACTIVE',
          ...imagePayload,
        });
      }
      setProgressField('dependentCompleted', true);
      toast.success(isEdit ? 'Dependent updated' : 'Dependent added');
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
          {isEdit ? 'Edit Dependent' : 'Add Dependent'}
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Prefix">
            <CustomSelect value={form.prefix} onChange={(val) => setForm(p => ({ ...p, prefix: val }))} options={PREFIXES} placeholder="— Select —" />
          </Field>
          <Field label="First Name *">
            <input value={form.firstName} onChange={set('firstName')} placeholder="First Name" className={inputCls} />
          </Field>
          <Field label="Middle Name">
            <input value={form.middleName} onChange={set('middleName')} placeholder="Middle Name" className={inputCls} />
          </Field>
          <Field label="Last Name *">
            <input value={form.lastName} onChange={set('lastName')} placeholder="Last Name" className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Relationship *">
            <input value={form.relationship} onChange={set('relationship')} placeholder="e.g. Parent, Spouse" className={inputCls} />
          </Field>
          <Field label="Phone No.">
            <input value={form.phone} onChange={set('phone')} placeholder="+66 xx xxx xxxx" className={inputCls} />
          </Field>
          <Field label="Date of Birth *">
            <DateSelect value={form.dateOfBirth} onChange={(v) => setForm(p => ({ ...p, dateOfBirth: v }))} />
          </Field>
          <Field label="Gender *">
            <CustomSelect value={form.gender} onChange={(val) => setForm(p => ({ ...p, gender: val }))} options={GENDERS} placeholder="— Select —" />
          </Field>
          <Field label="Nationality *">
            <CustomSelect value={form.nationality} onChange={(val) => setForm(p => ({ ...p, nationality: val }))} options={NATIONALITIES} placeholder="— Select —" />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Field label="Visa Expiry Date">
            <DateSelect value={form.visaExpiry} onChange={(v) => setForm(p => ({ ...p, visaExpiry: v }))} />
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
                <img src={images[key]!} alt={key} className="w-full object-contain rounded-xl max-h-28" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                  <FiUpload size={20} />
                  <p className="text-xs font-medium text-gray-500 whitespace-pre-line">{title}</p>
                  <p className="text-[11px]">Drop file here or click to upload</p>
                </div>
              )}
              <input ref={refs[key]} type="file" accept="image/*" onChange={handleFile(key)} onClick={e => e.stopPropagation()} className="hidden" />
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

export default function DependentPage() {
  return (
    <Suspense>
      <DependentForm />
    </Suspense>
  );
}
