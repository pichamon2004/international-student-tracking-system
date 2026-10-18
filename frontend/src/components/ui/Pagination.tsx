import { clsx } from 'clsx';
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

interface PaginationProps {
  page: number;          // 0-based
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}

// Page numbers to show: always the first and last, the current one and its
// neighbours, with "…" for the gaps — e.g. 1 … 4 5 6 … 12
function pageList(page: number, totalPages: number): (number | '…')[] {
  const wanted = new Set([0, totalPages - 1, page - 1, page, page + 1].filter(p => p >= 0 && p < totalPages));
  const sorted = Array.from(wanted).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onChange }: PaginationProps) {
  if (totalItems === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span>
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-[#EBF4FF] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <RiArrowLeftSLine size={18} />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="w-8 text-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={clsx(
                  'min-w-[2rem] h-8 px-2 rounded-lg text-xs font-semibold transition',
                  p === page ? 'bg-primary text-white' : 'text-primary hover:bg-[#EBF4FF]'
                )}
              >
                {p + 1}
              </button>
            )
          )}
          <button
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-[#EBF4FF] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <RiArrowRightSLine size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
