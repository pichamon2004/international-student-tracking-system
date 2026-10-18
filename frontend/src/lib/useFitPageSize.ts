import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// Layout effects only run in the browser; on the server this avoids React's SSR warning
const useBrowserLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * How many table rows fit in the space the table area has on screen, so a list
 * fills the page without scrolling and the rest goes to the next page.
 *
 * Pass `ref` to the element that holds the table; it must get its height from
 * the layout (flex-1 min-h-0), not from its content. Header and row heights are
 * measured from the rendered table, so the count follows the real row height.
 * A callback ref, so it also works when the table only appears after loading.
 */
export function useFitPageSize<T extends HTMLElement>(options: { fallbackRowHeight?: number; minRows?: number } = {}) {
  const { fallbackRowHeight = 53, minRows = 3 } = options;
  const [box, setBox] = useState<T | null>(null);
  const [pageSize, setPageSize] = useState(8);

  const measure = useCallback(() => {
    if (!box) return;
    const head = box.querySelector('thead');
    const row = box.querySelector<HTMLElement>('tbody tr[data-row]');
    const headHeight = head?.getBoundingClientRect().height ?? 0;
    const rowHeight = row?.getBoundingClientRect().height || fallbackRowHeight;
    const rows = Math.floor((box.clientHeight - headHeight) / rowHeight);
    setPageSize(Math.max(minRows, rows));
  }, [box, fallbackRowHeight, minRows]);

  // Re-measure after every render (rows may have appeared) and whenever the area resizes
  useBrowserLayoutEffect(measure);
  useEffect(() => {
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [box, measure]);

  return { ref: setBox, pageSize };
}

/** The slice of `items` for a 0-based page, with the page clamped when the list or page size shrinks. */
export function usePaged<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Back to the first page when the search/filter changes
  useEffect(() => { setPage(0); }, [resetKey]);
  useEffect(() => { if (page > totalPages - 1) setPage(totalPages - 1); }, [page, totalPages]);

  const current = Math.min(page, totalPages - 1);
  return {
    page: current,
    setPage,
    totalPages,
    visible: items.slice(current * pageSize, (current + 1) * pageSize),
  };
}
