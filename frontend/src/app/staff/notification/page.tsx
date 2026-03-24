'use client';

import { useState, useRef, useEffect } from 'react';
import { RiSearchLine, RiAlarmWarningLine, RiArrowDropDownLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import Button from '@/components/ui/Button';

type AlertStatus = 'visa_critical' | 'visa_warning' | 'visa_normal' | 'visa_expired';

interface AlertStudent {
  id: number;
  studentId: string;
  name: string;
  nationality: string;
  level: string;
  major: string;
  advisor: string;
  alertStatus: AlertStatus;
}

const statCards = [
  { label: 'Critical (0–14 days)', value: 8, iconColor: '#FF0000', iconBg: '#FFC5C6' },
  { label: 'Warning (15–45 days)', value: 10, iconColor: '#F59E0B', iconBg: '#FEF3C7' },
  { label: 'Normal (>45 days)', value: 10, iconColor: '#10B981', iconBg: '#D1FAE5' },
  { label: 'Expired', value: 10, iconColor: '#6B7280', iconBg: '#F3F4F6' },
];

const mockAlerts: AlertStudent[] = [
  { id: 1, studentId: '645020082-4', name: 'Joanna Sofia',  nationality: 'Indonesian', level: 'Ph.D.', major: 'CS+IT', advisor: 'Lect. Pawina',     alertStatus: 'visa_critical' },
  { id: 2, studentId: '645020081-6', name: 'Monica Sofia',  nationality: 'Cambodian',  level: 'M.Sc.', major: 'GIS',   advisor: 'Lect. Kamron',     alertStatus: 'visa_warning'  },
  { id: 3, studentId: '665380017-0', name: 'Cristina Sofia', nationality: 'American',  level: 'M.Sc.', major: 'DS+AI', advisor: 'Lect. Panyaphon',  alertStatus: 'visa_normal'   },
  { id: 4, studentId: '665380032-4', name: 'David Kim',     nationality: 'Chinese',    level: 'Ph.D.', major: 'CS+IT', advisor: 'Lect. Arfat',      alertStatus: 'visa_expired'  },
];

const alertConfig: Record<AlertStatus, { label: string; className: string }> = {
  visa_critical: { label: 'Critical (0–14 days)',  className: 'bg-red-100 text-red-600'        },
  visa_warning:  { label: 'Warning (15–45 days)',  className: 'bg-yellow-100 text-yellow-700'  },
  visa_normal:   { label: 'Normal (>45 days)',     className: 'bg-green-100 text-green-700'    },
  visa_expired:  { label: 'Expired',               className: 'bg-gray-100 text-gray-500'      },
};

const STATUS_OPTIONS = ['All', 'Critical', 'Warning', 'Normal', 'Expired'];
const TYPE_OPTIONS = ['All Document Types', 'Visa', 'Passport', 'Insurance'];

export default function StaffNotificationPage() {
  const [search, setSearch] = useState('');
  const [statusFlt, setStatusFlt] = useState('All Status');
  const [typeFlt, setTypeFlt] = useState('All Document Types');

  const filtered = mockAlerts.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.studentId.includes(q);
  });

  const [openStatus, setOpenStatus] = useState(false);
  const [openType, setOpenType] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusRef.current && !statusRef.current.contains(e.target as Node) &&
        typeRef.current && !typeRef.current.contains(e.target as Node)
      ) {
        setOpenStatus(false);
        setOpenType(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              <p className="text-xl md:text-3xl font-bold text-primary">{value}</p>
              <p className="text-xs md:text-sm font-medium text-primary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Status Filter */}
        <div ref={statusRef} className="relative min-w-[180px]">
          <button
            onClick={() => {
              setOpenStatus(prev => !prev);
              setOpenType(false);
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
          >
            {statusFlt}

            <RiArrowDropDownLine
              size={24}
              className={clsx(
                'text-gray-400 transition-all duration-200',
                openStatus && 'rotate-180'
              )}
            />
          </button>

          {openStatus && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {STATUS_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => {
                    setStatusFlt(o);
                    setOpenStatus(false);
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm hover:bg-primary/10',
                    statusFlt === o ? 'text-primary font-medium' : 'text-gray-600'
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={typeRef} className="relative min-w-[200px]">
          <button
            onClick={() => {
              setOpenType(prev => !prev);
              setOpenStatus(false);
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-primary bg-white flex items-center justify-between hover:border-primary transition-colors"
          >
            {typeFlt}

            <RiArrowDropDownLine
              size={24}
              className={clsx(
                'text-gray-400 transition-all duration-200',
                openType && 'rotate-180'
              )}
            />
          </button>

          {openType && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o}
                  onClick={() => {
                    setTypeFlt(o);
                    setOpenType(false);
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm hover:bg-primary/10',
                    typeFlt === o ? 'text-primary font-medium' : 'text-gray-600'
                  )}
                >
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
                <th className="text-left   py-4 px-4 font-semibold text-primary">Level</th>
                <th className="text-left   py-4 px-4 font-semibold text-primary">Major</th>
                <th className="text-left   py-4 px-4 font-semibold text-primary">Advisor</th>
                <th className="text-center py-4 px-4 font-semibold text-primary">Status</th>
                <th className="text-center py-4 px-4 font-semibold text-primary">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No alerts found</td>
                </tr>
              ) : filtered.map(s => {
                const cfg = alertConfig[s.alertStatus];
                return (
                  <tr key={s.id} className="border-b last:border-none hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{s.studentId}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {s.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                        </div>
                        <span className="text-primary font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-primary">{s.nationality}</td>
                    <td className="py-3 px-4 text-primary">{s.level}</td>
                    <td className="py-3 px-4 text-primary">{s.major}</td>
                    <td className="py-3 px-4 text-primary">{s.advisor}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={clsx('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cfg.className)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="info" onClick={() => { }} />
                        {(s.alertStatus === 'visa_critical' || s.alertStatus === 'visa_warning') && (
                          <Button variant="warning" label="Follow Up" onClick={() => { }} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
