'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine } from 'react-icons/ri';
import type { ApiTemplateVariable } from '@/lib/api';

interface Props {
  variable: ApiTemplateVariable | null;
  onSave: (data: { id?: number; key: string; label: string; description?: string }) => void;
  onClose: () => void;
}

export default function TemplateVariableModal({ variable, onSave, onClose }: Props) {
  const isEdit = variable !== null;
  const [key, setKey] = useState(variable?.key ?? '');
  const [label, setLabel] = useState(variable?.label ?? '');
  const [description, setDescription] = useState(variable?.description ?? '');
  const [keyError, setKeyError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!trimKey || !/^[a-z][a-z0-9_]*$/.test(trimKey)) {
      setKeyError('Key must start with a letter and contain only lowercase letters, numbers, and underscores.');
      return;
    }
    if (!label.trim()) return;
    onSave({ id: variable?.id, key: trimKey, label: label.trim(), description: description.trim() || undefined });
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-primary flex items-center justify-between px-6 py-4 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-white">{isEdit ? 'Edit Variable' : 'New Variable'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
            <RiCloseLine size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Key <span className="text-red-400">*</span>
            </label>
            <input
              value={key}
              onChange={e => { setKey(e.target.value); setKeyError(''); }}
              disabled={isEdit}
              placeholder="e.g. scholarship_amount"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition disabled:bg-gray-50 disabled:text-gray-400"
            />
            {keyError && <p className="text-xs text-red-500">{keyError}</p>}
            {!isEdit && key && (
              <p className="text-xs text-gray-400">
                Token: <code className="bg-gray-100 rounded px-1 text-primary font-mono">{`{{${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}}}`}</code>
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-gray-400">Key cannot be changed after creation.</p>
            )}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Scholarship Amount"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
            <p className="text-xs text-gray-400">Shown in the variable picker inside the template editor.</p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Amount of scholarship in THB"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
            <p className="text-xs text-gray-400">Shown as a hint when users fill in this value during request submission.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={!label.trim() || (!isEdit && !key.trim())}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isEdit ? 'Save Changes' : 'Create Variable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
