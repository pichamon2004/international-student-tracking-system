'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { RiCloseLine, RiFilePdf2Line, RiEyeLine, RiSettings3Line, RiAddLine, RiTable2, RiZoomInLine, RiZoomOutLine, RiExpandWidthLine } from 'react-icons/ri';
import CustomSelect from '@/components/ui/CustomSelect';
import { type ApiTemplateVariable } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import TemplateFieldModal from '@/components/TemplateFieldModal';

/* ─── Types ──────────────────────────────────────────────────── */
export interface DocTemplate {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  variables: string[];
  body: string; // stored as HTML
  signingMethod?: 'manual' | 'digital' | 'approval';
}

export const SIGNATURE_VARIABLES = ['{{sig_student}}', '{{sig_advisor}}', '{{sig_ir_staff}}', '{{sig_dean}}'];

function fallbackVarLabel(v: string) {
  return v.replace(/[{}]/g, '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Variable chip HTML ─────────────────────────────────────── */
function makeVarChip(v: string, label?: string) {
  const displayLabel = label ?? fallbackVarLabel(v);
  if (v.startsWith('{{sig_')) {
    return `<span contenteditable="false" data-var="${v}" style="display:inline-flex;align-items:center;gap:4px;width:100%;margin:4px 0;border:1.5px dashed rgba(7,118,188,0.35);border-radius:4px;padding:4px 10px;font-size:12px;color:rgba(7,118,188,0.6);font-family:inherit;">✍ ${displayLabel} .................................................</span>`;
  }
  // display:inline + line-height:1 — an inline-block chip with padding/border
  // made every line containing a variable taller than plain-text lines.
  return `<span contenteditable="false" data-var="${v}" style="display:inline;padding:1px 8px;margin:0 2px;border-radius:5px;background:#DEEBFF;color:#0776BC;font-size:11px;font-weight:600;border:1px solid rgba(7,118,188,0.2);line-height:1;white-space:nowrap;">${displayLabel}</span>`;
}

/* ─── Extract used variables from HTML body ──────────────────── */
function extractVars(html: string): string[] {
  const matches = html.match(/data-var="({{[^"]+}})"/g) ?? [];
  return Array.from(new Set(matches.map(m => m.replace('data-var="', '').replace('"', ''))));
}

/* ─── Convert plain-text body (legacy) to HTML ──────────────── */
function toHtml(body: string): string {
  if (body.startsWith('<')) return body; // already HTML
  // Escape, then convert variables and newlines
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/({{[^}]+}})/g)
    .map(part => {
      if (/^{{[^}]+}}$/.test(part)) return makeVarChip(part);
      return part.replace(/\n/g, '<br>');
    })
    .join('');
}

