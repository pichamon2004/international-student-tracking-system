'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine } from 'react-icons/ri';
import ChoiceOptionsTable from './ChoiceOptionsTable';
import { hasOptions, type ApiTemplateVariable, type SelectOption } from '@/lib/api';

export type { SelectOption };

type InputType = 'auto' | 'text' | 'date' | 'textarea' | 'select' | 'radio';

interface Props {
  variable: ApiTemplateVariable | null;
  onSave: (data: {
    id?: number;
    key: string;
    label: string;
    description?: string;
    inputType: InputType;
    options?: SelectOption[];
  }) => void;
  onClose: () => void;
}

const INPUT_TYPE_OPTIONS: { value: InputType; label: string; desc: string }[] = [
  { value: 'auto',     label: 'Auto-filled', desc: 'Filled automatically from student profile' },
  { value: 'text',     label: 'Text',        desc: 'Student types a short answer' },
  { value: 'date',     label: 'Date',        desc: 'Student picks a date' },
  { value: 'textarea', label: 'Long Text',   desc: 'Student types a longer answer' },
  { value: 'radio',    label: 'Choice',      desc: 'Student picks one option' },
  { value: 'select',   label: 'Dropdown',    desc: 'Student picks from a searchable list' },
];

function parseOptions(raw: string | null | undefined): SelectOption[] {
  if (!raw) return [{ label: '', allowInput: false }];
  try {
    const parsed = JSON.parse(raw);
    // support both old string[] and new SelectOption[]
    if (Array.isArray(parsed)) {
      if (typeof parsed[0] === 'string') {
        return parsed.map((s: string) => ({ label: s, allowInput: false }));
      }
      return parsed;
    }
    return [{ label: '', allowInput: false }];
  } catch {
    return [{ label: '', allowInput: false }];
  }
}

export default function TemplateVariableModal({ variable, onSave, onClose }: Props) {
  const isEdit = variable !== null;
  const [key, setKey] = useState(variable?.key ?? '');
  const [label, setLabel] = useState(variable?.label ?? '');
  const [description, setDescription] = useState(variable?.description ?? '');
  const [inputType, setInputType] = useState<InputType>(variable?.inputType ?? 'auto');
  const [options, setOptions] = useState<SelectOption[]>(() => parseOptions(variable?.options));
  const [keyError, setKeyError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!trimKey || !/^[a-z][a-z0-9_]*$/.test(trimKey)) {
      setKeyError('Key must start with a letter and contain only lowercase letters, numbers, and underscores.');
      return;
    }
    if (!label.trim()) return;
    const validOptions = options.filter(o => o.label.trim());
    if (hasOptions(inputType) && validOptions.length < 2) return;
    onSave({
      id: variable?.id,
      key: trimKey,
      label: label.trim(),
      // Send '' (not undefined) when cleared — undefined is dropped from the
      // request body, so the backend would keep the old description.
      description: description.trim(),
      inputType,
      options: hasOptions(inputType) ? validOptions : undefined,
    });
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-primary flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-white">{isEdit ? 'Edit Variable' : 'New Variable'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
            <RiCloseLine size={16} />
          </button>
        </div>

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
              placeholder="e.g. purpose_of_travel"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition disabled:bg-gray-50 disabled:text-gray-400"
            />
            {keyError && <p className="text-xs text-red-500">{keyError}</p>}
            {!isEdit && key && (
              <p className="text-xs text-gray-400">
                Token: <code className="bg-gray-100 rounded px-1 text-primary font-mono">{`{{${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}}}`}</code>
              </p>
            )}
            {isEdit && <p className="text-xs text-gray-400">Key cannot be changed after creation.</p>}
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Purpose of Travel"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
            <p className="text-xs text-gray-400">Shown in the variable picker inside the template editor.</p>
          </div>

          {/* Input Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Input Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INPUT_TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setInputType(opt.value)}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border-2 text-left transition ${
                    inputType === opt.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className={`text-xs font-semibold ${inputType === opt.value ? 'text-primary' : 'text-gray-700'}`}>{opt.label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options editor */}
          {hasOptions(inputType) && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Options <span className="text-red-400">*</span>
              </label>

              <ChoiceOptionsTable options={options} onChange={setOptions} />
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Select the reason for leaving Thailand"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !label.trim() ||
                (!isEdit && !key.trim()) ||
                (hasOptions(inputType) && options.filter(o => o.label.trim()).length < 2)
              }
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
