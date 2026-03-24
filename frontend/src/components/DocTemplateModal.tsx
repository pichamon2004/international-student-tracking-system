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
  body: string;
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

/* ─── Live Preview ───────────────────────────────────────────── */
function LivePreview({ body }: { body: string }) {
  if (!body.trim()) {
    return <p className="text-gray-300 text-sm italic text-center pt-10">No content yet — switch to Edit tab and start writing.</p>;
  }
  return (
    <>
      {body.split(/({{[^}]+}})/g).map((part, i) => {
        if (!/^{{[^}]+}}$/.test(part)) return <span key={i} className="text-sm text-gray-800 whitespace-pre-wrap">{part}</span>;
        if (part.startsWith('{{sig_')) {
          return (
            <span key={i} className="inline-flex items-center gap-1 w-full my-1 border border-dashed border-[#0776BC]/30 rounded px-3 py-1.5 text-xs text-[#0776BC]/60">
              <span>✍</span><span>{varLabel(part)} .................................................</span>
            </span>
          );
        }
        return (
          <span key={i} className="inline-block px-2 py-0.5 mx-0.5 rounded-md bg-[#DEEBFF] text-[#0776BC] text-xs font-medium align-middle whitespace-nowrap border border-[#0776BC]/20">
            {varLabel(part)}
          </span>
        );
      })}
    </>
  );
}

type DocSubTab = 'Edit' | 'Preview';

interface DocTemplateModalProps {
  template: DocTemplate | null;
  isCreate: boolean;
  allVariables: string[];
  onSave: (data: Partial<DocTemplate> & { id?: number }) => void;
  onClose: () => void;
}

