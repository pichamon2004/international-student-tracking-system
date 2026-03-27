'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import type { IconType } from 'react-icons';
import {
  RiEyeLine, RiCheckLine, RiTimeLine, RiCloseCircleLine,
  RiPlaneLine, RiPassportLine, RiHospitalLine, RiGraduationCapLine, RiBuilding2Line,
  RiFileList2Line, RiFileTextLine, RiFileCopyLine, RiFileUserLine,
  RiUserLine, RiUserSettingsLine, RiGroupLine, RiContactsLine,
  RiHome3Line, RiMapPin2Line, RiGlobalLine, RiBriefcaseLine,
  RiBankLine, RiShieldLine, RiLockLine, RiSettings3Line,
  RiAlertLine, RiInformationLine, RiQuestionLine, RiSendPlaneLine,
  RiHeartPulseLine, RiBookOpenLine, RiCalendarLine, RiExchangeLine,
  RiClipboardLine, RiAddLine, RiArrowLeftSLine, RiArrowRightSLine,
} from 'react-icons/ri';
import { requestTypeApi, requestApi, studentMeApi, type ApiRequestType, type ApiRequest } from '@/lib/api';

/* ─── Icon map ──────────────────────────────────────────────── */
const ICON_MAP: Record<string, IconType> = {
  RiPlaneLine, RiPassportLine, RiHospitalLine, RiGraduationCapLine, RiBuilding2Line,
  RiFileList2Line, RiFileTextLine, RiFileCopyLine, RiFileUserLine,
  RiUserLine, RiUserSettingsLine, RiGroupLine, RiContactsLine,
  RiHome3Line, RiMapPin2Line, RiGlobalLine, RiBriefcaseLine,
  RiBankLine, RiShieldLine, RiLockLine, RiSettings3Line,
  RiAlertLine, RiInformationLine, RiQuestionLine, RiSendPlaneLine,
  RiHeartPulseLine, RiBookOpenLine, RiCalendarLine, RiExchangeLine,
  RiClipboardLine,
};

function IconComponent({ iconKey, size = 36, className }: { iconKey: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[iconKey ?? ''];
  return Icon ? <Icon size={size} className={className} /> : <RiClipboardLine size={size} className={className} />;
}

/* ─── Status config ─────────────────────────────────────────── */
type HistoryStatus =
  | 'PENDING' | 'FORWARDED_TO_ADVISOR' | 'ADVISOR_APPROVED' | 'ADVISOR_REJECTED'
  | 'STAFF_APPROVED' | 'STAFF_REJECTED' | 'FORWARDED_TO_DEAN'
  | 'DEAN_APPROVED' | 'DEAN_REJECTED' | 'CANCELLED';

const STATUS_CONFIG: Record<HistoryStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING:              { label: 'Pending',         icon: <RiTimeLine size={13} />,        className: 'bg-yellow-100 text-yellow-700' },
  FORWARDED_TO_ADVISOR: { label: 'At Advisor',       icon: <RiTimeLine size={13} />,        className: 'bg-blue-100 text-blue-600' },
  ADVISOR_APPROVED:     { label: 'Advisor Approved', icon: <RiCheckLine size={13} />,       className: 'bg-teal-100 text-teal-700' },
  ADVISOR_REJECTED:     { label: 'Advisor Rejected', icon: <RiCloseCircleLine size={13} />, className: 'bg-orange-100 text-orange-600' },
  STAFF_APPROVED:       { label: 'Staff Approved',   icon: <RiCheckLine size={13} />,       className: 'bg-indigo-100 text-indigo-700' },
  STAFF_REJECTED:       { label: 'Rejected',         icon: <RiCloseCircleLine size={13} />, className: 'bg-red-100 text-red-500' },
  FORWARDED_TO_DEAN:    { label: 'At Dean',          icon: <RiTimeLine size={13} />,        className: 'bg-purple-100 text-purple-600' },
  DEAN_APPROVED:        { label: 'Finished',         icon: <RiCheckLine size={13} />,       className: 'bg-green-100 text-green-600' },
  DEAN_REJECTED:        { label: 'Rejected',         icon: <RiCloseCircleLine size={13} />, className: 'bg-red-100 text-red-500' },
  CANCELLED:            { label: 'Cancelled',        icon: <RiCloseCircleLine size={13} />, className: 'bg-gray-100 text-gray-500' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ITEMS_PER_PAGE = 4;

/* ─── Main Page ─────────────────────────────────────────────── */
export default function StudentRequestPage() {
  const router = useRouter();

  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([]);
  const [history, setHistory] = useState<ApiRequest[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [requestPage, setRequestPage] = useState(0);

  useEffect(() => {
    requestTypeApi.getAll()
      .then(res => setRequestTypes(res.data.data.filter(t => t.isActive)))
      .catch(e => console.error('Failed to load request types:', e))
      .finally(() => setLoadingTypes(false));

    studentMeApi.get()
      .then(res => requestApi.getAll({ studentId: res.data.data.id }))
      .then(res => setHistory(res.data.data))
      .catch(e => console.error('Failed to load history:', e))
      .finally(() => setLoadingHistory(false));
  }, []);

  const totalPages = Math.ceil(requestTypes.length / ITEMS_PER_PAGE);
  const visibleTypes = requestTypes.slice(requestPage * ITEMS_PER_PAGE, (requestPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-8">

      {/* ── New Request ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">New Request</h2>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRequestPage(p => p - 1)}
                disabled={requestPage === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 text-primary hover:bg-[#EBF4FF] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <RiArrowLeftSLine size={18} />
              </button>
              <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                {requestPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setRequestPage(p => p + 1)}
                disabled={requestPage === totalPages - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 text-primary hover:bg-[#EBF4FF] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <RiArrowRightSLine size={18} />
              </button>
            </div>
          )}
        </div>

        {loadingTypes ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : requestTypes.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
            No request types available. Staff has not configured any yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => router.push(`/student/request/new/${type.id}`)}
                  className="relative group flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-[#EBF4FF] hover:bg-[#DEEBFF] border-2 border-transparent hover:border-primary/20 transition-all active:scale-95 text-center"
                >
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                    <RiAddLine size={14} />
                  </span>
                  <IconComponent iconKey={type.icon ?? ''} size={40} className="text-primary" />
                  <span className="text-xs font-semibold text-primary leading-tight">{type.name}</span>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRequestPage(i)}
                    className={clsx(
                      'h-1.5 rounded-full transition-all',
                      i === requestPage ? 'w-5 bg-primary' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── History ── */}
      <section className="flex-1">
        <h2 className="text-xl font-bold text-primary mb-4">History</h2>

        {loadingHistory ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
            No requests yet. Click a request type above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t border-gray-100">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-primary">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-primary">Start Request</th>
                  <th className="text-left py-3 px-4 font-semibold text-primary">Last Update</th>
                  <th className="text-left py-3 px-4 font-semibold text-primary">Staff Comment</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const status = (item.status as HistoryStatus) ?? 'PENDING';
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING'];
                  return (
                    <tr key={item.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50/60 transition">
                      <td className="py-3 px-4 font-medium text-primary">
                        {item.requestType?.name ?? item.title}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(item.updatedAt)}</td>
                      <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">
                        {item.staffComment ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                          cfg.className
                        )}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => router.push(`/student/request/${item.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition"
                        >
                          <RiEyeLine size={13} /> view
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
