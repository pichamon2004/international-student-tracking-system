'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { RiSearchLine, RiAddLine } from 'react-icons/ri';
import Button from '@/components/ui/Button';

type StudentStatus = 'Active' | 'Inactive';

interface Student {
  id: number;
  studentId: string;
  name: string;
  nationality: string;
  level: string;
  major: string;
  advisor: string;
  status: StudentStatus;
}

const mockStudents: Student[] = [
  { id: 1, studentId: '645020082-4', name: 'Joanna Sofia',  nationality: 'Indonesian', level: 'Ph.D.', major: 'CS+IT', advisor: 'Lect. Pawina', status: 'Active'   },
  { id: 2, studentId: '645020081-6', name: 'Liu Chen',      nationality: 'Chinese',    level: 'M.Sc.', major: 'DS+AI', advisor: 'Lect. Kamron', status: 'Inactive' },
  { id: 3, studentId: '663380599-8', name: 'Thitikorn S.',  nationality: 'Vietnamese', level: 'Ph.D.', major: 'GIS',   advisor: 'Lect. Arfat',  status: 'Active'   },
  { id: 4, studentId: '653040001-7', name: 'Zhang Wei',     nationality: 'Chinese',    level: 'M.Sc.', major: 'CE',    advisor: 'Lect. Pawina', status: 'Active'   },
];

const STATUS_FILTERS = ['All', 'Active', 'Inactive'] as const;

export default function StaffStudentPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('All');

  const filteredStudents = mockStudents.filter(s => {
    const q = search.toLowerCase();
    return (s.name.toLowerCase().includes(q) || s.studentId.includes(q)) &&
           (filter === 'All' || s.status === filter);
  });

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-2xl font-semibold text-primary">Student Management</p>
        <button onClick={() => {}} className="bg-primary text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all duration-200 text-sm font-medium">
          <RiAddLine size={16} /> Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 bg-gray-50 focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search name or student ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full" />
        </div>
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-t">
          <thead>
            <tr className="border-b">
              <th className="text-left   py-4 px-4 font-semibold text-primary">Student ID</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Name</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Nationality</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Level</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Major</th>
              <th className="text-left   py-4 px-4 font-semibold text-primary">Advisor</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
              <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0
              ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">No students found</td></tr>
              : filteredStudents.map(s => (
                <tr key={s.id} className="border-b last:border-none hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">{s.studentId}</td>
                  <td className="py-3 px-4 text-primary font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-primary">{s.nationality}</td>
                  <td className="py-3 px-4 text-primary">{s.level}</td>
                  <td className="py-3 px-4 text-primary">{s.major}</td>
                  <td className="py-3 px-4 text-primary">{s.advisor}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="info"   onClick={() => router.push(`/staff/students/${s.id}`)} />
                      <Button variant="danger" label="Delete" onClick={() => {}} />
                    </div>
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
