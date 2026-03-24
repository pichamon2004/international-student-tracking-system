'use client';

import { RiUser3Line } from 'react-icons/ri';
import StudentWorldMap from '@/components/ui/StudentWorldMap';
import { BsFillPersonFill } from 'react-icons/bs';
import { IoDocumentText } from 'react-icons/io5';
import { FaIdCard, FaPassport } from 'react-icons/fa6';

const statCards = [
  { label: 'New Students Pending',     value: 8,  icon: BsFillPersonFill, iconBg: '#DEEBFF', iconColor: '#578FCA' },
  { label: 'Documents Pending',        value: 10, icon: IoDocumentText,   iconBg: '#DFC2FF', iconColor: '#8B2CF5' },
  { label: 'Visa Expiring Soon',       value: 10, icon: FaIdCard,         iconBg: '#FFC5C6', iconColor: '#FF0000' },
  { label: 'Passport Expiring Soon',   value: 10, icon: FaPassport,       iconBg: '#FFC5C6', iconColor: '#FF0000' },
];

const expiringVisas = [
  { name: 'Liu Chen',      country: 'China',   daysLeft: 10, expireDate: '2025-10-10' },
  { name: 'Aung Kyaw',     country: 'Myanmar', daysLeft: 15, expireDate: '2025-10-10' },
  { name: 'Tran Van Minh', country: 'Vietnam', daysLeft: 20, expireDate: '2025-10-10' },
];

const countryStats = [
  { country: 'China',   count: 3, percent: 37, coordinates: [104.19, 35.86] as [number, number], flag: '🇨🇳' },
  { country: 'Myanmar', count: 2, percent: 25, coordinates: [95.96,  21.92] as [number, number], flag: '🇲🇲' },
  { country: 'Vietnam', count: 2, percent: 25, coordinates: [108.28, 14.06] as [number, number], flag: '🇻🇳' },
  { country: 'Laos',    count: 1, percent: 13, coordinates: [102.50, 17.97] as [number, number], flag: '🇱🇦' },
];

export default function StaffDashboardPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm px-4 md:px-8 flex items-center gap-3 md:gap-4 h-[100px]  2xl:h-[130px] ">
            <div className="rounded-full p-3 md:p-6 flex-shrink-0" style={{ backgroundColor: iconBg }}>
              <Icon className="w-5 h-5 md:w-8 md:h-8 2xl:w-10 :h-10" style={{ color: iconColor }} />
            </div>
            <div className="flex-1 text-right flex items-end flex-col justify-between h-full py-5 2xl:py-10">
              <p className="text-xl md:text-2xl 2xl:text-3xl font-bold text-primary">{value}</p>
              <p className="text-xs 2xl:text-sm font-medium text-primary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Grid: Visa Expiring + World Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Expiring Visas */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-primary">Visa Expiring Soon</h2>
          <hr className="my-4" />
          <div className="space-y-3">
            {expiringVisas.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <RiUser3Line size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-500">{s.daysLeft} Days</p>
                  <p className="text-xs text-gray-400">{s.expireDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Students by Country */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col">
          <h2 className="text-2xl font-semibold text-primary mb-2">Students by Country</h2>
          <hr className="mb-4" />
          <StudentWorldMap data={countryStats} />
          <div className="space-y-3 mt-4">
            {countryStats.map((c) => (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{c.flag}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{c.country}</span>
                    <span className="text-gray-400">{c.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${c.percent}%`, backgroundColor: '#0776BC' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
