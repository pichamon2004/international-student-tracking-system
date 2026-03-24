'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiSearchLine, RiDeleteBinLine, RiAddLine, RiUpload2Line } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import { RiArrowDropDownLine } from "react-icons/ri";

const mockStudents = [
  { id: 1, name: 'John Tanaka', email: 'john.tana@kkumail.com' },
  { id: 2, name: 'John Tanaka', email: 'john.tana@kkumail.com' },
  { id: 3, name: 'John Tanaka', email: 'john.tana@kkumail.com' },
  { id: 4, name: 'John Tanaka', email: 'john.tana@kkumail.com' },
];

const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Asst. Prof.', 'Assoc. Prof.', 'Prof.'];
const NATIONALITIES = ['Thai', 'Chinese', 'Vietnamese', 'Myanmar', 'Lao', 'Indonesian', 'American', 'Other'];


export default function AdvisorEditPage() {
  const router = useRouter();

  const [prefix, setPrefix] = useState('Asst. Prof.');
  const [firstName, setFirstName] = useState('Pusadee');
  const [lastName, setLastName] = useState('Seresangtakul');
  const [middleName, setMiddleName] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('pusadee@kku.ac.th');
  const [nationality, setNationality] = useState('Thai');
  const [search, setSearch] = useState('');

  const [openPrefix, setOpenPrefix] = useState(false);
  const prefixRef = useRef<HTMLDivElement>(null);

  const [openNationality, setOpenNationality] = useState(false);
  const nationalityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        prefixRef.current && !prefixRef.current.contains(e.target as Node) &&
        nationalityRef.current && !nationalityRef.current.contains(e.target as Node)
      ) {
        setOpenPrefix(false);
        setOpenNationality(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">Edit Advisor</h1>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT: Personal Information Form */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-5">
            <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Personal Information</p>

            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {(firstName[0] ?? '') + (lastName[0] ?? '')}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors">
                <RiUpload2Line size={15} />
                Upload New Photo
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Prefix */}
              <div ref={prefixRef} className="flex flex-col gap-1 relative">
                <label className="text-xs font-medium text-primary/50">Prefix</label>

                {/* Trigger */}
                <button
                  onClick={() => setOpenPrefix(prev => !prev)}
                  className="group w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary"
                >
                  {prefix}

                  <span
                    className={clsx(
                      'text-gray-400 text-2xl transition-all duration-200 group-hover:text-primary',
                      openPrefix && 'rotate-180'
                    )}
                  >
                    <RiArrowDropDownLine />
                  </span>
                </button>

                {/* Dropdown */}
                {openPrefix && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                    {PREFIXES.map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setPrefix(p);
                          setOpenPrefix(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm hover:bg-primary/10',
                          prefix === p ? 'text-primary font-medium' : 'text-gray-600'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* First Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Middle Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={e => setMiddleName(e.target.value)}
                  placeholder="(optional)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors placeholder-gray-300"
                />
              </div>

              {/* Tel */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Tel No.</label>
                <input
                  type="text"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/50">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Nationality */}
              <div ref={nationalityRef} className="flex flex-col gap-1 md:col-span-2 relative">
                <label className="text-xs font-medium text-primary/50">Nationality</label>

                {/* Trigger */}
                <button
                  onClick={() => setOpenNationality(prev => !prev)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
                >
                  {nationality}
                  <span
                    className={clsx(
                      'text-gray-400 text-2xl transition-all duration-200 group-hover:text-primary',
                      openPrefix && 'rotate-180'
                    )}
                  >
                    <RiArrowDropDownLine />
                  </span>
                </button>

                {/* Dropdown */}
                {openNationality && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {NATIONALITIES.map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          setNationality(n);
                          setOpenNationality(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors',
                          nationality === n ? 'text-primary font-medium' : 'text-gray-600'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" label="Cancel" onClick={() => router.back()} />
            <Button variant="primary" label="Save Changes" onClick={() => { }} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-5">

          {/* Tasks Overview */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Tasks Overview</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Students', value: 2 },
                { label: 'Done Request', value: 2 },
                { label: 'Request To Do', value: 2 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 flex flex-col items-center gap-1">
                  <p className="text-xl font-bold text-primary">{value}</p>
                  <p className="text-xs text-gray-400 text-center leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Students */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary/60 uppercase tracking-wide">Assigned Students</p>
              <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <RiAddLine size={14} />
                Add Students
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-primary transition-colors">
              <RiSearchLine size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* Student List */}
            <div className="flex flex-col gap-2">
              {mockStudents
                .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
                .map(s => (
                  <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {s.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <button
                      onClick={() => { }}
                      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
