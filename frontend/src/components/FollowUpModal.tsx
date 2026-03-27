'use client';

import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { emailTemplateApi, studentApi, type ApiEmailTemplate } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  studentDbId: number;
  studentName: string;
  alertType: string;
  onClose: () => void;
}

export default function FollowUpModal({ studentDbId, studentName, alertType, onClose }: Props) {
  const [templates, setTemplates] = useState<ApiEmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    emailTemplateApi.getAll()
      .then(res => {
        const active = res.data.data.filter(t => t.isActive);
        setTemplates(active);
        if (active.length > 0) setSelectedId(active[0].id);
      })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedId) ?? null;

  async function handleSend() {
    if (!selectedId) return;
    setSending(true);
    try {
      await studentApi.sendEmail(studentDbId, selectedId);
      toast.success('Follow-up email sent');
      onClose();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col gap-5 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Follow Up</h2>
            <p className="text-xs text-gray-400 mt-0.5">{studentName} · {alertType}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Template selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-primary">Select Email Template</label>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No active email templates found</p>
          ) : (
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Preview */}
        {selectedTemplate && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-primary/60 uppercase tracking-wide">Preview</p>
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex flex-col gap-2">
              <p className="text-xs text-gray-400">Subject: <span className="text-gray-700 font-medium">{selectedTemplate.subject}</span></p>
              <div
                className="text-xs text-gray-600 max-h-32 overflow-y-auto leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedTemplate.body }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm border border-gray-300 text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedId || templates.length === 0}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-yellow-400 text-white hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
