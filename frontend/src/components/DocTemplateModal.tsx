'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { RiCloseLine, RiFilePdf2Line, RiEyeLine, RiSettings3Line } from 'react-icons/ri';

/* ─── Types ──────────────────────────────────────────────────── */
export interface DocTemplate {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  variables: string[];
  body: string; // stored as HTML
}

const VARIABLE_LABELS: Record<string, string> = {
  '{{student_name}}':     'Student Name',
  '{{student_id}}':       'Student ID',
  '{{student_title}}':    'Title (Mr./Mrs./Miss)',
  '{{thai_tel}}':         'Thai Tel. No.',
  '{{email}}':            'Email',
  '{{education_level}}':  'Education Level',
  '{{funding_type}}':     'Funding Type',
  '{{scholarship_name}}': 'Scholarship Name',
  '{{program}}':          'Program',
  '{{destination}}':      'Destination City & Country',
  '{{purpose}}':          'Purpose of Leave',
  '{{duration_days}}':    'Duration (days/months)',
  '{{leave_start}}':      'Leave Start Date',
  '{{leave_end}}':        'Leave End Date',
  '{{visa_expiry}}':      'Visa Expiry',
  '{{advisor_name}}':     'Advisor Name',
  '{{date}}':             'Current Date',
  '{{visa_expiry_date}}': 'Visa Expiry Date',
  '{{days_remaining}}':   'Days Remaining',
  '{{request_type}}':     'Request Type',
  '{{status}}':           'Status',
  '{{dean_name}}':        'Dean Name',
  '{{sig_student}}':      '✍ Student Signature',
  '{{sig_advisor}}':      '✍ Advisor Signature',
  '{{sig_ir_staff}}':     '✍ IR Staff Signature',
  '{{sig_dean}}':         '✍ Dean Signature',
};

export const ALL_VARIABLES = Object.keys(VARIABLE_LABELS).filter(v => !v.startsWith('{{sig_'));
export const SIGNATURE_VARIABLES = ['{{sig_student}}', '{{sig_advisor}}', '{{sig_ir_staff}}', '{{sig_dean}}'];