/* ─── Live Preview (renders HTML, highlights variables) ─────── */
function LivePreview({ html }: { html: string }) {
  if (!html.trim() || html === '<br>') {
    return <p className="text-gray-300 text-sm italic text-center pt-10">No content yet — switch to Edit tab and start writing.</p>;
  }
  // Render raw HTML (variables already styled as chips inside the HTML)
  return <div className="dtm-content text-sm text-gray-800" style={{ lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];

/* ─── Page zoom (view only — the saved template is unaffected) ── */
const PAPER_WIDTH = 794; // A4 at 96dpi
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

function ZoomControl({ zoom, setZoom, scrollRef }: {
  zoom: number;
  setZoom: (z: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const out = [...ZOOM_STEPS].reverse().find(z => z < zoom - 0.001);
  const into = ZOOM_STEPS.find(z => z > zoom + 0.001);
  // Page width fills the gray area (minus its p-6 padding on both sides)
  const fit = () => {
    const w = scrollRef.current?.clientWidth;
    if (w) setZoom(Math.min(2, Math.max(0.3, (w - 48) / PAPER_WIDTH)));
  };
  const btn = 'w-7 h-7 rounded-lg flex items-center justify-center text-primary/70 hover:bg-[#DEEBFF] hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent transition';
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 bg-white rounded-xl shadow-md border border-[#0776BC]/15 p-1">
      <button title="Zoom out" disabled={!out} onMouseDown={e => { e.preventDefault(); if (out) setZoom(out); }} className={btn}>
        <RiZoomOutLine size={15} />
      </button>
      <button title="Reset to 100%" onMouseDown={e => { e.preventDefault(); setZoom(1); }}
        className="min-w-[3rem] h-7 px-1 rounded-lg text-xs font-semibold text-primary hover:bg-[#DEEBFF] tabular-nums transition">
        {Math.round(zoom * 100)}%
      </button>
      <button title="Zoom in" disabled={!into} onMouseDown={e => { e.preventDefault(); if (into) setZoom(into); }} className={btn}>
        <RiZoomInLine size={15} />
      </button>
      <span className="w-px h-4 bg-[#0776BC]/15 mx-0.5" />
      <button title="Fit page width" onMouseDown={e => { e.preventDefault(); fit(); }} className={btn}>
        <RiExpandWidthLine size={15} />
      </button>
    </div>
  );
}

type DocSubTab = 'Edit' | 'Preview';

interface DocTemplateModalProps {
  template: DocTemplate | null;
  isCreate: boolean;
  allVariables: ApiTemplateVariable[];
  // Called after "+ Field" creates a new variable, so the caller's list stays in sync
  onVariableCreated?: (variable: ApiTemplateVariable) => void;
  onSave: (data: Partial<DocTemplate> & { id?: number }) => void;
  onClose: () => void;
}

const SIGNING_METHOD_LABELS = { digital: 'Digital', manual: 'Manual', approval: 'On Approve' } as const;
const SIGNING_METHOD_HINTS = {
  digital:  'Each signer draws or uploads a signature image',
  manual:   'Each signer prints, signs by hand, and uploads the signed PDF',
  approval: "No signing step — each approver's name and date are printed automatically when they press Approve",
} as const;

export default function DocTemplateModal({ template, isCreate, allVariables, onVariableCreated, onSave, onClose }: DocTemplateModalProps) {
  // Local copy so a field created with "+ Field" gets its label on the chip right away
  const [vars, setVars] = useState(allVariables);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const labelMap = Object.fromEntries(vars.map(v => [`{{${v.key}}}`, v.label]));
  const varLabel = (v: string) => labelMap[v] ?? fallbackVarLabel(v);
  const allVarTokens = vars.map(v => `{{${v.key}}}`);

  const currentUser = useAuthStore(s => s.user);
  const [subTab, setSubTab] = useState<DocSubTab>('Edit');
  const [name, setName] = useState(template?.name ?? '');
  const [desc, setDesc] = useState(template?.description ?? '');
  const [bodyHtml, setBodyHtml] = useState(() => toHtml(template?.body ?? ''));
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [signingMethod, setSigningMethod] = useState<'manual' | 'digital' | 'approval'>(template?.signingMethod ?? 'digital');
  const [usedVars, setUsedVars] = useState<string[]>(template?.variables ?? []);
  const [varSearch, setVarSearch] = useState('');
  const [signatories, setSignatories] = useState<string[]>(
    template?.variables?.filter(v => v.startsWith('{{sig_')) ?? SIGNATURE_VARIABLES
  );
  const [fontSize, setFontSize] = useState(14);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const paperScrollRef = useRef<HTMLDivElement>(null);
  // Saved selection range — updated while cursor/selection is inside editor
  const savedRangeRef = useRef<Range | null>(null);
  // Toolbar "Insert table" column picker
  const [showTableMenu, setShowTableMenu] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // While "+ Field" is open, Escape closes only that dialog
    if (showFieldModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // An open column picker closes first, not the whole editor
      if (showTableMenu) setShowTableMenu(false);
      else onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showFieldModal, showTableMenu]);

  // Clicking anywhere outside the column picker closes it
  useEffect(() => {
    if (!showTableMenu) return;
    const handler = (e: MouseEvent) => {
      if (!tableMenuRef.current?.contains(e.target as Node)) setShowTableMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTableMenu]);

  // Track active formats, save selection range, and read font size at cursor
  useEffect(() => {
    const update = () => {
      const sel = document.getSelection();
      const inside = !!sel && !!editorRef.current && editorRef.current.contains(sel.anchorNode);
      if (!inside) {
        setActiveFormats({});
        return;
      }
      // Save current range so toolbar controls can restore it after stealing focus
      if (sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      setActiveFormats({
        bold:          document.queryCommandState('bold'),
        italic:        document.queryCommandState('italic'),
        underline:     document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
      });
      // Read computed font size at cursor and sync dropdown (like Word)
      const anchorNode = sel.anchorNode;
      const el = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as Element);
      if (el) {
        const computed = window.getComputedStyle(el).fontSize; // e.g. "16px"
        const px = Math.round(parseFloat(computed));
        if (!isNaN(px)) {
          // Snap to nearest value in FONT_SIZES list
          const nearest = FONT_SIZES.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a);
          setFontSize(nearest);
        }
      }
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  // Re-initialize editor whenever the Edit tab mounts (e.g. after switching back from Preview)
  useEffect(() => {
    if (editorRef.current && subTab === 'Edit') {
      editorRef.current.innerHTML = bodyHtml;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  // Sync editor HTML → state on input
  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setBodyHtml(html);
    const vars = extractVars(html);
    setUsedVars(vars);
  };

  // Apply execCommand formatting
  const applyFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
    // Sync active state immediately so toolbar reflects toggle-off
    setActiveFormats({
      bold:          document.queryCommandState('bold'),
      italic:        document.queryCommandState('italic'),
      underline:     document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });
  };

  // Restore the saved selection range back into the editor
  const restoreSavedRange = (): Range | null => {
    const range = savedRangeRef.current;
    if (!range) return null;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel) return null;
    sel.removeAllRanges();
    sel.addRange(range);
    return range;
  };

  // Apply font size — like Word:
  //   • text selected  → wrap selection in <span style="font-size:Xpx">
  //   • cursor only    → insert a span at cursor so next keystrokes use that size
  const applyFontSize = (px: number) => {
    setFontSize(px);
    const savedRange = restoreSavedRange();
    const activeRange = savedRange ?? (() => {
      const sel = window.getSelection();
      return sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    })();
    if (!activeRange || !editorRef.current) return;

    if (!activeRange.collapsed) {
      // execCommand handles single-line and multi-line selections correctly.
      // Wrapping extractContents() in a <span> breaks when selection crosses block boundaries.
      document.execCommand('fontSize', false, '7'); // sentinel → browser creates <font size="7">
      const fonts = Array.from(editorRef.current.querySelectorAll('font[size="7"]'));
      fonts.forEach(font => {
        const span = document.createElement('span');
        span.style.fontSize = `${px}px`;
        while (font.firstChild) span.appendChild(font.firstChild);
        font.parentNode?.replaceChild(span, font);
      });
    } else {
      // ── Cursor only: insert a span carrier so next typed chars use this size ──
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.textContent = '\u200B'; // invisible anchor; browser will extend span as user types
      activeRange.insertNode(span);
      const sel = window.getSelection();
      if (sel && span.firstChild) {
        sel.removeAllRanges();
        const cr = document.createRange();
        cr.setStart(span.firstChild, 1); // place cursor inside span, after the zero-width space
        cr.collapse(true);
        sel.addRange(cr);
        savedRangeRef.current = cr.cloneRange();
      }
    }
    handleInput();
  };

  // Insert a variable chip at cursor using direct DOM manipulation
  // (execCommand('insertHTML') strips data-var in Chrome)
  const insertLogo = (height: number) => {
    editorRef.current?.focus();
    const imgHtml = `<img src="/kkulogo2.png" alt="KKU Logo" style="display:block;height:${height}px;margin:0 auto 8px auto;" />`;
    const sel = window.getSelection();
    const range = savedRangeRef.current ?? (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
    if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) {
      const tmp = document.createElement('div');
      tmp.innerHTML = imgHtml;
      while (tmp.firstChild) editorRef.current?.appendChild(tmp.firstChild);
      handleInput();
      return;
    }
    range.deleteContents();
    const tmp = document.createElement('div');
    tmp.innerHTML = imgHtml;
    const imgNode = tmp.firstChild as Node;
    range.insertNode(imgNode);
    const after = document.createTextNode('\u200B');
    range.setStartAfter(imgNode);
    range.insertNode(after);
    range.setStartAfter(after);
    range.collapse(true);
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    savedRangeRef.current = range.cloneRange();
    handleInput();
  };

  // A borderless one-row table, so pieces of text can sit side by side (e.g.
  // document no. | date). It goes in as its own block after the paragraph
  // holding the cursor, followed by an empty paragraph to keep typing below it.
  const insertTableBlock = (cells: { width: string; content: string; align?: string }[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const tmp = document.createElement('div');
    tmp.innerHTML =
      '<table style="width:100%;border-collapse:collapse"><tbody><tr>'
      + cells.map(c => `<td style="width:${c.width};vertical-align:top;text-align:${c.align ?? 'left'};padding:4px 6px">${c.content}</td>`).join('')
      + '</tr></tbody></table><p><br></p>';

    const sel = window.getSelection();
    const range = savedRangeRef.current ?? (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
    let block: Node | null = range && editor.contains(range.commonAncestorContainer) ? range.startContainer : null;
    while (block && block.parentNode !== editor) block = block.parentNode;
    const nodes = Array.from(tmp.childNodes);
    if (block) {
      const empty = !(block.textContent ?? '').replace(/\u200B/g, '').trim() && !(block as Element).querySelector?.('img,[data-var],table');
      let ref: Node = block;
      nodes.forEach(n => { editor.insertBefore(n, ref.nextSibling); ref = n; });
      if (empty) editor.removeChild(block);
    } else {
      nodes.forEach(n => editor.appendChild(n));
    }
    // Put the cursor in the left cell's text, selected, ready to overwrite
    const target = (nodes[0] as Element).querySelector('td p');
    if (target && sel) {
      const r = document.createRange();
      r.selectNodeContents(target);
      sel.removeAllRanges();
      sel.addRange(r);
      savedRangeRef.current = r.cloneRange();
    }
    handleInput();
  };

  // Letterhead: text | logo | text, so lines can sit beside the logo (a plain
  // logo is a centered block on its own line)
  const insertLetterhead = () => insertTableBlock([
    { width: '36%', content: '<p>ข้อความด้านซ้าย</p>' },
    { width: '28%', content: '<img src="/kkulogo2.png" alt="KKU Logo" style="height:100px;margin:0 auto" />', align: 'center' },
    { width: '36%', content: '<p>ข้อความด้านขวา</p>' },
  ]);

  // n equal, empty columns — each cell is aligned with the toolbar's Align buttons
  const insertTable = (n: number) => {
    setShowTableMenu(false);
    insertTableBlock(Array.from({ length: n }, () => ({
      width: `${(100 / n).toFixed(2).replace(/\.?0+$/, '')}%`,
      content: '<p><br></p>',
    })));
  };

  const insertVariable = (v: string, label = varLabel(v)) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const range = savedRangeRef.current ?? (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
    if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) {
      // Fallback: append at end
      const tmp = document.createElement('div');
      tmp.innerHTML = makeVarChip(v, label) + '\u200B';
      while (tmp.firstChild) editorRef.current?.appendChild(tmp.firstChild);
      handleInput();
      return;
    }
    range.deleteContents();
    const tmp = document.createElement('div');
    tmp.innerHTML = makeVarChip(v, label);
    const chipNode = tmp.firstChild as Node;
    range.insertNode(chipNode);
    // Place cursor after chip
    const after = document.createTextNode('\u200B');
    range.setStartAfter(chipNode);
    range.insertNode(after);
    range.setStartAfter(after);
    range.collapse(true);
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    savedRangeRef.current = range.cloneRange();
    handleInput();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    // Strip zero-width spaces left by font-size cursor carriers
    const html = (editorRef.current?.innerHTML ?? bodyHtml).replace(/\u200B/g, '');
    const vars = extractVars(html);

    onSave({
      id: template?.id,
      name: name.trim(),
      description: desc.trim(),
      body: html,
      isActive,
      signingMethod,
      variables: Array.from(new Set([...vars, ...signatories])),
    });
  };

  const handleGeneratePDF = useCallback(() => {
    const el = document.getElementById('dtm-print'); if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return;
    const origin = window.location.origin;
    const html = el.innerHTML.replace(/src="\/kkulogo2\.png"/g, `src="${origin}/kkulogo2.png"`);
    w.document.write(`<!DOCTYPE html><html><head><title>Document</title><style>body{margin:0;padding:15mm 20mm;font-family:'Times New Roman',serif;font-size:14px;color:#222;line-height:1.8;}img{display:block;margin-left:auto;margin-right:auto}@media print{@page{size:A4;margin:0;}body{padding:15mm 20mm;}}</style></head><body>${html}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
    w.document.close();
  }, []);

  const isLeaveRequest = template?.id === 1;
  const filteredVars = allVarTokens.filter(v =>
    varLabel(v).toLowerCase().includes(varSearch.toLowerCase()) || v.toLowerCase().includes(varSearch.toLowerCase())
  );

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col min-h-0"
        style={{ height: 'calc(100vh - 32px)', maxHeight: '900px', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="bg-primary flex items-center justify-between px-6 py-4 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{isCreate ? 'New Document Template' : `Edit — ${template?.name}`}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white/10 rounded-xl p-1">
              {(['Edit', 'Preview'] as DocSubTab[]).map(st => (
                <button key={st} onClick={() => setSubTab(st)}
                  className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    subTab === st ? 'bg-white text-primary shadow-sm' : 'text-white/70 hover:text-white'
                  )}>
                  {st === 'Preview' ? <RiEyeLine size={13} /> : <RiSettings3Line size={13} />}
                  {st}
                </button>
              ))}
            </div>
            {isLeaveRequest && !isCreate && (
              <button onClick={handleGeneratePDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold active:scale-95 transition-all">
                <RiFilePdf2Line size={14} /> PDF
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
              <RiCloseLine size={16} />
            </button>
          </div>
        </div>

        {/* ── Metadata bar ── */}
        <div className="bg-[#DEEBFF]/40 px-6 py-3 border-b border-[#0776BC]/10 shrink-0">
          {isCreate ? (
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Template Name <span className="text-red-400">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Consent Form"
                  className="border border-[#0776BC]/20 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-primary transition-colors" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Description</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description..."
                  className="border border-[#0776BC]/20 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-primary transition-colors" />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <label className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Status</label>
                <button onClick={() => setIsActive(a => !a)} className="inline-flex items-center gap-2">
                  <div className={clsx('relative w-9 h-5 rounded-full transition-colors duration-200', isActive ? 'bg-green-500' : 'bg-gray-300')}>
                    <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200', isActive ? 'left-[18px]' : 'left-0.5')} />
                  </div>
                  <span className={clsx('text-xs font-medium', isActive ? 'text-green-600' : 'text-gray-400')}>{isActive ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <label className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Signing Method</label>
                <div className="flex gap-1 p-1 bg-white border border-[#0776BC]/20 rounded-xl">
                  {(['digital', 'manual', 'approval'] as const).map(m => (
                    <button key={m} type="button" title={SIGNING_METHOD_HINTS[m]} onClick={() => setSigningMethod(m)}
                      className={clsx('flex-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap text-center',
                        signingMethod === m ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700')}>
                      {SIGNING_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Template Name', val: name, set: setName },
                { label: 'Description', val: desc, set: setDesc },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-primary/50 uppercase tracking-wide">{label}</label>
                  <input value={val} onChange={e => set(e.target.value)}
                    className="border border-[#0776BC]/20 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-primary transition-colors" />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-primary/50 uppercase tracking-wide">Signing Method</label>
                <div className="flex gap-1 p-1 bg-white border border-[#0776BC]/20 rounded-lg">
                  {(['digital', 'manual', 'approval'] as const).map(m => (
                    <button key={m} type="button" title={SIGNING_METHOD_HINTS[m]} onClick={() => setSigningMethod(m)}
                      className={clsx('flex-1 px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap text-center',
                        signingMethod === m ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700')}>
                      {SIGNING_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shared styles for edit + preview (lists, font) */}
        <style>{`
          #dtm-editor ul, .dtm-content ul { list-style-type: disc; padding-left: 1.6em; margin: 0.25em 0; }
          #dtm-editor ol, .dtm-content ol { list-style-type: decimal; padding-left: 1.6em; margin: 0.25em 0; }
          #dtm-editor li, .dtm-content li { margin: 0.1em 0; }
          /* Letterhead/table cells: show their edges while editing only, so it's
             clear where to click — the preview and the PDF stay borderless. */
          #dtm-editor td { outline: 1px dashed rgba(7,118,188,0.3); outline-offset: -1px; }
          /* Templates saved earlier store the old inline-block chip style in
             their HTML — override it so variable lines keep normal height. */
          #dtm-editor [data-var]:not([data-var^="{{sig_"]), .dtm-content [data-var]:not([data-var^="{{sig_"]) {
            display: inline !important; vertical-align: baseline !important; line-height: 1 !important;
          }
        `}</style>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ══ EDIT TAB ══ */}
          {subTab === 'Edit' && (
            <>
              {/* Formatting toolbar (vertical left) */}
              <div className="w-11 shrink-0 bg-[#DEEBFF]/30 border-r border-[#0776BC]/10 flex flex-col items-center py-3 gap-1">
                {/* Font size selector */}
                <select
                  title="Font size"
                  value={fontSize}
                  onChange={e => applyFontSize(Number(e.target.value))}
                  className="w-8 mb-1 rounded-lg border border-[#0776BC]/20 bg-white text-primary text-xs font-semibold text-center py-1 cursor-pointer hover:border-primary/40 focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  {FONT_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="w-5 h-px bg-[#0776BC]/20 my-0.5" />

                {/* Bold / Italic / Underline / Strikethrough */}
                {[
                  { icon: 'B', title: 'Bold',         cmd: 'bold',          cls: 'font-bold' },
                  { icon: 'I', title: 'Italic',        cmd: 'italic',        cls: 'italic' },
                  { icon: 'U', title: 'Underline',     cmd: 'underline',     cls: 'underline' },
                  { icon: 'S', title: 'Strikethrough', cmd: 'strikeThrough', cls: 'line-through' },
                ].map(btn => (
                  <button key={btn.icon} title={btn.title}
                    onMouseDown={e => { e.preventDefault(); applyFormat(btn.cmd); }}
                    className={clsx(
                      `w-7 h-7 rounded flex items-center justify-center text-sm transition ${btn.cls}`,
                      activeFormats[btn.cmd]
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-primary/70 hover:bg-[#DEEBFF]'
                    )}>
                    {btn.icon}
                  </button>
                ))}

                <div className="w-5 h-px bg-[#0776BC]/20 my-0.5" />

                {/* Alignment */}
                {[
                  { icon: '≡', title: 'Align Left',    cmd: 'justifyLeft' },
                  { icon: '⫶', title: 'Align Center',  cmd: 'justifyCenter' },
                  { icon: '≣', title: 'Align Right',   cmd: 'justifyRight' },
                ].map((btn, i) => (
                  <button key={i} title={btn.title}
                    onMouseDown={e => { e.preventDefault(); applyFormat(btn.cmd); }}
                    className="w-7 h-7 rounded flex items-center justify-center text-sm text-primary/70 hover:bg-[#DEEBFF] transition">
                    {btn.icon}
                  </button>
                ))}

                <div className="w-5 h-px bg-[#0776BC]/20 my-0.5" />

                {/* Lists */}
                {[
                  { icon: '•≡', title: 'Bullet List',   cmd: 'insertUnorderedList' },
                  { icon: '1≡', title: 'Numbered List', cmd: 'insertOrderedList' },
                ].map((btn, i) => (
                  <button key={i} title={btn.title}
                    onMouseDown={e => { e.preventDefault(); applyFormat(btn.cmd); }}
                    className="w-7 h-7 rounded flex items-center justify-center text-[10px] text-primary/70 hover:bg-[#DEEBFF] transition font-semibold">
                    {btn.icon}
                  </button>
                ))}

                <div className="w-5 h-px bg-[#0776BC]/20 my-0.5" />

                {/* Table: pick how many columns */}
                <div ref={tableMenuRef} className="relative">
                  <button title="Insert table"
                    onMouseDown={e => { e.preventDefault(); setShowTableMenu(v => !v); }}
                    className={clsx(
                      'w-7 h-7 rounded flex items-center justify-center transition',
                      showTableMenu ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-[#DEEBFF]'
                    )}>
                    <RiTable2 size={15} />
                  </button>
                  {showTableMenu && (
                    <div className="absolute left-full ml-2 top-0 z-20 bg-white rounded-lg shadow-lg border border-[#0776BC]/15 p-2">
                      <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide mb-1.5 whitespace-nowrap">Columns</p>
                      <div className="flex gap-1">
                        {[2, 3, 4, 5, 6].map(n => (
                          <button key={n} title={`Table with ${n} columns`}
                            onMouseDown={e => { e.preventDefault(); insertTable(n); }}
                            className="w-7 h-7 rounded border border-[#0776BC]/20 text-primary text-xs font-semibold hover:bg-[#DEEBFF] hover:border-primary/30 transition">
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* A4 contentEditable area */}
              <div className="relative flex-1 min-w-0 min-h-0 flex">
              <div ref={paperScrollRef} className="bg-[#f0f4f8] flex-1 overflow-auto p-6 min-h-0">
                {/* mx-auto rather than justify-center: a zoomed-in page scrolls instead of being cut off on the left */}
                <div className="bg-white shadow-md rounded-sm mx-auto" style={{ width: `${PAPER_WIDTH}px`, minHeight: '1123px', zoom }}>
                  <div className="h-1.5 bg-primary rounded-t-sm" />
                  <div
                    id="dtm-editor"
                    ref={editorRef}
                    contentEditable
                    dir="ltr"
                    suppressContentEditableWarning
                    onInput={handleInput}
                    data-placeholder="Write your template here…&#10;&#10;Click a variable on the right panel to insert it at your cursor."
                    style={{
                      fontFamily: "var(--font-sarabun), 'TH Sarabun New', 'Sarabun', sans-serif",
                      lineHeight: '1.8',
                      fontSize: '14px',
                      minHeight: '1100px',
                    }}
                    className="w-full px-10 py-8 text-gray-800 bg-transparent outline-none
                      [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:before:whitespace-pre-wrap [&:empty]:before:text-sm"
                  />
                </div>
              </div>
              <ZoomControl zoom={zoom} setZoom={setZoom} scrollRef={paperScrollRef} />
              </div>

              {/* Right panel — variables */}
              <div className="w-52 shrink-0 bg-[#DEEBFF]/20 border-l border-[#0776BC]/10 flex flex-col overflow-hidden min-h-0">
                <div className="px-3 pt-2.5 pb-2 border-b border-[#0776BC]/10 shrink-0 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">Insert Variable</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-primary/50 font-medium">KKU Logo</p>
                    <div className="flex gap-1">
                      {([['S', 40], ['M', 80], ['L', 120]] as [string, number][]).map(([label, h]) => (
                        <button
                          key={label}
                          onMouseDown={e => { e.preventDefault(); insertLogo(h); }}
                          className="flex-1 py-1 rounded-lg border border-[#0776BC]/20 bg-white text-primary text-xs font-semibold hover:bg-[#DEEBFF] hover:border-primary/30 active:scale-[0.98] transition-all"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      title="Letterhead: text on the left, the logo in the middle, text on the right"
                      onMouseDown={e => { e.preventDefault(); insertLetterhead(); }}
                      className="w-full py-1 rounded-lg border border-[#0776BC]/20 bg-white text-primary text-xs font-semibold hover:bg-[#DEEBFF] hover:border-primary/30 active:scale-[0.98] transition-all"
                    >
                      Letterhead (text | logo | text)
                    </button>
                  </div>
                  <button
                    onMouseDown={e => { e.preventDefault(); setShowFieldModal(true); }}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <RiAddLine size={13} /> Field
                  </button>
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-primary/40" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input value={varSearch} onChange={e => setVarSearch(e.target.value)} placeholder="Search..."
                      className="w-full pl-6 pr-2 py-1 text-[11px] border border-[#0776BC]/20 rounded-lg bg-white outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-0">
                  {filteredVars.map(v => (
                    <button key={v} onMouseDown={e => { e.preventDefault(); insertVariable(v); }} title={v}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg border border-[#0776BC]/15 bg-white text-primary text-xs font-medium hover:bg-[#DEEBFF] hover:border-primary/30 active:scale-[0.98] transition-all leading-tight">
                      {varLabel(v)}
                    </button>
                  ))}
                  {filteredVars.length === 0 && <p className="text-[10px] text-gray-400 text-center pt-4 italic">No matches</p>}
                </div>
                {/* Signature fields */}
                <div className="border-t border-[#0776BC]/10 shrink-0">
                  <div className="px-3 py-2 border-b border-[#0776BC]/5">
                    <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">Signatures</p>
                  </div>
                  <div className="p-2 flex flex-col gap-2">
                    {[
                      { v: '{{sig_student}}',  label: 'Student',  displayName: null,                        autoLabel: 'Auto at request time' },
                      { v: '{{sig_advisor}}',  label: 'Advisor',  displayName: null,                        autoLabel: 'Auto at request time' },
                      { v: '{{sig_ir_staff}}', label: 'IR Staff', displayName: currentUser?.name ?? null,   autoLabel: null },
                      { v: '{{sig_dean}}',     label: 'Dean',     displayName: null,                        autoLabel: 'Auto at request time' },
                    ].map(sig => {
                      const en = signatories.includes(sig.v);
                      return (
                        <div key={sig.v} className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <button onMouseDown={e => { e.preventDefault(); setSignatories(p => p.includes(sig.v) ? p.filter(x => x !== sig.v) : [...p, sig.v]); }}
                              className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all', en ? 'bg-primary border-primary' : 'border-gray-300 bg-white')}>
                              {en && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                            <span className={clsx('flex-1 text-xs font-medium px-2 py-0.5 rounded border bg-white', en ? 'border-primary/30 text-primary' : 'border-[#0776BC]/20 text-gray-400')}>{sig.label}</span>
                            {en && <button onMouseDown={e => { e.preventDefault(); insertVariable(sig.v); }} title="Insert at cursor" className="text-[9px] text-primary/40 hover:text-primary transition px-1">+</button>}
                          </div>
                          {en && (
                            <div className="ml-5 text-[11px] px-2 py-1 rounded border bg-gray-50 border-gray-200 text-gray-600 leading-tight">
                              {sig.autoLabel
                                ? <span className="text-[10px] italic text-gray-400">{sig.autoLabel}</span>
                                : sig.displayName
                                  ? <span className="text-gray-700">{sig.displayName}</span>
                                  : <span className="italic text-gray-400">Not found</span>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ PREVIEW TAB ══ */}
          {subTab === 'Preview' && (
            <div className="relative flex-1 min-w-0 min-h-0 flex">
            <div ref={paperScrollRef} className="flex-1 overflow-auto p-6 min-h-0 bg-[#f0f4f8]">
              <div className="bg-white shadow-md rounded-sm mx-auto" style={{ width: `${PAPER_WIDTH}px`, minHeight: '1123px', zoom }}>
                <div className="h-1.5 bg-primary rounded-t-sm" />
                <div className="px-10 py-8" style={{ fontFamily: "var(--font-sarabun), 'TH Sarabun New', 'Sarabun', sans-serif", lineHeight: '1.8', fontSize: '14px', minHeight: '1100px' }}>
                  <LivePreview html={bodyHtml} />
                  {signatories.length > 0 && bodyHtml.trim() && bodyHtml !== '<br>' && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="grid gap-4 justify-end" style={{ gridTemplateColumns: `repeat(${Math.min(signatories.length, 4)}, calc((100% - 48px) / 4))` }}>
                        {signatories.map(sv => {
                          const resolvedName =
                            sv === '{{sig_ir_staff}}' ? (currentUser?.name ?? '') :
                            '';
                          return (
                            <div key={sv} className="flex flex-col items-center gap-1">
                              <div className="w-full h-12 border-b-2 border-gray-800 mt-4" />
                              {resolvedName
                                ? <span className="text-xs text-gray-700 font-medium text-center">{resolvedName}</span>
                                : <span className="text-[10px] italic text-gray-400 text-center">(auto-filled)</span>
                              }
                              <span className="text-xs text-gray-500">{varLabel(sv).replace('✍ ', '').replace(' Signature', '')}</span>
                              <span className="text-[10px] text-gray-400">Date ....../....../......</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ZoomControl zoom={zoom} setZoom={setZoom} scrollRef={paperScrollRef} />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#0776BC]/10 shrink-0 bg-[#DEEBFF]/20">
          <span className="text-xs text-primary/40">{(editorRef.current?.innerText ?? bodyHtml.replace(/<[^>]+>/g, '')).length} characters</span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-[#0776BC]/20 text-primary/70 text-sm font-medium hover:bg-[#DEEBFF] transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {isCreate ? 'Create Template' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="hidden" id="dtm-print" />

        {showFieldModal && (
          <TemplateFieldModal
            existingKeys={vars.map(v => v.key)}
            onClose={() => setShowFieldModal(false)}
            onCreated={v => {
              setShowFieldModal(false);
              setVars(prev => [...prev, v]);
              insertVariable(`{{${v.key}}}`, v.label);
              onVariableCreated?.(v);
            }}
          />
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
