'use client';

import { RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import type { SelectOption } from '@/lib/api';

interface Props {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
}

type TextCol = 'label' | 'docText';
const TEXT_COLS: TextCol[] = ['label', 'docText'];

const emptyRow = (): SelectOption => ({ label: '', docText: '', allowInput: false });

export const countValidOptions = (options: SelectOption[]) =>
  options.filter(o => o.label.trim()).length;

const cellCls =
  'w-full px-2.5 py-1.5 text-sm bg-transparent outline-none focus:bg-primary/5 placeholder-gray-300';

/* Choice options edited as a lookup table: one row per option, with the text
   shown to the student and the text written into the document. Pasting a
   block copied from Excel/Sheets fills rows and columns from the cell. */
export default function ChoiceOptionsTable({ options, onChange }: Props) {
  const update = (i: number, patch: Partial<SelectOption>) =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const addRow = () => onChange([...options, emptyRow()]);

  const removeRow = (i: number) =>
    onChange(options.length > 1 ? options.filter((_, idx) => idx !== i) : [emptyRow()]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: TextCol) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text)) return; // single value — let the input handle it
    e.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines[lines.length - 1] === '') lines.pop(); // Excel adds a trailing newline
    const startCol = TEXT_COLS.indexOf(col);
    const next = [...options];
    lines.forEach((line, i) => {
      const r = row + i;
      const cells = line.split('\t');
      const target = { ...(next[r] ?? emptyRow()) };
      cells.forEach((cell, j) => {
        const c = TEXT_COLS[startCol + j];
        if (c) target[c] = cell.trim();
      });
      next[r] = target;
    });
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, row: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (row === options.length - 1) addRow();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="w-8 py-2 font-semibold">#</th>
              <th className="py-2 px-2.5 text-left font-semibold border-l border-gray-200">Option</th>
              <th className="py-2 px-2.5 text-left font-semibold border-l border-gray-200">Text in document</th>
              <th className="w-16 py-2 font-semibold border-l border-gray-200" title="Show a text box so the student can type their own answer">Input</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {options.map((opt, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="text-center text-[11px] text-gray-400">{i + 1}</td>
                <td className="border-l border-gray-100">
                  <input
                    value={opt.label}
                    onChange={e => update(i, { label: e.target.value })}
                    onPaste={e => handlePaste(e, i, 'label')}
                    onKeyDown={e => handleKeyDown(e, i)}
                    placeholder={`Option ${i + 1}`}
                    className={cellCls}
                  />
                </td>
                <td className="border-l border-gray-100">
                  <input
                    value={opt.allowInput ? '' : opt.docText ?? ''}
                    onChange={e => update(i, { docText: e.target.value })}
                    onPaste={e => handlePaste(e, i, 'docText')}
                    onKeyDown={e => handleKeyDown(e, i)}
                    disabled={opt.allowInput}
                    placeholder={opt.allowInput ? '(student types)' : 'Same as option'}
                    className={`${cellCls} disabled:bg-gray-50 disabled:placeholder-gray-400`}
                  />
                </td>
                <td className="border-l border-gray-100 text-center">
                  <input
                    type="checkbox"
                    checked={opt.allowInput}
                    onChange={e => update(i, { allowInput: e.target.checked })}
                    className="w-4 h-4 accent-[#0776BC] cursor-pointer align-middle"
                  />
                </td>
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-400 transition"
                  >
                    <RiDeleteBinLine size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-primary font-semibold px-3 py-1.5 rounded-lg border border-dashed border-primary/30 hover:bg-primary/5 transition">
          <RiAddLine size={13} /> Add row
        </button>
        <p className="text-[10px] text-gray-400">Tip: paste rows copied from Excel into any cell</p>
      </div>

      {countValidOptions(options) < 2 && (
        <p className="text-xs text-red-400">At least 2 options are required.</p>
      )}
    </div>
  );
}
