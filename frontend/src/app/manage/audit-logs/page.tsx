'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { RiSearchLine, RiArrowDownSLine, RiCloseLine, RiCheckLine, RiEyeLine } from 'react-icons/ri';

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  before: string | null;
  after: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

function JsonBlock({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-gray-400 text-xs italic">No data</span>;
  try {
    return (
      <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-72 text-gray-700 whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(JSON.parse(raw), null, 2)}
      </pre>
    );
  } catch {
    return <p className="text-xs text-gray-500">{raw}</p>;
  }
}

function SimpleDropdown({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-36"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        {value ? (
          <RiCloseLine
            size={14}
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        ) : (
          <RiArrowDownSLine size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition text-left"
            >
              <span className={value === o.value ? 'text-primary font-medium' : 'text-gray-700'}>{o.label}</span>
              {value === o.value && <RiCheckLine size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const [entity, setEntity]       = useState('');
  const [action, setAction]       = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [page, setPage]           = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs?limit=1000');
      setLogs(res.data.data);
    } catch (err: any) {
      if (err?.response?.status === 403) setNoAccess(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [entity, action, startDate, endDate]);

  const filteredLogs = logs.filter(log => {
    if (entity    && !log.entity.toLowerCase().includes(entity.toLowerCase())) return false;
    if (action    && log.action !== action)                                     return false;
    if (startDate && log.createdAt < `${startDate}T00:00:00`)                  return false;
    if (endDate   && log.createdAt > `${endDate}T23:59:59`)                    return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const pagedLogs  = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter  = entity || action || startDate || endDate;

  const actionOptions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].map(a => ({ label: a, value: a }));

  if (noAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-10 py-12 text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-700 font-medium">Access denied</p>
          <p className="text-sm text-gray-400 mt-1">Requires permission: AUDIT_LOG.view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5">

      {/* Header + Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">Record of all actions in the system</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <RiSearchLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={entity}
              onChange={e => setEntity(e.target.value)}
              placeholder="Search entity..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <SimpleDropdown
            value={action}
            onChange={setAction}
            placeholder="All Actions"
            options={actionOptions}
          />
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm">
            <span className="text-gray-400 text-xs whitespace-nowrap">From</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="focus:outline-none text-sm text-gray-700 bg-transparent"
            />
            <span className="text-gray-300">—</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="focus:outline-none text-sm text-gray-700 bg-transparent"
            />
          </div>
          {hasFilter && (
            <button
              onClick={() => { setEntity(''); setAction(''); setStartDate(''); setEndDate(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filteredLogs.length} entries</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Time</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">User</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Action</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Entity</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">IP</th>
              <th className="px-6 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : pagedLogs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No data</td></tr>
            ) : pagedLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/60">
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-800">{log.user?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{log.user?.email}</p>
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="font-medium text-gray-700">{log.entity}</span>
                  {log.entityId && <span className="text-gray-400 text-xs ml-1">#{log.entityId}</span>}
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">{log.ipAddress ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  {(log.before || log.after) && (
                    <button
                      onClick={() => setDetailLog(log)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      title="View details"
                    >
                      <RiEyeLine size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-400">Total {filteredLogs.length} entries</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm transition ${
                    p === page ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailLog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailLog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${ACTION_COLORS[detailLog.action] ?? 'bg-gray-100 text-gray-600'}`}>
                  {detailLog.action}
                </span>
                <span className="font-semibold text-gray-800">
                  {detailLog.entity}
                  {detailLog.entityId && <span className="text-gray-400 font-normal text-sm ml-1">#{detailLog.entityId}</span>}
                </span>
              </div>
              <button
                onClick={() => setDetailLog(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <RiCloseLine size={18} />
              </button>
            </div>

            {/* Meta info */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
              <span><span className="font-medium text-gray-700">User</span>: {detailLog.user?.name ?? '—'} ({detailLog.user?.email})</span>
              <span><span className="font-medium text-gray-700">Time</span>: {new Date(detailLog.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {detailLog.ipAddress && <span><span className="font-medium text-gray-700">IP</span>: {detailLog.ipAddress}</span>}
            </div>

            {/* Before / After */}
            <div className="p-6 grid grid-cols-2 gap-4 overflow-auto max-h-[60vh]">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Before</p>
                <JsonBlock raw={detailLog.before} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">After</p>
                <JsonBlock raw={detailLog.after} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
