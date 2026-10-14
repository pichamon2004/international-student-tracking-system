'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { studentMeApi, dependentApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';
import { Field, Section, FormShell, ImageSlot, inputCls, withValue, strOptions, type Option } from '@/components/profile/FormUI';

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Other'];
const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Master'];
const GENDERS: Option[] = [
  { value: 'MALE',   label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other' },
];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'American', 'British', 'Other'];
const VISA_TYPES = ['Non-O (Dependent)', 'Non-ED', 'ED', 'Tourist', 'Other'];

const MAX_FILE_MB = 5; // backend uploadImage limit (upload.middleware.ts)

type UploadKey = 'passport' | 'visa' | 'arrival' | 'departed';
const UPLOAD_SLOTS: { key: UploadKey; title: string; hint: string; field: 'passportImageUrl' | 'visaImageUrl' | 'arrivalImageUrl' | 'departedImageUrl' }[] = [
  { key: 'passport', title: 'Passport photo page', hint: 'The page with their photo',  field: 'passportImageUrl' },
  { key: 'visa',     title: 'Visa sticker',        hint: 'Latest visa or extension',   field: 'visaImageUrl' },
  { key: 'arrival',  title: 'Arrival stamp',       hint: 'Latest entry into Thailand', field: 'arrivalImageUrl' },
  { key: 'departed', title: 'Departure stamp',     hint: 'Latest exit from Thailand',  field: 'departedImageUrl' },
];

// Older records may hold the gender as free text — map it onto the enum values
function normalizeGender(g: string | null | undefined): string {
  if (!g) return '';
  const u = g.toUpperCase();
  return u === 'MALE' || u === 'FEMALE' || u === 'OTHER' ? u : g;
}

function DependentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const refs: Record<UploadKey, React.RefObject<HTMLInputElement>> = {
    passport: useRef<HTMLInputElement>(null),
    visa:     useRef<HTMLInputElement>(null),
    arrival:  useRef<HTMLInputElement>(null),
    departed: useRef<HTMLInputElement>(null),
  };
  const [images, setImages] = useState<Record<UploadKey, string | null>>({ passport: null, visa: null, arrival: null, departed: null });
  // Documents cleared with the bin button — saved as null
  const [removed, setRemoved] = useState<Record<UploadKey, boolean>>({ passport: false, visa: false, arrival: false, departed: false });

  const [form, setForm] = useState({
    relationship: '', prefix: '', gender: '', dateOfBirth: '',
    firstName: '', middleName: '', lastName: '', nationality: '',
    email: '', phone: '',
    passportNo: '', passportExpiry: '', visaType: '', visaExpiry: '',
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
              relationship:   dep.relationship ?? '',
              prefix:         dep.title ?? '',
              gender:         normalizeGender(dep.gender),
              dateOfBirth:    dep.dateOfBirth ? dep.dateOfBirth.slice(0, 10) : '',
              firstName:      dep.firstName ?? '',
              middleName:     dep.middleName ?? '',
              lastName:       dep.lastName ?? '',
              nationality:    dep.nationality ?? '',
              email:          dep.email ?? '',
              phone:          dep.phone ?? '',
              passportNo:     dep.passportNumber ?? '',
              passportExpiry: dep.passportExpiry ? dep.passportExpiry.slice(0, 10) : '',
              visaType:       dep.visaType ?? '',
              visaExpiry:     dep.visaExpiry ? dep.visaExpiry.slice(0, 10) : '',
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

  const setVal = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));
  const setText = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  function pickFile(key: UploadKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`File is larger than ${MAX_FILE_MB} MB`);
        e.target.value = '';
        return;
      }
      setImages(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
      setRemoved(prev => ({ ...prev, [key]: false }));
    };
  }

  function clearFile(key: UploadKey) {
    const input = refs[key].current;
    if (input) input.value = '';
    setImages(prev => ({ ...prev, [key]: null }));
    setRemoved(prev => ({ ...prev, [key]: true }));
  }

  async function handleSave() {
    if (!studentNumId) return;
    if (!form.relationship || !form.gender || !form.dateOfBirth || !form.firstName.trim() || !form.lastName.trim() || !form.nationality) {
      toast.error('Please fill in all required personal details');
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
        const res = await api.post(`/students/${studentNumId}/dependents/image`, fd, {
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
        title:          form.prefix || undefined,
        firstName:      form.firstName.trim(),
        middleName:     form.middleName.trim() || undefined,
        lastName:       form.lastName.trim(),
        email:          form.email.trim() || undefined,
        phone:          form.phone.trim() || undefined,
        relationship:   form.relationship,
        dateOfBirth:    form.dateOfBirth,
        gender:         form.gender,
        nationality:    form.nationality,
        passportNumber: form.passportNo.trim() || undefined,
        passportExpiry: form.passportExpiry || undefined,
        visaType:       form.visaType || undefined,
        visaExpiry:     form.visaExpiry || undefined,
      };

      const res = isEdit && id
        ? await dependentApi.update(studentNumId, Number(id), { ...base, ...imagePayload })
        : await dependentApi.create(studentNumId, { ...base, visaStatus: 'ACTIVE', ...imagePayload });

      if (res.status === 202) {
        toast.success('Change submitted — awaiting staff approval');
        router.back();
        return;
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
    <FormShell
      title={isEdit ? 'Edit dependent' : 'Add dependent'}
      subtitle="Spouse or child staying in Thailand on your visa"
      onSave={handleSave}
      saving={saving}
      saveLabel="Save dependent"
    >
      {/* 1 · Personal details */}
      <Section n={1} title="Personal details" subtitle="Use the name exactly as it appears in their passport.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Relationship to you" required>
            <CustomSelect value={form.relationship} onChange={setVal('relationship')} options={strOptions(RELATIONSHIPS, form.relationship)} placeholder="Select" />
          </Field>
          <Field label="Prefix">
            <CustomSelect value={form.prefix} onChange={setVal('prefix')} options={strOptions(PREFIXES, form.prefix)} placeholder="Select" />
          </Field>
          <Field label="Gender" required>
            <CustomSelect value={form.gender} onChange={setVal('gender')} options={withValue(GENDERS, form.gender)} placeholder="Select" />
          </Field>
          <Field label="Date of birth" required>
            <DateSelect value={form.dateOfBirth} onChange={setVal('dateOfBirth')} />
          </Field>
          <Field label="First name" required>
            <input value={form.firstName} onChange={setText('firstName')} placeholder="First name" className={inputCls} />
          </Field>
          <Field label="Middle name">
            <input value={form.middleName} onChange={setText('middleName')} placeholder="If any" className={inputCls} />
          </Field>
          <Field label="Last name" required>
            <input value={form.lastName} onChange={setText('lastName')} placeholder="Last name" className={inputCls} />
          </Field>
          <Field label="Nationality" required>
            <CustomSelect value={form.nationality} onChange={setVal('nationality')} options={strOptions(NATIONALITIES, form.nationality)} placeholder="Select" />
          </Field>
        </div>
      </Section>

      {/* 2 · Contact */}
      <Section n={2} title="Contact" optional subtitle="Leave blank for young children.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Email">
            <input value={form.email} onChange={setText('email')} type="email" placeholder="name@example.com" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={setText('phone')} type="tel" placeholder="+66 xx xxx xxxx" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* 3 · Passport & visa */}
      <Section n={3} title="Passport & visa" subtitle="We'll remind you before either one expires.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Passport number">
            <input value={form.passportNo} onChange={setText('passportNo')} placeholder="e.g. UA51234567" className={inputCls} />
          </Field>
          <Field label="Passport expiry date">
            <DateSelect value={form.passportExpiry} onChange={setVal('passportExpiry')} />
          </Field>
          <Field label="Visa type">
            <CustomSelect value={form.visaType} onChange={setVal('visaType')} options={strOptions(VISA_TYPES, form.visaType)} placeholder="Select" />
          </Field>
          <Field label="Visa expiry date">
            <DateSelect value={form.visaExpiry} onChange={setVal('visaExpiry')} />
          </Field>
        </div>
      </Section>

      {/* 4 · Documents */}
      <Section n={4} title="Documents" subtitle={`Upload the latest of each. JPG or PNG image, up to ${MAX_FILE_MB} MB each.`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {UPLOAD_SLOTS.map(({ key, title, hint }) => (
            <ImageSlot
              key={key}
              title={title}
              hint={hint}
              preview={images[key]}
              inputRef={refs[key]}
              onPick={pickFile(key)}
              onClear={() => clearFile(key)}
            />
          ))}
        </div>
      </Section>
    </FormShell>
  );
}

export default function DependentPage() {
  return (
    <Suspense>
      <DependentForm />
    </Suspense>
  );
}