function varLabel(v: string) {
  return VARIABLE_LABELS[v] ?? v.replace(/[{}]/g, '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Variable chip HTML ─────────────────────────────────────── */
function makeVarChip(v: string) {
  const label = varLabel(v);
  if (v.startsWith('{{sig_')) {
    return `<span contenteditable="false" data-var="${v}" style="display:inline-flex;align-items:center;gap:4px;width:100%;margin:4px 0;border:1.5px dashed rgba(7,118,188,0.35);border-radius:4px;padding:4px 10px;font-size:12px;color:rgba(7,118,188,0.6);font-family:inherit;">✍ ${label} .................................................</span>`;
  }
  return `<span contenteditable="false" data-var="${v}" style="display:inline-block;padding:1px 8px;margin:0 2px;border-radius:5px;background:#DEEBFF;color:#0776BC;font-size:11px;font-weight:600;border:1px solid rgba(7,118,188,0.2);vertical-align:middle;white-space:nowrap;">${label}</span>`;
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

type DocSubTab = 'Edit' | 'Preview';

interface DocTemplateModalProps {
  template: DocTemplate | null;
  isCreate: boolean;
  allVariables: string[];
  onSave: (data: Partial<DocTemplate> & { id?: number }) => void;
  onClose: () => void;
  studentName?: string;
  advisorName?: string;
}

export default function DocTemplateModal({ template, isCreate, allVariables, onSave, onClose, studentName, advisorName }: DocTemplateModalProps) {
  const [subTab, setSubTab] = useState<DocSubTab>('Edit');
  const [name, setName] = useState(template?.name ?? '');
  const [desc, setDesc] = useState(template?.description ?? '');
  const [bodyHtml, setBodyHtml] = useState(() => toHtml(template?.body ?? ''));
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [usedVars, setUsedVars] = useState<string[]>(template?.variables ?? []);
  const [varSearch, setVarSearch] = useState('');
  const [signatories, setSignatories] = useState<string[]>(
    template?.variables?.filter(v => v.startsWith('{{sig_')) ?? SIGNATURE_VARIABLES
  );
  const [signatoryNames, setSignatoryNames] = useState<Record<string, string>>({
    '{{sig_student}}':  studentName ?? '',
    '{{sig_advisor}}':  advisorName ?? '',
    '{{sig_ir_staff}}': 'Miss Kasama Orthong',
    '{{sig_dean}}':     'Assoc. Prof. Dr. Kanda Runapongsa Saikaew',
  });
  const [fontSize, setFontSize] = useState(14);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  // Saved selection range — updated while cursor/selection is inside editor
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
      // ── Has selection: wrap it ──
      const frag = activeRange.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      span.appendChild(frag);
      activeRange.insertNode(span);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.selectNodeContents(span);
        sel.addRange(nr);
        savedRangeRef.current = nr.cloneRange();
      }
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

  // Insert a variable chip at cursor
  const insertVariable = (v: string) => {
    editorRef.current?.focus();
    const chip = makeVarChip(v);
    document.execCommand('insertHTML', false, chip + '\u200B'); // zero-width space after chip
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
      variables: Array.from(new Set([...vars, ...signatories])),
    });
  };

  const handleGeneratePDF = useCallback(() => {
    const el = document.getElementById('dtm-print'); if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return;
    w.document.write(`<html><head><title>Document</title><style>body{margin:0;font-family:'Times New Roman',serif;}@media print{@page{size:A4;margin:20mm 25mm;}}</style></head><body>${el.innerHTML}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
    w.document.close();
  }, []);

  const isLeaveRequest = template?.id === 1;
  const filteredVars = allVariables.filter(v =>
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
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          )}
        </div>

        {/* Shared styles for edit + preview (lists, font) */}
        <style>{`
          #dtm-editor ul, .dtm-content ul { list-style-type: disc; padding-left: 1.6em; margin: 0.25em 0; }
          #dtm-editor ol, .dtm-content ol { list-style-type: decimal; padding-left: 1.6em; margin: 0.25em 0; }
          #dtm-editor li, .dtm-content li { margin: 0.1em 0; }
        `}</style>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ══ EDIT TAB ══ */}
          {subTab === 'Edit' && (
            <>
              {/* Formatting toolbar (vertical left) */}
              <div className="w-11 shrink-0 bg-[#DEEBFF]/30 border-r border-[#0776BC]/10 flex flex-col items-center py-3 gap-1">
                {/* Font size selector */}
                <div className="relative w-8 mb-1" title="Font size">
                  <select
                    value={fontSize}
                    onMouseDown={() => {
                      // Snapshot current selection before dropdown steals focus
                      const sel = window.getSelection();
                      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
                      }
                    }}
                    onChange={e => applyFontSize(Number(e.target.value))}
                    className="w-full appearance-none bg-white border border-[#0776BC]/20 rounded text-[10px] text-primary text-center py-0.5 outline-none cursor-pointer hover:border-primary transition-colors"
                    style={{ paddingRight: '2px' }}
                  >
                    {FONT_SIZES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

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
              </div>

              {/* A4 contentEditable area */}
              <div className="bg-[#f0f4f8] flex-1 overflow-auto p-6 flex justify-center min-h-0">
                <div className="bg-white shadow-md rounded-sm shrink-0" style={{ width: '794px', minHeight: '1123px' }}>
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

              {/* Right panel — variables */}
              <div className="w-52 shrink-0 bg-[#DEEBFF]/20 border-l border-[#0776BC]/10 flex flex-col overflow-hidden min-h-0">
                <div className="px-3 pt-2.5 pb-2 border-b border-[#0776BC]/10 shrink-0 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">Insert Variable</p>
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
                      { v: '{{sig_student}}',  label: 'Student',  placeholder: 'Student full name',  autoSource: studentName },
                      { v: '{{sig_advisor}}',  label: 'Advisor',  placeholder: 'Advisor full name',  autoSource: advisorName },
                      { v: '{{sig_ir_staff}}', label: 'IR Staff', placeholder: 'IR Staff full name', autoSource: undefined   },
                      { v: '{{sig_dean}}',     label: 'Dean',     placeholder: 'Dean full name',     autoSource: undefined   },
                    ].map(sig => {
                      const en = signatories.includes(sig.v);
                      const isAutoFilled = !!sig.autoSource;
                      return (
                        <div key={sig.v} className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <button onMouseDown={e => { e.preventDefault(); setSignatories(p => p.includes(sig.v) ? p.filter(x => x !== sig.v) : [...p, sig.v]); }}
                              className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all', en ? 'bg-primary border-primary' : 'border-gray-300 bg-white')}>
                              {en && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                            <span className={clsx('flex-1 text-xs font-medium px-2 py-0.5 rounded border bg-white', en ? 'border-primary/30 text-primary' : 'border-[#0776BC]/20 text-gray-400')}>{sig.label}</span>
                            {en && isAutoFilled && <span className="text-[8px] bg-green-100 text-green-600 px-1 py-0.5 rounded font-semibold">Auto</span>}
                            {en && <button onMouseDown={e => { e.preventDefault(); insertVariable(sig.v); }} title="Insert at cursor" className="text-[9px] text-primary/40 hover:text-primary transition px-1">+</button>}
                          </div>
                          {en && (
                            <input
                              value={signatoryNames[sig.v] ?? ''}
                              onChange={e => setSignatoryNames(p => ({ ...p, [sig.v]: e.target.value }))}
                              placeholder={isAutoFilled ? `Auto: ${sig.autoSource}` : sig.placeholder}
                              className={clsx(
                                'w-full text-[11px] px-2 py-1 rounded border outline-none focus:border-primary transition-colors ml-5',
                                isAutoFilled && !(signatoryNames[sig.v])
                                  ? 'bg-green-50 border-green-200 text-green-700 placeholder:text-green-500'
                                  : 'bg-white border-[#0776BC]/20 text-gray-700'
                              )}
                            />
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
            <div className="flex-1 overflow-auto p-6 min-h-0 bg-[#f0f4f8] flex justify-center">
              <div className="bg-white shadow-md rounded-sm shrink-0" style={{ width: '794px', minHeight: '1123px' }}>
                <div className="h-1.5 bg-primary rounded-t-sm" />
                <div className="px-10 py-8" style={{ fontFamily: "var(--font-sarabun), 'TH Sarabun New', 'Sarabun', sans-serif", lineHeight: '1.8', fontSize: '14px', minHeight: '1100px' }}>
                  <LivePreview html={bodyHtml} />
                  {signatories.length > 0 && bodyHtml.trim() && bodyHtml !== '<br>' && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className={clsx('grid gap-4', signatories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4')}>
                        {signatories.map(sv => (
                          <div key={sv} className="flex flex-col items-center gap-1">
                            <div className="w-full h-12 border-b-2 border-gray-800 mt-4" />
                            {signatoryNames[sv] && (
                              <span className="text-xs text-gray-700 font-medium text-center">{signatoryNames[sv]}</span>
                            )}
                            <span className="text-xs text-gray-500">{varLabel(sv).replace('✍ ', '').replace(' Signature', '')}</span>
                            <span className="text-[10px] text-gray-400">Date ....../....../......</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
