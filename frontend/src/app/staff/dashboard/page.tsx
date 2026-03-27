'use client';

import { useState, useEffect } from 'react';
import { RiUser3Line } from 'react-icons/ri';
import StudentWorldMap from '@/components/ui/StudentWorldMap';
import { BsFillPersonFill } from 'react-icons/bs';
import { IoDocumentText } from 'react-icons/io5';
import { FaIdCard, FaPassport } from 'react-icons/fa6';
import { studentApi, visaRenewalApi, requestApi, type ApiVisaRenewal, type ApiStudentWithExpiry } from '@/lib/api';

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  'China':        [104.19, 35.86],
  'Myanmar':      [95.96,  21.92],
  'Vietnam':      [108.28, 14.06],
  'Laos':         [102.50, 17.97],
  'Thailand':     [100.99, 15.87],
  'Cambodia':     [104.99, 12.57],
  'Indonesia':    [113.92, -0.79],
  'India':        [78.96,  20.59],
  'Philippines':  [121.77, 12.88],
  'Japan':        [138.25, 36.20],
  'South Korea':  [127.77, 35.91],
  'Saudi Arabia': [45.08,  23.89],
};

const COUNTRY_FLAGS: Record<string, string> = {
  'China': '🇨🇳', 'Myanmar': '🇲🇲', 'Vietnam': '🇻🇳', 'Laos': '🇱🇦',
  'Thailand': '🇹🇭', 'Cambodia': '🇰🇭', 'Indonesia': '🇮🇩', 'India': '🇮🇳',
  'Philippines': '🇵🇭', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Saudi Arabia': '🇸🇦',
};

function daysLeft(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function buildCountryStats(students: ApiStudentWithExpiry[]) {
  const counts: Record<string, number> = {};
  for (const s of students) {
    if (s.homeCountry) {
      counts[s.homeCountry] = (counts[s.homeCountry] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({
      country,
      count,
      percent: Math.round((count / total) * 100),
      coordinates: (COUNTRY_COORDINATES[country] ?? [100, 15]) as [number, number],
      flag: COUNTRY_FLAGS[country] ?? '🌍',
    }));
}

export default function StaffDashboardPage() {
  const [expiringVisas, setExpiringVisas] = useState<ApiVisaRenewal[]>([]);
  const [countryStats, setCountryStats] = useState<ReturnType<typeof buildCountryStats>>([]);
  const [statValues, setStatValues] = useState({ newStudents: 0, pendingDocs: 0, visaExpiring: 0, passportExpiring: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [visaRes, studentsRes, requestsRes] = await Promise.all([
          visaRenewalApi.getAll({ isResolved: false }),
          studentApi.getAll({ limit: 1000 }),
          requestApi.getAll({ status: 'PENDING' }),
        ]);

        const visas = visaRes.data.data;
        const students = studentsRes.data.data as ApiStudentWithExpiry[];
        const pendingRequests = requestsRes.data.data;

        const newStudentsPending = students.filter(
          (s) => s.registrationStatus === 'PENDING_APPROVAL'
        ).length;

        const visaExpiring = students.filter(s => {
          const exp = s.visas?.[0]?.expiryDate;
          return exp ? daysLeft(exp) < 14 : false;
        }).length;

        const passportExpiring = students.filter(s => {
          const exp = s.passports?.[0]?.expiryDate;
          return exp ? daysLeft(exp) < 14 : false;
        }).length;

        setExpiringVisas(visas);
        setCountryStats(buildCountryStats(students));
        setStatValues({
          newStudents: newStudentsPending,
          pendingDocs: pendingRequests.length,
          visaExpiring,
          passportExpiring,
        });
      } catch {
        // Silently handle errors — page remains visible with zeros
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    { label: 'New Students Pending',   value: statValues.newStudents,    icon: BsFillPersonFill, iconBg: '#DEEBFF', iconColor: '#578FCA' },
    { label: 'Documents Pending',      value: statValues.pendingDocs,    icon: IoDocumentText,   iconBg: '#DFC2FF', iconColor: '#8B2CF5' },
    { label: 'Visa Expiring Soon',     value: statValues.visaExpiring,   icon: FaIdCard,         iconBg: '#FFC5C6', iconColor: '#FF0000' },
    { label: 'Passport Expiring Soon', value: statValues.passportExpiring, icon: FaPassport,     iconBg: '#FFC5C6', iconColor: '#FF0000' },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm px-4 md:px-8 flex items-center gap-3 md:gap-4 h-[100px] md:h-[130px]">
            <div className="rounded-full p-3 md:p-6 flex-shrink-0" style={{ backgroundColor: iconBg }}>
              <Icon className="w-5 h-5 md:w-8 md:h-8 2xl:w-10 :h-10" style={{ color: iconColor }} />
            </div>
            <div className="flex-1 text-right flex items-end flex-col justify-between h-full py-5 2xl:py-10">
              <p className="text-xl md:text-2xl 2xl:text-3xl font-bold text-primary">
                {loading ? '—' : value}
              </p>
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
            {loading && (
              <div className="animate-pulse space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                ))}
              </div>
            )}
            {!loading && expiringVisas.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No expiring visas at this time.</p>
            )}
            {!loading && expiringVisas.map((v) => {
              const name = [v.student?.firstNameEn, v.student?.lastNameEn].filter(Boolean).join(' ') || 'Unknown';
              const country = v.student?.homeCountry ?? '—';
              const expireDate = v.student?.visas?.[0]?.expiryDate
                ? new Date(v.student.visas[0].expiryDate).toISOString().slice(0, 10)
                : '—';
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition border">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <RiUser3Line size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{name}</p>
                    <p className="text-xs text-gray-400">{country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">{v.daysRemaining} Days</p>
                    <p className="text-xs text-gray-400">{expireDate}</p>
                  </div>
                </div>
              );
            })}
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
