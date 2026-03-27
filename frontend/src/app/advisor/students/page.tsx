'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { RiSearchLine, RiArrowDropDownLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { advisorApi, type ApiAdvisor } from '@/lib/api';

type Student = NonNullable<ApiAdvisor['students']>[number];

function getVisaInfo(student: Student): { status: 'Active' | 'Expiring Soon' | 'Expired' | 'No Visa'; days: number | null } {
  if (!student.visas || student.visas.length === 0) return { status: 'No Visa', days: null };
  const visa = student.visas[0];
  const days = Math.ceil((new Date(visa.expiryDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { status: 'Expired', days };
  if (days <= 45) return { status: 'Expiring Soon', days };
  return { status: 'Active', days };
}

function visaDaysBadge(status: string, days: number | null): { label: string; cls: string } {
  if (status === 'No Visa') return { label: 'No Visa', cls: 'bg-gray-100 text-gray-500' };
  if (status === 'Expired') return { label: 'Expired', cls: 'bg-red-100 text-red-600' };
  if (days === null)        return { label: 'Active',  cls: 'bg-green-100 text-green-700' };
  if (days < 14)  return { label: `${days} days`, cls: 'bg-red-100 text-red-600' };
  if (days <= 45) return { label: `${days} days`, cls: 'bg-yellow-100 text-yellow-600' };
  return { label: `${days} days`, cls: 'bg-green-100 text-green-700' };
}

const VISA_FILTERS = ['All', 'Active', 'Expiring Soon', 'Expired'] as const;
const REG_FILTERS   = ['All', 'Active', 'Pending', 'Incomplete']    as const;

export default function AdvisorStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,     setSearch]     = useState('');
  const [visaFilter, setVisaFilter] = useState<typeof VISA_FILTERS[number]>('All');
  const [regFilter,  setRegFilter]  = useState<typeof REG_FILTERS[number]>('All');
  const [openVisa,   setOpenVisa]   = useState(false);
  const [openReg,    setOpenReg]    = useState(false);
  const visaRef = useRef<HTMLDivElement>(null);
  const regRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    advisorApi.getMe()
      .then(res => setStudents(res.data.data.students ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        visaRef.current && !visaRef.current.contains(e.target as Node) &&
        regRef.current  && !regRef.current.contains(e.target as Node)
      ) { setOpenVisa(false); setOpenReg(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const name = [s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ');
    const matchSearch = name.toLowerCase().includes(q) || (s.studentId ?? '').toLowerCase().includes(q);
    const matchVisa = visaFilter === 'All' || getVisaInfo(s).status === visaFilter;
    const matchReg = regFilter === 'All'
      || (regFilter === 'Active'   && s.registrationStatus === 'ACTIVE')
      || (regFilter === 'Pending'  && s.registrationStatus === 'PENDING_APPROVAL')
      || (regFilter === 'Incomplete' && !['ACTIVE', 'PENDING_APPROVAL'].includes(s.registrationStatus));
    return matchSearch && matchVisa && matchReg;
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-2xl font-semibold text-primary">My Students ({students.length})</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] bg-gray-50 focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name or student ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full" />
        </div>

        <div ref={visaRef} className="relative min-w-[160px]">
          <button onClick={() => { setOpenVisa(p => !p); setOpenReg(false); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-gray-50 flex items-center justify-between hover:border-primary">
            {visaFilter === 'All' ? 'All Visa Status' : visaFilter}
            <RiArrowDropDownLine size={24} className={clsx('text-gray-400 transition-all duration-200', openVisa && 'rotate-180')} />
          </button>
          {openVisa && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {VISA_FILTERS.map(v => (
                <button key={v} onClick={() => { setVisaFilter(v); setOpenVisa(false); }}
                  className={clsx('w-full text-left px-3 py-2 text-sm hover:bg-primary/10', visaFilter === v ? 'text-primary font-medium' : 'text-gray-600')}>
                  {v === 'All' ? 'All Visa Status' : v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={regRef} className="relative min-w-[160px]">
          <button onClick={() => { setOpenReg(p => !p); setOpenVisa(false); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-gray-50 flex items-center justify-between hover:border-primary">
            {regFilter === 'All' ? 'All Registration' : regFilter}
            <RiArrowDropDownLine size={24} className={clsx('text-gray-400 transition-all duration-200', openReg && 'rotate-180')} />
          </button>
          {openReg && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {REG_FILTERS.map(r => (
                <button key={r} onClick={() => { setRegFilter(r); setOpenReg(false); }}
                  className={clsx('w-full text-left px-3 py-2 text-sm hover:bg-primary/10', regFilter === r ? 'text-primary font-medium' : 'text-gray-600')}>
                  {r === 'All' ? 'All Registration' : r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-t">
          <thead>
            <tr className="border-b">
              <th className="text-left   py-4 px-4 font-semibold text-primary">Student</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Student ID</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Faculty</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Program</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Visa Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Registration</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filteredStudents.length === 0
              ? <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No students found</td></tr>
              : filteredStudents.map(s => {
                const name = [s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ') || '—';
                const { status: visaStatus, days: visaDays } = getVisaInfo(s);
                const isActive = s.registrationStatus === 'ACTIVE';
                return (
                  <tr key={s.id} className="border-b last:border-none hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {name.split(' ').filter(w => /^[A-Z]/i.test(w)).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </div>
                        <span className="text-primary font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-primary text-xs font-mono">{s.studentId ?? '—'}</td>
                    <td className="py-3 px-4 text-primary">{s.faculty ?? '—'}</td>
                    <td className="py-3 px-4 text-primary">{s.program ?? '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {(() => { const { label, cls } = visaDaysBadge(visaStatus, visaDays); return (
                        <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cls)}>{label}</span>
                      ); })()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                        {isActive ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="info" onClick={() => router.push(`/advisor/students/${s.id}`)} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
