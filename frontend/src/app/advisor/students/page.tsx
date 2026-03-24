'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { RiSearchLine, RiArrowDropDownLine } from 'react-icons/ri';
import { clsx } from 'clsx';

type VisaStatus = 'Active' | 'Expired' | 'Expiring Soon';

interface Student {
  id: number;
  studentId: string;
  name: string;
  nationality: string;
  faculty: string;
  degree: string;
  visaStatus: VisaStatus;
  registered: boolean;
}

const mockStudents: Student[] = [
  { id: 1, studentId: '653040001-7', name: 'Zhang Wei',    nationality: 'Chinese',    faculty: 'Engineering', degree: "Master's",   visaStatus: 'Active',        registered: true  },
  { id: 2, studentId: '653040002-5', name: 'Joanna Sofia', nationality: 'Indonesian', faculty: 'Computing',   degree: "Master's",   visaStatus: 'Expiring Soon', registered: true  },
  { id: 3, studentId: '653040003-3', name: 'Liu Chen',     nationality: 'Chinese',    faculty: 'Computing',   degree: 'Doctoral',   visaStatus: 'Active',        registered: false },
  { id: 4, studentId: '653040004-1', name: 'Aung Kyaw',    nationality: 'Burmese',    faculty: 'Science',     degree: "Master's",   visaStatus: 'Expired',       registered: true  },
  { id: 5, studentId: '653040005-9', name: 'Maria Santos', nationality: 'Filipino',   faculty: 'Engineering', degree: "Bachelor's", visaStatus: 'Active',        registered: true  },
  { id: 6, studentId: '653040006-7', name: 'Priya Sharma', nationality: 'Indian',     faculty: 'Computing',   degree: "Master's",   visaStatus: 'Expiring Soon', registered: false },
];

const visaStatusConfig: Record<VisaStatus, string> = {
  'Active':        'bg-green-100 text-green-700',
  'Expiring Soon': 'bg-yellow-100 text-yellow-700',
  'Expired':       'bg-red-100 text-red-600',
};

const NATIONALITIES = ['All', ...Array.from(new Set(mockStudents.map(s => s.nationality)))];
const VISA_FILTERS  = ['All', 'Active', 'Expiring Soon', 'Expired'] as const;
const REG_FILTERS   = ['All', 'Registered', 'Incomplete']           as const;

export default function AdvisorStudentsPage() {
  const router = useRouter();

  const [search,      setSearch]      = useState('');
  const [nationality, setNationality] = useState('All');
  const [visaFilter,  setVisaFilter]  = useState<typeof VISA_FILTERS[number]>('All');
  const [regFilter,   setRegFilter]   = useState<typeof REG_FILTERS[number]>('All');
  const [openNat,     setOpenNat]     = useState(false);
  const [openVisa,    setOpenVisa]    = useState(false);
  const [openReg,     setOpenReg]     = useState(false);
  const natRef  = useRef<HTMLDivElement>(null);
  const visaRef = useRef<HTMLDivElement>(null);
  const regRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        natRef.current  && !natRef.current.contains(e.target as Node)  &&
        visaRef.current && !visaRef.current.contains(e.target as Node) &&
        regRef.current  && !regRef.current.contains(e.target as Node)
      ) { setOpenNat(false); setOpenVisa(false); setOpenReg(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStudents = mockStudents.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.name.toLowerCase().includes(q) || s.studentId.includes(q)) &&
      (nationality === 'All' || s.nationality === nationality) &&
      (visaFilter  === 'All' || s.visaStatus  === visaFilter)  &&
      (regFilter   === 'All'
        || (regFilter === 'Registered' && s.registered)
        || (regFilter === 'Incomplete'  && !s.registered))
    );
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-2xl font-semibold text-primary">Student Management</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] bg-gray-50 focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name or student ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full" />
        </div>

        <div ref={natRef} className="relative min-w-[180px]">
          <button onClick={() => { setOpenNat(p => !p); setOpenVisa(false); setOpenReg(false); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-primary bg-gray-50 flex items-center justify-between hover:border-primary">
            {nationality === 'All' ? 'All Nationalities' : nationality}
            <RiArrowDropDownLine size={24} className={clsx('text-gray-400 transition-all duration-200', openNat && 'rotate-180')} />
          </button>
          {openNat && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
              {NATIONALITIES.map(n => (
                <button key={n} onClick={() => { setNationality(n); setOpenNat(false); }}
                  className={clsx('w-full text-left px-3 py-2 text-sm hover:bg-primary/10', nationality === n ? 'text-primary font-medium' : 'text-gray-600')}>
                  {n === 'All' ? 'All Nationalities' : n}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={visaRef} className="relative min-w-[160px]">
          <button onClick={() => { setOpenVisa(p => !p); setOpenNat(false); setOpenReg(false); }}
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
          <button onClick={() => { setOpenReg(p => !p); setOpenNat(false); setOpenVisa(false); }}
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
              <th className="text-left   py-4 px-4 font-semibold text-primary">Nationality</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Faculty</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Visa Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Registration</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0
              ? <tr><td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No students found</td></tr>
              : filteredStudents.map(s => (
                <tr key={s.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {s.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-primary font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-primary text-xs font-mono">{s.studentId}</td>
                  <td className="py-3 px-4 text-primary">{s.nationality}</td>
                  <td className="py-3 px-4 text-primary">{s.faculty}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', visaStatusConfig[s.visaStatus])}>{s.visaStatus}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', s.registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {s.registered ? 'Registered' : 'Incomplete'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button variant="info" onClick={() => router.push(`/advisor/students/${s.id}`)} />
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

    </div>
  );
}
