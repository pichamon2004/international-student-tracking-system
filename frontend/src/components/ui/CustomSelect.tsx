'use client';

import { useRef, useEffect, useState } from 'react';
import { RiArrowDropDownLine } from 'react-icons/ri';
import { clsx } from 'clsx';

type Option = string | { label: string; value: string };

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function getLabel(o: Option) { return typeof o === 'string' ? o : o.label; }
function getValue(o: Option) { return typeof o === 'string' ? o : o.value; }

export default function CustomSelect({
  value, onChange, options, placeholder = '— Select —', disabled = false, className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => getValue(o) === value);
  const displayLabel = selected ? getLabel(selected) : '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(p => !p)}
        className={clsx(
          'w-full border rounded-xl px-4 py-2.5 text-sm flex items-center justify-between bg-white transition-colors',
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
            : 'border-gray-200 text-gray-700 hover:border-primary cursor-pointer',
          open && 'border-primary ring-2 ring-primary/10',
          !displayLabel && 'text-gray-400'
        )}
      >
        <span>{displayLabel || placeholder}</span>
        <RiArrowDropDownLine
          size={22}
          className={clsx('text-gray-400 shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors',
                !value ? 'text-primary font-medium' : 'text-gray-400'
              )}
            >
              {placeholder}
            </button>
          )}
          {options.map(o => (
            <button
              type="button"
              key={getValue(o)}
              onClick={() => { onChange(getValue(o)); setOpen(false); }}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors',
                getValue(o) === value ? 'text-primary font-medium' : 'text-gray-600'
              )}
            >
              {getLabel(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
