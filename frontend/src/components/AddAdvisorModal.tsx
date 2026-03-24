'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCameraLine, RiUserLine } from 'react-icons/ri';

const PREFIXES = ['Asst. Prof.', 'Assoc. Prof.', 'Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Miss'];

const NATIONALITIES = [
  'Thai', 'Chinese', 'Vietnamese', 'Indonesian', 'Malaysian', 'Myanmar',
  'Cambodian', 'Laotian', 'Filipino', 'Indian', 'Korean', 'Japanese',
  'American', 'British', 'French', 'German', 'Australian', 'Other',
];

export interface NewAdvisorData {
  prefix: string;
  firstName: string;
  lastName: string;
  middleName: string;
  tel: string;
  email: string;
  nationality: string;
  photoUrl?: string;
}

interface Props {
  onSave: (data: NewAdvisorData) => void;
  onClose: () => void;
}

export default function AddAdvisorModal({ onSave, onClose }: Props) {
  const [prefix, setPrefix]           = useState(PREFIXES[0]);
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [middleName, setMiddleName]   = useState('');
  const [tel, setTel]                 = useState('');
  const [email, setEmail]             = useState('');
  const [nationality, setNationality] = useState(NATIONALITIES[0]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('') || <RiUserLine size={28} />;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    onSave({ prefix, firstName, lastName, middleName, tel, email, nationality, photoUrl: photoPreview ?? undefined });
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-bold text-primary">Add Teacher / Advisor</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
          >
            <RiCloseLine size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">

          {/* Personal Information card */}
          <div className="bg-[#DEEBFF]/40 rounded-2xl p-5 flex flex-col gap-5">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Personal Information</p>

            {/* Avatar + upload */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
                {photoPreview
                  ? <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary/70 text-xs font-semibold hover:border-primary hover:text-primary transition"
              >
                <RiCameraLine size={15} />
                Upload New Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">

              {/* Prefix */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Prefix</label>
                <select
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {PREFIXES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Nationality */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Nationality</label>
                <select
                  value={nationality}
                  onChange={e => setNationality(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>

              {/* First Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">First Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Last Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Middle Name */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Middle Name <span className="text-gray-300">(optional)</span></label>
                <input
                  type="text"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  placeholder="Middle name"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Tel */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Tel No.</label>
                <input
                  type="tel"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  placeholder="0XX-XXX-XXXX"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@kku.ac.th"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim() || !email.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Add Teacher
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
