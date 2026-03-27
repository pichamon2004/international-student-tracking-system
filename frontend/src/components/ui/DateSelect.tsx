'use client';

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Mo','Tu','We','Th','Fr','Sa','Su'];

interface DateSelectProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function parseDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function fmt(v: string): string {
  const d = parseDate(v);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DateSelect({ value, onChange, disabled, placeholder = 'Select date' }: DateSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const selected = parseDate(value);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Update view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowYearPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid — week starts Monday
  function buildGrid(): (Date | null)[] {
    const first = new Date(viewYear, viewMonth, 1);
    const last  = new Date(viewYear, viewMonth + 1, 0);
    // 0=Sun→6, 1=Mon→0, ..., 6=Sat→5
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function selectDay(d: Date) {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
    setShowYearPicker(false);
  }

  function isSelected(d: Date | null) {
    if (!d || !selected) return false;
    return d.toDateString() === selected.toDateString();
  }
  function isToday(d: Date | null) {
    if (!d) return false;
    return d.toDateString() === today.toDateString();
  }

  // Year range for year picker
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const grid = buildGrid();

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(p => !p)}
        className={clsx(
          'w-full border rounded-xl px-4 py-2.5 text-sm flex items-center justify-between bg-white transition-colors',
          disabled ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50' : 'border-gray-200 text-gray-700 hover:border-primary cursor-pointer',
          open && 'border-primary ring-2 ring-primary/10',
          !value && 'text-gray-400'
        )}
      >
        <span>{value ? fmt(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 w-64">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={() => setShowYearPicker(p => !p)}
              className="text-sm font-semibold text-gray-800 hover:text-primary transition flex items-center gap-1"
            >
              {MONTHS[viewMonth]}, {viewYear}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {!showYearPicker && (
              <div className="flex gap-1">
                <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
          </div>

          {showYearPicker ? (
            /* Year picker grid */
            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
              {years.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                  className={clsx(
                    'py-1.5 rounded-lg text-xs font-medium transition',
                    y === viewYear ? 'bg-primary text-white' : 'hover:bg-primary/10 text-gray-700'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DOW.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {grid.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!d}
                    onClick={() => d && selectDay(d)}
                    className={clsx(
                      'h-8 w-full rounded-lg text-xs font-medium transition flex items-center justify-center',
                      !d && 'invisible',
                      d && isSelected(d) && 'bg-primary text-white',
                      d && !isSelected(d) && isToday(d) && 'border border-primary text-primary',
                      d && !isSelected(d) && !isToday(d) && 'text-gray-700 hover:bg-primary/10'
                    )}
                  >
                    {d?.getDate()}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => selectDay(today)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Today
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
