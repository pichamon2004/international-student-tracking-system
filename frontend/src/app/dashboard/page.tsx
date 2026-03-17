'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Users, AlertTriangle, FileText, Globe } from 'lucide-react';

interface Stats {
  totalStudents: number;
  expiringPassports: number;
  expiringVisas: number;
  nationalities: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, expiringPassports: 0, expiringVisas: 0, nationalities: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/students?limit=1000');
        const students = res.data.data || [];
        const now = new Date();
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        const nationalities = new Set(students.map((s: { nationality: string }) => s.nationality)).size;
        const expiringPassports = students.filter((s: { passport?: { expiryDate: string } }) =>
          s.passport && new Date(s.passport.expiryDate) <= in60Days
        ).length;
        const expiringVisas = students.filter((s: { visas?: Array<{ expiryDate: string }> }) =>
          s.visas?.some((v) => new Date(v.expiryDate) <= in60Days)
        ).length;
        setStats({ totalStudents: res.data.pagination?.total || 0, expiringPassports, expiringVisas, nationalities });
      } catch {}
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'นักศึกษาทั้งหมด', value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
    { label: 'หนังสือเดินทางใกล้หมดอายุ', value: stats.expiringPassports, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'วีซ่าใกล้หมดอายุ', value: stats.expiringVisas, icon: FileText, color: 'bg-red-500' },
    { label: 'สัญชาติ', value: stats.nationalities, icon: Globe, color: 'bg-green-500' },
  ];

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">แดชบอร์ด</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
              <div className={`${color} p-3 rounded-lg`}>
                <Icon className="text-white" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
