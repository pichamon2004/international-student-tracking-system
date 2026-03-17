'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Student } from '@/types';
import { Search, Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { page: p, limit: 10, search: q } });
      setStudents(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotal(res.data.pagination?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents(1, search);
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">นักศึกษาต่างชาติ</h2>
            <p className="text-gray-500 text-sm">ทั้งหมด {total} คน</p>
          </div>
          <Link href="/students/new" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={16} />
            เพิ่มนักศึกษา
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสนักศึกษา, สัญชาติ..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </form>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">รหัสนักศึกษา</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">สัญชาติ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">หนังสือเดินทาง</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">วีซ่า</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">โปรแกรม</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">ไม่พบข้อมูล</td></tr>
              ) : students.map((s) => {
                const passportExpiry = s.passport?.expiryDate ? dayjs(s.passport.expiryDate) : null;
                const visaExpiry = s.visas?.[0]?.expiryDate ? dayjs(s.visas[0].expiryDate) : null;
                const isPassportExpiring = passportExpiry && passportExpiry.diff(dayjs(), 'day') <= 60;
                const isVisaExpiring = visaExpiry && visaExpiry.diff(dayjs(), 'day') <= 60;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{s.studentId}</td>
                    <td className="px-4 py-3 text-sm">{s.firstNameEn} {s.lastNameEn}</td>
                    <td className="px-4 py-3 text-sm">{s.nationality}</td>
                    <td className="px-4 py-3 text-sm">
                      {s.passport ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${isPassportExpiring ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {passportExpiry?.format('DD/MM/YYYY')}
                        </span>
                      ) : <span className="text-gray-400 text-xs">ไม่มีข้อมูล</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {s.visas?.[0] ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${isVisaExpiring ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {s.visas[0].visaType} | {visaExpiry?.format('DD/MM/YYYY')}
                        </span>
                      ) : <span className="text-gray-400 text-xs">ไม่มีข้อมูล</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.program || '-'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm">
                        <Eye size={16} />
                        ดูข้อมูล
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">หน้า {page} จาก {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => { setPage(p => p - 1); fetchStudents(page - 1); }} disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"><ChevronLeft size={18} /></button>
                <button onClick={() => { setPage(p => p + 1); fetchStudents(page + 1); }} disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