export default function DocTemplateModal({ template, isCreate, allVariables, onSave, onClose }: DocTemplateModalProps) {
  const [subTab, setSubTab] = useState<DocSubTab>('Edit');
  const [name, setName] = useState(template?.name ?? '');
  const [desc, setDesc] = useState(template?.description ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [usedVars, setUsedVars] = useState<string[]>(template?.variables ?? []);
  const [deanName, setDeanName] = useState('Assoc. Prof. Dr. Kanda Runapongsa Saikaew');
  const [irStaff, setIrStaff] = useState('Miss Kasama Orthong');
  const [varSearch, setVarSearch] = useState('');
  const [signatories, setSignatories] = useState<string[]>(
    template?.variables?.filter(v => v.startsWith('{{sig_')) ?? SIGNATURE_VARIABLES
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const insertVariable = (v: string) => {
    const ta = bodyRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    setBody(body.slice(0, s) + v + body.slice(e));
    if (!usedVars.includes(v)) setUsedVars(prev => [...prev, v]);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + v.length; ta.focus(); }, 0);
  };

  const wrapSelection = (pre: string, suf: string = pre) => {
    const ta = bodyRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    setBody(body.slice(0, s) + pre + body.slice(s, e) + suf + body.slice(e));
    setTimeout(() => { ta.selectionStart = s + pre.length; ta.selectionEnd = e + pre.length; ta.focus(); }, 0);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: template?.id, name: name.trim(), description: desc.trim(), body, isActive, variables: Array.from(new Set([...usedVars, ...signatories])) });
  };

  const handleGeneratePDF = useCallback(() => {
    const el = document.getElementById('dtm-print'); if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return;
    w.document.write(`<html><head><title>Leave Request</title><style>body{margin:0;font-family:'Times New Roman',serif;}@media print{@page{size:A4;margin:20mm 25mm;}}</style></head><body>${el.innerHTML}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script></body></html>`);
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

        {/* ── Header ── KKU Blue */}
        <div className="bg-primary flex items-center justify-between px-6 py-4 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <RiFilePdf2Line size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{isCreate ? 'New Document Template' : `Edit — ${template?.name}`}</h2>
              <p className="text-xs text-white/60">{isCreate ? 'Create a new reusable document template' : template?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
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
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Template Name', val: name, set: setName },
                { label: 'Description', val: desc, set: setDesc },
                ...(isLeaveRequest ? [
                  { label: 'Dean Name', val: deanName, set: setDeanName },
                  { label: 'IR Staff', val: irStaff, set: setIrStaff },
                ] : []),
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

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ══ EDIT TAB ══ */}
          {subTab === 'Edit' && (
            <>
              {/* Formatting toolbar */}
              <div className="w-10 shrink-0 bg-[#DEEBFF]/30 border-r border-[#0776BC]/10 flex flex-col items-center py-3 gap-1">
                {[
                  { icon: 'B', title: 'Bold',      cls: 'font-bold',  pre: '**',  suf: '**' },
                  { icon: 'I', title: 'Italic',    cls: 'italic',     pre: '*',   suf: '*'  },
                  { icon: 'U', title: 'Underline', cls: 'underline',  pre: '__',  suf: '__' },
                ].map(btn => (
                  <button key={btn.icon} title={btn.title}
                    onMouseDown={e => { e.preventDefault(); wrapSelection(btn.pre, btn.suf); }}
                    className={`w-7 h-7 rounded flex items-center justify-center text-sm text-primary/70 hover:bg-[#DEEBFF] active:bg-[#DEEBFF] transition ${btn.cls}`}>
                    {btn.icon}
                  </button>
                ))}
                <div className="w-5 h-px bg-[#0776BC]/20 my-1" />
                {[{ icon: '≡', title: 'Left' }, { icon: '⫶', title: 'Center' }, { icon: '≣', title: 'Right' }].map((btn, i) => (
                  <button key={i} title={btn.title}
                    className="w-7 h-7 rounded flex items-center justify-center text-sm text-primary/70 hover:bg-[#DEEBFF] transition">
                    {btn.icon}
                  </button>
                ))}
              </div>

              {/* A4 textarea */}
              <div className="bg-[#f0f4f8] flex-1 overflow-y-auto p-6 flex justify-center min-h-0">
                <div className="bg-white w-full max-w-3xl shadow-md rounded-sm h-fit">
                  <div className="h-1.5 bg-primary rounded-t-sm" />
                  <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
                    placeholder={"Write your template here...\n\nClick a variable on the right panel to insert it at your cursor."}
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: '1.8', minHeight: '380px' }}
                    className="w-full px-10 py-8 text-sm text-gray-800 bg-transparent outline-none resize-none" />
                </div>
              </div>

              {/* Right panel */}
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
                    <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide">✍️ Signatures</p>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    {[
                      { v: '{{sig_student}}',  label: 'Student',  color: 'bg-violet-50 border-violet-200 text-violet-700' },
                      { v: '{{sig_advisor}}',  label: 'Advisor',  color: 'bg-amber-50 border-amber-200 text-amber-700' },
                      { v: '{{sig_ir_staff}}', label: 'IR Staff', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                      { v: '{{sig_dean}}',     label: 'Dean',     color: 'bg-rose-50 border-rose-200 text-rose-700' },
                    ].map(sig => {
                      const en = signatories.includes(sig.v);
                      return (
                        <div key={sig.v} className="flex items-center gap-1.5">
                          <button onMouseDown={e => { e.preventDefault(); setSignatories(p => p.includes(sig.v) ? p.filter(x => x !== sig.v) : [...p, sig.v]); }}
                            className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all', en ? 'bg-primary border-primary' : 'border-gray-300 bg-white')}>
                            {en && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </button>
                          <span className={clsx('flex-1 text-xs font-medium px-2 py-0.5 rounded border', sig.color)}>{sig.label}</span>
                          {en && <button onMouseDown={e => { e.preventDefault(); insertVariable(sig.v); }} title="Insert at cursor" className="text-[9px] text-primary/40 hover:text-primary transition px-1">+</button>}
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
            <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#f0f4f8]">
              <div className="bg-white w-full max-w-3xl mx-auto shadow-md rounded-sm">
                <div className="h-1.5 bg-primary rounded-t-sm" />
                <div className="px-10 py-8" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", lineHeight: '1.8' }}>
                  <LivePreview body={body} />
                  {signatories.length > 0 && body.trim() && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className={clsx('grid gap-4', signatories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4')}>
                        {signatories.map(sv => (
                          <div key={sv} className="flex flex-col items-center gap-2">
                            <div className="w-full h-12 border-b-2 border-gray-800 mt-4" />
                            <span className="text-xs text-gray-500 font-medium">{varLabel(sv).replace('✍ ', '').replace(' Signature', '')}</span>
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
          <span className="text-xs text-primary/40">{body.length} characters</span>
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
