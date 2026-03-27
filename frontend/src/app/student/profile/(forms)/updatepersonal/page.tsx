'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';
import { studentMeApi, studentApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DateSelect from '@/components/ui/DateSelect';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const RELATIONSHIP = ['Parent','Sister','brother','Advisor','Faculty Staff'];
const GENDERS = ['Male', 'Female', 'Other'];
const RELIGIONS = ['Buddhism', 'Christianity', 'Islam', 'Hinduism', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'Other'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'Other'];
const DEGREES = [
  { value: 'BACHELOR', label: "Bachelor's Degree" },
  { value: 'MASTER',   label: "Master's Degree" },
  { value: 'PHD',      label: 'Doctoral Degree (Ph.D.)' },
];
const PROGRAMS = [
  'M.Sc. Computer Science and Information Technology',
  'M.Sc. Data Science and Artificial Intelligence (International Program)',
  'M.Sc. Geo-Informatics',
  'Ph.D. Computer Science and Information Technology (International Program)',
  'Ph.D. Geo-Informatics',
];
const FACULTIES = ['College of Computing'];

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

export default function PersonalPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  const [form, setForm] = useState({
    prefix: '', firstName: '', middleName: '', lastName: '',
    dateOfBirth: '', gender: '', religion: '',
    homeCountry: '', homeAddress: '',
    program: '', faculty: '',
    email: '', phone: '',
    nationality: '', degree: '',
  });

  const [ecForm, setEcForm] = useState({
    ecPrefix: '', ecFirstName: '', ecLastName: '',
    ecEmail: '', ecPhone: '', ecRelationship: '',
  });

  useEffect(() => {
    studentMeApi.get().then(res => {
      const s = res.data.data as typeof res.data.data & { id: number };
      setStudentId(s.id);
      if (s.photoUrl) setPhotoPreview(s.photoUrl);
      setForm({
        prefix:      s.titleEn ?? '',
        firstName:   s.firstNameEn ?? '',
        middleName:  s.middleNameEn ?? '',
        lastName:    s.lastNameEn ?? '',
        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
        gender:      s.gender === 'MALE' ? 'Male' : s.gender === 'FEMALE' ? 'Female' : s.gender === 'OTHER' ? 'Other' : '',
        religion:    s.religion ?? '',
        homeCountry: s.homeCountry ?? '',
        homeAddress: s.homeAddress ?? '',
        program:     s.program ?? '',
        faculty:     s.faculty ?? 'College of Computing',
        email:       s.email ?? '',
        phone:       s.phone ?? '',
        nationality: s.nationality ?? '',
        degree:      s.level ?? '',
      });
      const ec = s.emergencyContact ?? '';
      const foundPrefix = PREFIXES.find(p => ec.startsWith(p + ' ')) ?? '';
      const ecWithoutPrefix = foundPrefix ? ec.slice(foundPrefix.length + 1).trim() : ec;
      const nameParts = ecWithoutPrefix.split(' ');
      const ecFirstName = nameParts.slice(0, -1).join(' ') || ecWithoutPrefix;
      const ecLastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      setEcForm({
        ecPrefix: foundPrefix,
        ecFirstName,
        ecLastName,
        ecEmail: s.emergencyEmail ?? '',
        ecPhone: s.emergencyPhone ?? '',
        ecRelationship: s.emergencyRelation ?? '',
      });
    }).catch(() => {
      toast.error('Could not load student profile. Please contact staff.');
    });
  }, []);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function setEc(key: keyof typeof ecForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEcForm(prev => ({ ...prev, [key]: e.target.value }));
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
        <h1 className="text-2xl font-semibold text-primary">Update My Personal Information</h1>
      </div>



      <div className="flex flex-col gap-5">

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
          <Field label="Prefix">
            <CustomSelect value={form.prefix} onChange={(val) => setForm(p => ({ ...p, prefix: val }))} options={PREFIXES} placeholder="— Select —" />
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

          <Field label="Date of Birth">
            <DateSelect value={form.dateOfBirth} onChange={(v) => setForm(p => ({ ...p, dateOfBirth: v }))} />
          </Field>
          <Field label="Gender">
            <CustomSelect value={form.gender} onChange={(val) => setForm(p => ({ ...p, gender: val }))} options={GENDERS} placeholder="— Select —" />
          </Field>
          <Field label="Religion">
            <CustomSelect value={form.religion} onChange={(val) => setForm(p => ({ ...p, religion: val }))} options={RELIGIONS} placeholder="— Select —" />
          </Field>
          <Field label="Nationality">
            <CustomSelect value={form.nationality} onChange={(val) => setForm(p => ({ ...p, nationality: val }))} options={NATIONALITIES} placeholder="Select Nationality" />
          </Field>
          <Field label="Home Country">
            <CustomSelect value={form.homeCountry} onChange={(val) => setForm(p => ({ ...p, homeCountry: val }))} options={COUNTRIES} placeholder="Select Country" />
          </Field>
          <Field label="Home Address">
            <input value={form.homeAddress} onChange={set('homeAddress')} placeholder="Home Address" className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email" className={inputCls} />
          </Field>
          <Field label="Phone Number">
            <input value={form.phone} onChange={set('phone')} placeholder="+66 xx xxx xxxx" className={inputCls} />
          </Field>
          <Field label="Faculty">
            <CustomSelect value={form.faculty} onChange={(val) => setForm(p => ({ ...p, faculty: val }))} options={FACULTIES} placeholder="Select Faculty" />
          </Field>

          <Field label="Degree">
            <CustomSelect value={form.degree} onChange={(val) => setForm(p => ({ ...p, degree: val }))} options={DEGREES} placeholder="Select Degree" />
          </Field>
          <Field label="Program">
            <CustomSelect value={form.program} onChange={(val) => setForm(p => ({ ...p, program: val }))} options={PROGRAMS} placeholder="Select Program" />
          </Field>
          {/* Upload Profile Photo */}
          <div className="flex flex-col gap-3">
            <p className="text-md font-normal text-primary">Upload Profile Photo</p>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-primary hover:bg-secondary/80 transition shadow-sm"
                >
                  <FiUpload size={18} />
                </button>
              )}
              {photoPreview && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-primary bg-secondary px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-secondary/80 transition"
                >
                  <FiUpload size={14} /> Change Photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </div>
          </div>

        </div>
        <div className='mt-5'>
          <h2 className='text-primary font-medium'>Emergency Contact Data</h2>
        </div>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
            <Field label="Prefix">
              <CustomSelect value={ecForm.ecPrefix} onChange={(val) => setEcForm(p => ({ ...p, ecPrefix: val }))} options={PREFIXES} placeholder="— Select —" />
            </Field>
            <Field label="First Name">
              <input value={ecForm.ecFirstName} onChange={setEc('ecFirstName')} placeholder="First Name" className={inputCls} />
            </Field>
            <Field label="Last Name">
              <input value={ecForm.ecLastName} onChange={setEc('ecLastName')} placeholder="Last Name" className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={ecForm.ecEmail} onChange={setEc('ecEmail')} type="email" placeholder="Email" className={inputCls} />
            </Field>
            <Field label="Phone No.">
              <input value={ecForm.ecPhone} onChange={setEc('ecPhone')} placeholder="+66 xx xxx xxxx" className={inputCls} />
            </Field>
            <Field label="Relationship">
              <CustomSelect value={ecForm.ecRelationship} onChange={(val) => setEcForm(p => ({ ...p, ecRelationship: val }))} options={RELATIONSHIP} placeholder="— Select —" />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          disabled={saving}
          onClick={async () => {
            if (!studentId) { toast.error('Student profile not found. Please contact staff.'); return; }
            setSaving(true);
            try {
              // Upload profile photo if a new file was selected
              if (photoFile) {
                const { default: api } = await import('@/lib/api');
                const formData = new FormData();
                formData.append('image', photoFile);
                await api.post(`/students/${studentId}/photo`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              }

              const genderMap: Record<string, string> = { Male: 'MALE', Female: 'FEMALE', Other: 'OTHER' };
              await studentApi.update(studentId, {
                titleEn:          form.prefix || undefined,
                firstNameEn:      form.firstName || undefined,
                middleNameEn:     form.middleName || undefined,
                lastNameEn:       form.lastName || undefined,
                dateOfBirth:      form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
                gender:           form.gender ? (genderMap[form.gender] as 'MALE' | 'FEMALE' | 'OTHER') : undefined,
                religion:         form.religion || undefined,
                homeCountry:      form.homeCountry || undefined,
                homeAddress:      form.homeAddress || undefined,
                email:            form.email || undefined,
                phone:            form.phone || undefined,
                nationality:      form.nationality || undefined,
                faculty:          form.faculty || undefined,
                program:          form.program || undefined,
                level:            (form.degree as 'BACHELOR' | 'MASTER' | 'PHD') || undefined,
                emergencyContact: [ecForm.ecPrefix, ecForm.ecFirstName, ecForm.ecLastName].filter(Boolean).join(' ') || undefined,
                emergencyEmail:   ecForm.ecEmail || undefined,
                emergencyPhone:   ecForm.ecPhone || undefined,
                emergencyRelation: ecForm.ecRelationship || undefined,
              });
              setProgressField('personalInfoCompleted', true);
              toast.success('Personal information saved');
              router.back();
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
              toast.error(msg || 'Failed to save. Please try again.');
            } finally {
              setSaving(false);
            }
          }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
