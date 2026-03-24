'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setProgressField } from '@/lib/progressStore';
import { RiArrowLeftLine } from 'react-icons/ri';
import { FiUpload } from 'react-icons/fi';

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Miss'];
const RELATIONSHIP = ['Parent','Sister','brother','Advisor','Faculty Staff'];
const GENDERS = ['Male', 'Female', 'Other'];
const RELIGIONS = ['Buddhism', 'Christianity', 'Islam', 'Hinduism', 'Other'];
const COUNTRIES = ['Thailand', 'China', 'Japan', 'Vietnam', 'Myanmar', 'Cambodia', 'Laos', 'Indonesia', 'Other'];
const NATIONALITIES = ['Thai', 'Chinese', 'Japanese', 'Vietnamese', 'Myanmar', 'Cambodian', 'Laotian', 'Indonesian', 'Other'];
const DEGREES = ["Bachelor's Degree", "Master's Degree", "Ph.D."];
const PROGRAMS = ['Computer Engineering', 'Computer Science', 'Information Technology', 'Electrical Engineering', 'Other'];
const FACULTIES = ['College of Computing', 'College of Engineering', 'College of Medicine', 'Other'];

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary';
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 bg-white focus:outline-none focus:border-primary';
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

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
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
            <select value={form.prefix} onChange={set('prefix')} className={selectCls}>
              <option value="">— Select —</option>
              {PREFIXES.map(p => <option key={p}>{p}</option>)}
            </select>
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
            <input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" className={inputCls} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={set('gender')} className={selectCls}>
              <option value="">— Select —</option>
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Religion">
            <select value={form.religion} onChange={set('religion')} className={selectCls}>
              <option value="">— Select —</option>
              {RELIGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Nationality">
            <select value={form.nationality} onChange={set('nationality')} className={selectCls}>
              <option value="">Select Nationality</option>
              {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Home Country">
            <select value={form.homeCountry} onChange={set('homeCountry')} className={selectCls}>
              <option value="">Select Country</option>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
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
            <select value={form.faculty} onChange={set('faculty')} className={selectCls}>
              <option value="">Select Faculty</option>
              {FACULTIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="Degree">
            <select value={form.degree} onChange={set('degree')} className={selectCls}>
              <option value="">Select Degree</option>
              {DEGREES.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Program">
            <select value={form.program} onChange={set('program')} className={selectCls}>
              <option value="">Select Program</option>
              {PROGRAMS.map(p => <option key={p}>{p}</option>)}
            </select>
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
              <select value={ecForm.ecPrefix} onChange={setEc('ecPrefix')} className={selectCls}>
                <option value="">— Select —</option>
                {PREFIXES.map(p => <option key={p}>{p}</option>)}
              </select>
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
              <select value={ecForm.ecRelationship} onChange={setEc('ecRelationship')} className={selectCls}>
                <option value="">— Select —</option>
                {RELATIONSHIP.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          onClick={() => { setProgressField('personalInfoCompleted', true); router.back(); }}
          className="bg-primary text-white text-sm font-semibold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
