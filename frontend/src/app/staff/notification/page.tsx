'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiSearchLine, RiAlarmWarningLine, RiArrowDropDownLine } from 'react-icons/ri';
import { MdOutlineMarkEmailRead } from 'react-icons/md';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';
import { studentApi, type ApiStudentWithExpiry } from '@/lib/api';
import FollowUpModal from '@/components/FollowUpModal';

type AlertType = 'Visa' | 'Passport' | 'Health Insurance';
type AlertStatus = 'critical' | 'warning' | 'normal' | 'expired';

interface AlertRow {
  key: string;
  studentDbId: number;
  studentId: string;
  name: string;
  nationality: string;
  advisor: string;
  type: AlertType;
  daysRemaining: number;
  status: AlertStatus;
}

function getStatus(days: number): AlertStatus {
  if (days <= 0)  return 'expired';
  if (days <= 14) return 'critical';
  if (days <= 45) return 'warning';
  return 'normal';
}

function daysLeft(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function buildAlerts(students: ApiStudentWithExpiry[]): AlertRow[] {
  const rows: AlertRow[] = [];
  for (const s of students) {
    const name = [s.titleEn, s.firstNameEn, s.lastNameEn].filter(Boolean).join(' ') || 'Unknown';
    const nationality = s.nationality ?? s.homeCountry ?? '—';
    const studentId = s.studentId ?? '—';
    const advisor = s.advisor
      ? [s.advisor.titleEn, s.advisor.firstNameEn, s.advisor.lastNameEn].filter(Boolean).join(' ')
      : '—';

    if (s.visas?.[0]?.expiryDate) {
      const days = daysLeft(s.visas[0].expiryDate);
      rows.push({ key: `visa-${s.id}`, studentDbId: s.id, studentId, name, nationality, advisor, type: 'Visa', daysRemaining: days, status: getStatus(days) });
    }
    if (s.passports?.[0]?.expiryDate) {
      const days = daysLeft(s.passports[0].expiryDate);
      rows.push({ key: `passport-${s.id}`, studentDbId: s.id, studentId, name, nationality, advisor, type: 'Passport', daysRemaining: days, status: getStatus(days) });
    }
    if (s.healthInsurances?.[0]?.expiryDate) {
      const days = daysLeft(s.healthInsurances[0].expiryDate);
      rows.push({ key: `ins-${s.id}`, studentDbId: s.id, studentId, name, nationality, advisor, type: 'Health Insurance', daysRemaining: days, status: getStatus(days) });
    }
  }
  return rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

const statusConfig: Record<AlertStatus, { label: string; className: string }> = {
  critical: { label: 'Critical (0–14 days)', className: 'bg-red-100 text-red-500'        },
  warning:  { label: 'Warning (15–45 days)', className: 'bg-yellow-100 text-yellow-600'  },
  normal:   { label: 'Normal (>45 days)',    className: 'bg-green-100 text-green-600'    },
  expired:  { label: 'Expired',             className: 'bg-gray-100 text-gray-500'       },
};

const typeConfig: Record<AlertType, string> = {
  'Visa':             'bg-blue-100 text-blue-700',
  'Passport':         'bg-purple-100 text-purple-700',
  'Health Insurance': 'bg-orange-100 text-orange-700',
};

const STATUS_OPTIONS = ['All Status', 'Critical', 'Warning', 'Normal', 'Expired'];
const TYPE_OPTIONS   = ['All Types', 'Visa', 'Passport', 'Health Insurance'];

export default function StaffNotificationPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState<{ studentDbId: number; studentName: string; alertType: string } | null>(null);
  const [search, setSearch]       = useState('');
  const [statusFlt, setStatusFlt] = useState('All Status');
  const [typeFlt, setTypeFlt]     = useState('All Types');
  const [openStatus, setOpenStatus] = useState(false);
  const [openType, setOpenType]     = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    studentApi.getAll({ limit: 1000 })
      .then(res => setAlerts(buildAlerts(res.data.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusRef.current && !statusRef.current.contains(e.target as Node) &&
        typeRef.current   && !typeRef.current.contains(e.target as Node)
      ) { setOpenStatus(false); setOpenType(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const counts = {
    critical: alerts.filter(a => a.status === 'critical').length,
    warning:  alerts.filter(a => a.status === 'warning').length,
    normal:   alerts.filter(a => a.status === 'normal').length,
    expired:  alerts.filter(a => a.status === 'expired').length,
  };

  const statCards = [
    { label: 'Critical (0–14 days)', value: counts.critical, iconColor: '#FF0000', iconBg: '#FFC5C6' },
    { label: 'Warning (15–45 days)', value: counts.warning,  iconColor: '#F59E0B', iconBg: '#FEF3C7' },
    { label: 'Normal (>45 days)',    value: counts.normal,   iconColor: '#10B981', iconBg: '#D1FAE5' },
    { label: 'Expired',              value: counts.expired,  iconColor: '#6B7280', iconBg: '#F3F4F6' },
  ];

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q) || a.studentId.toLowerCase().includes(q);
    const matchStatus =
      statusFlt === 'All Status' ||
      (statusFlt === 'Critical' && a.status === 'critical') ||
      (statusFlt === 'Warning'  && a.status === 'warning')  ||
      (statusFlt === 'Normal'   && a.status === 'normal')   ||
      (statusFlt === 'Expired'  && a.status === 'expired');
    const matchType = typeFlt === 'All Types' || a.type === typeFlt;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map(({ label, value, iconColor, iconBg }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm px-4 md:px-8 flex items-center gap-3 md:gap-4 h-[100px] md:h-[140px]">
            <div className="rounded-full p-3 md:p-5 flex-shrink-0" style={{ backgroundColor: iconBg }}>
              <RiAlarmWarningLine className="w-5 h-5 md:w-8 md:h-8" style={{ color: iconColor }} />
            </div>
            <div className="flex-1 text-right flex items-end flex-col justify-between h-full py-5 md:py-8">
              <p className="text-xl md:text-3xl font-bold text-primary">{loading ? '—' : value}</p>
              <p className="text-xs md:text-sm font-medium text-primary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] bg-white focus-within:border-primary transition-colors">
          <RiSearchLine size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search name or student ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-primary placeholder-gray-400 outline-none w-full"
          />
        </div>

        <div ref={typeRef} className="relative min-w-[180px]">
          <button
            onClick={() => { setOpenType(p => !p); setOpenStatus(false); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
          >
            {typeFlt}
            <RiArrowDropDownLine size={24} className={clsx('text-gray-400 transition-all duration-200', openType && 'rotate-180')} />
          </button>
          {openType && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {TYPE_OPTIONS.map(o => (
                <button key={o} onClick={() => { setTypeFlt(o); setOpenType(false); }}
                  className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-primary/10', typeFlt === o ? 'text-primary font-medium' : 'text-gray-600')}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={statusRef} className="relative min-w-[180px]">
          <button
            onClick={() => { setOpenStatus(p => !p); setOpenType(false); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
          >
            {statusFlt}
            <RiArrowDropDownLine size={24} className={clsx('text-gray-400 transition-all duration-200', openStatus && 'rotate-180')} />
          </button>
          {openStatus && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {STATUS_OPTIONS.map(o => (
                <button key={o} onClick={() => { setStatusFlt(o); setOpenStatus(false); }}
                  className={clsx('w-full text-left px-4 py-2 text-sm hover:bg-primary/10', statusFlt === o ? 'text-primary font-medium' : 'text-gray-600')}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alert Management Table */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <p className="text-xl font-semibold text-primary">Alert Management</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-t">
            <thead>
              <tr className="border-b">
                <th className="text-left   py-4 px-4 font-semibold text-primary">Student ID</th>
                <th className="text-left   py-4 px-4 font-semibold text-primary">Name</th>
                <th className="text-left   py-4 px-4 font-semibold text-primary">Nationality</th>
                <th className="text-left   py-4 px-4 font-semibold text-primary">Advisor</th>
                <th className="text-center py-4 px-4 font-semibold text-primary">Type</th>
                <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400 text-sm">No alerts found</td>
                </tr>
              ) : filtered.map(a => {
                const cfg = statusConfig[a.status];
                return (
                  <tr key={a.key} className="border-b last:border-none hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{a.studentId}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {a.name.split(' ').filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                        </div>
                        <span className="text-primary font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-primary">{a.nationality}</td>
                    <td className="py-3 px-4 text-primary text-sm">{a.advisor}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', typeConfig[a.type])}>
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-3 py-1 rounded-2xl text-sm font-semibold whitespace-nowrap', cfg.className)}>
                        {a.daysRemaining <= 0 ? 'Expired' : `${a.daysRemaining} days left`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="info" onClick={() => router.push(`/staff/students/${a.studentDbId}`)} />
                        <button
                          onClick={() => setFollowUp({ studentDbId: a.studentDbId, studentName: a.name, alertType: a.type })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-white hover:bg-yellow-500 transition whitespace-nowrap"
                        >
                          <MdOutlineMarkEmailRead size={14} /> Follow Up
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {followUp && (
        <FollowUpModal
          studentDbId={followUp.studentDbId}
          studentName={followUp.studentName}
          alertType={followUp.alertType}
          onClose={() => setFollowUp(null)}
        />
      )}
    </div>
  );
}
