'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import type { ApiTemplateVariable, SelectOption } from '@/lib/api';

export type { SelectOption };

type InputType = 'auto' | 'text' | 'date' | 'textarea' | 'select';

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
  { value: 'select',   label: 'Choices',     desc: 'Student picks from a list of options' },
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

  const setOptionLabel = (i: number, val: string) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, label: val } : o));

  const setOptionAllowInput = (i: number, val: boolean) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, allowInput: val } : o));

  const addOption = () => setOptions(prev => [...prev, { label: '', allowInput: false }]);

  const removeOption = (i: number) =>
    setOptions(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!trimKey || !/^[a-z][a-z0-9_]*$/.test(trimKey)) {
      setKeyError('Key must start with a letter and contain only lowercase letters, numbers, and underscores.');
      return;
    }
    if (!label.trim()) return;
    const validOptions = options.filter(o => o.label.trim());
    if (inputType === 'select' && validOptions.length < 2) return;
    onSave({
      id: variable?.id,
      key: trimKey,
      label: label.trim(),
      description: description.trim() || undefined,
      inputType,
      options: inputType === 'select' ? validOptions : undefined,
    });
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

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
            <div className="grid grid-cols-2 gap-2">
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
          {inputType === 'select' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Options <span className="text-red-400">*</span>
              </label>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-1">
                <span className="text-[10px] text-gray-400 font-medium">Option label</span>
                <span className="text-[10px] text-gray-400 font-medium w-20 text-center">Allow input</span>
                <span className="w-7" />
              </div>

              <div className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    {/* Radio indicator + text */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                      <input
                        value={opt.label}
                        onChange={e => setOptionLabel(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                      />
                    </div>

                    {/* Allow input toggle */}
                    <div className="w-20 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setOptionAllowInput(i, !opt.allowInput)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${opt.allowInput ? 'bg-primary' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${opt.allowInput ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={options.length <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-400 transition disabled:opacity-30"
                    >
                      <RiDeleteBinLine size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addOption}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold px-3 py-1.5 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 transition">
                <RiAddLine size={13} /> Add option
              </button>

              {/* Show hint if any option has allowInput */}
              {options.some(o => o.allowInput) && (
                <p className="text-[11px] text-primary/70 bg-primary/5 rounded-lg px-3 py-2">
                  Options with "Allow input" toggled on will show a text field when selected.
                </p>
              )}

              {options.filter(o => o.label.trim()).length < 2 && (
                <p className="text-xs text-red-400">At least 2 options are required.</p>
              )}
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
                (inputType === 'select' && options.filter(o => o.label.trim()).length < 2)
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
