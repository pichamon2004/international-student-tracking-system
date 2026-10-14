'use client';

/* Shared building blocks for the student profile forms
   (update visa, health insurance, academic document, dependent, ...). */

import { useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiUploadLine, RiDeleteBinLine } from 'react-icons/ri';

export const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white placeholder-gray-400 focus:outline-none focus:border-primary';

export type Option = { value: string; label: string };

/** A saved value that isn't in a fixed option list (older free-text data) stays selectable. */
export function withValue(options: Option[], value: string): Option[] {
  return !value || options.some(o => o.value === value) ? options : [...options, { value, label: value }];
}
export function strOptions(list: string[], value = ''): Option[] {
  return withValue(list.map(v => ({ value: v, label: v })), value);
}

export function Field({ label, required, optional, hint, children, className = '' }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <label className="text-xs font-semibold text-primary">
        {label}
        {required && <span className="text-red-500"> *</span>}
        {optional && <span className="font-normal text-gray-500"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

/* Numbered form section card */
export function Section({ n, title, required, optional, subtitle, children }: {
  n: number; title: string; required?: boolean; optional?: boolean; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-gray-800">
            {title}
            {required && <span className="text-red-500"> *</span>}
            {optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
          </h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* Page frame: fixed header + footer, sections scroll in between */
export function FormShell({ title, subtitle, onSave, saving, saveLabel, children }: {
  title: string; subtitle?: string | null; onSave: () => void; saving: boolean; saveLabel: string; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 flex-1 min-h-0">
        <div className="flex items-start gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F3F7FD] text-primary hover:bg-primary hover:text-white transition shrink-0"
          >
            <RiArrowLeftLine size={18} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-primary">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <p className="text-xs text-gray-500 pt-2 shrink-0"><span className="text-red-500">*</span> Required field</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 -mr-2 pr-2">{children}</div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={onSave}
            className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Single-image upload tile: preview, Replace/Upload and a bin button */
export function ImageSlot({ title, hint, preview, inputRef, onPick, onClear, aspect = 'aspect-[4/3]' }: {
  title: string;
  hint?: string;
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  aspect?: string;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="text-xs font-semibold text-primary">{title}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${aspect} rounded-xl border-2 border-dashed border-primary/25 bg-[#F3F7FD] flex items-center justify-center overflow-hidden hover:border-primary/50 transition`}
      >
        {preview ? (
          <img src={preview} alt={title} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center px-3">
            <span className="w-8 h-8 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm">
              <RiUploadLine size={16} />
            </span>
            <span className="text-xs font-semibold text-primary">Upload</span>
            {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
          </div>
        )}
      </button>
      {preview && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex-1 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition">
            Replace
          </button>
          <button type="button" onClick={onClear} title={`Remove ${title.toLowerCase()}`}
            className="w-8 h-8 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition">
            <RiDeleteBinLine size={14} />
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  );
}
