'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine } from 'react-icons/ri';
import { templateVariableApi, hasOptions, type ApiTemplateVariable, type SelectOption } from '@/lib/api';
import ChoiceOptionsTable, { countValidOptions } from './ChoiceOptionsTable';

type FieldType = 'text' | 'date' | 'textarea' | 'select' | 'radio';

interface Props {
  existingKeys: string[];
  onCreated: (variable: ApiTemplateVariable) => void;
  onClose: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string; desc: string }[] = [
  { value: 'text',     label: 'Text',      desc: 'Student types a short answer' },
  { value: 'date',     label: 'Date',      desc: 'Student picks a date' },
  { value: 'textarea', label: 'Long Text', desc: 'Student types a longer answer' },
  { value: 'radio',    label: 'Choice',    desc: 'Student picks one option' },
  { value: 'select',   label: 'Dropdown',  desc: 'Student picks from a searchable list' },
];

// Staff never see the key — derive it from the label and keep it unique.
function keyFromLabel(label: string, taken: Set<string>): string {
  let base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = 'field';
  else if (!/^[a-z]/.test(base)) base = `field_${base}`;
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
  return key;
}

/* Create a new fill-in field straight from the template editor — a regular
   template variable with an auto-generated key, inserted at the cursor. */
export default function TemplateFieldModal({ existingKeys, onCreated, onClose }: Props) {
  const [label, setLabel] = useState('');
  const [inputType, setInputType] = useState<FieldType>('text');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<SelectOption[]>([
    { label: '', docText: '', allowInput: false },
    { label: '', docText: '', allowInput: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isChoice = hasOptions(inputType);
  const canSave = !!label.trim() && (!isChoice || countValidOptions(options) >= 2) && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    const taken = new Set(existingKeys);
    const payload = {
      label: label.trim(),
      description: description.trim() || undefined,
      inputType,
      options: isChoice
        ? options
            .filter(o => o.label.trim())
            .map(o => ({
              label: o.label.trim(),
              allowInput: o.allowInput,
              ...(!o.allowInput && o.docText?.trim() ? { docText: o.docText.trim() } : {}),
            }))
        : undefined,
    };
    try {
      // The key list we were given may be stale (another staff member could
      // have created the same key meanwhile) — on a clash, take the next one.
      for (let attempt = 0; attempt < 3; attempt++) {
        const key = keyFromLabel(label, taken);
        try {
          const res = await templateVariableApi.create({ key, ...payload });
          onCreated(res.data.data);
          return;
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          if (msg !== 'Key already exists') throw err;
          taken.add(key);
        }
      }
      setError('Could not create a unique field. Please try a different label.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create field');
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="bg-primary flex items-center justify-between px-6 py-4 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-sm font-semibold text-white">New Field</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
            <RiCloseLine size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Purpose of Travel"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
            />
            <p className="text-xs text-gray-400">Shown to the student above the input, and on the chip in the template.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Input Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map(opt => (
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

          {isChoice && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Options <span className="text-red-400">*</span>
              </label>
              <ChoiceOptionsTable options={options} onChange={setOptions} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Hint shown to the student, e.g. As written in your passport"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={!canSave}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Creating…' : 'Insert Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
