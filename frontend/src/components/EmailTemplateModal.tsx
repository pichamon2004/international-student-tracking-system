'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { RiCloseLine, RiMailLine, RiSendPlaneLine } from 'react-icons/ri';

/* ─── Types ─────────────────────────────────────────────────── */
export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  variables: string[];
  body: string;
}

const VARIABLE_LABELS: Record<string, string> = {
  '{{student_name}}':     'Student Name',
  '{{student_id}}':       'Student ID',
  '{{email}}':            'Email',
  '{{visa_expiry_date}}': 'Visa Expiry Date',
  '{{days_remaining}}':   'Days Remaining',
  '{{request_type}}':     'Request Type',
  '{{status}}':           'Status',
  '{{program}}':          'Program',
  '{{date}}':             'Current Date',
};

function varLabel(v: string) {
  return VARIABLE_LABELS[v] ?? v.replace(/[{}]/g, '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface EmailTemplateModalProps {
  template: EmailTemplate | null;
  isCreate: boolean;
  allVariables: string[];
  onSave: (data: Partial<EmailTemplate> & { id?: number }) => void;
  onClose: () => void;
}

export default function EmailTemplateModal({ template, isCreate, allVariables, onSave, onClose }: EmailTemplateModalProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [selectedVars, setSelectedVars] = useState<string[]>(template?.variables ?? []);
  const [varSearch, setVarSearch] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const insertVariable = (v: string) => {
    const ta = bodyRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = body.slice(0, s) + v + body.slice(e);
    setBody(next);
    if (!selectedVars.includes(v)) setSelectedVars(prev => [...prev, v]);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + v.length; ta.focus(); }, 0);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: template?.id, name: name.trim(), subject: subject.trim(), body, isActive, variables: selectedVars });
  };

  const vars = isCreate ? selectedVars : (template?.variables ?? []);
  const filteredVars = allVariables.filter(v =>
    varLabel(v).toLowerCase().includes(varSearch.toLowerCase()) || v.toLowerCase().includes(varSearch.toLowerCase())
  );

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header — KKU Blue (matches navbar) ── */}
        <div className="bg-primary text-white px-5 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <RiMailLine size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">{isCreate ? 'New Email Template' : 'Edit Email Template'}</p>
              {template && <p className="text-xs text-white/60">{template.name}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-white">
            <RiCloseLine size={15} />
          </button>
        </div>

        {/* ── Compose Fields ── */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

          {/* Template name */}
          <div className="border-b border-[#0776BC]/10 px-5 py-2.5 flex items-center gap-3 bg-[#DEEBFF]/30">
            <span className="text-xs text-primary/50 font-medium w-16 shrink-0">Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name..."
              className="flex-1 text-sm text-gray-800 outline-none bg-transparent placeholder:text-gray-400" />
          </div>

          {/* From */}
          <div className="border-b border-[#0776BC]/10 px-5 py-2.5 flex items-center gap-3 bg-[#DEEBFF]/10">
            <span className="text-xs text-primary/50 font-medium w-16 shrink-0">From</span>
            <span className="text-sm text-gray-400 italic">noreply@kku.ac.th</span>
          </div>

          {/* To */}
          <div className="border-b border-[#0776BC]/10 px-5 py-2.5 flex items-center gap-3 bg-[#DEEBFF]/10">
            <span className="text-xs text-primary/50 font-medium w-16 shrink-0">To</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DEEBFF] text-primary text-xs font-medium border border-primary/20">
              {'{{student_email}}'}
            </span>
          </div>

          {/* Subject */}
          <div className="border-b border-[#0776BC]/15 px-5 py-2.5 flex items-center gap-3">
            <span className="text-xs text-primary/50 font-medium w-16 shrink-0">Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..."
              className="flex-1 text-sm font-medium text-gray-800 outline-none bg-transparent placeholder:font-normal placeholder:text-gray-400" />
          </div>

          {/* Body */}
          <div className="flex-1 bg-white min-h-0">
            <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder="เขียนเนื้อหาอีเมลที่นี่..."
              className="w-full px-5 py-4 text-sm text-gray-800 outline-none resize-none bg-transparent"
              style={{ fontFamily: "Arial, sans-serif", minHeight: '180px' }}
            />
          </div>

          {/* Variable picker */}
          <div className="px-4 py-3 border-t border-[#0776BC]/10 bg-[#DEEBFF]/20 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Insert Variable</span>
              <div className="relative">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-primary/40" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={varSearch} onChange={e => setVarSearch(e.target.value)} placeholder="Search..."
                  className="pl-5 pr-2 py-0.5 text-[11px] border border-[#0776BC]/20 rounded-lg bg-white outline-none focus:border-primary transition-colors w-32" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredVars.map(v => (
                <button key={v}
                  onMouseDown={e => { e.preventDefault(); insertVariable(v); }}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95',
                    vars.includes(v)
                      ? 'bg-[#DEEBFF] text-primary border-primary/30 hover:bg-primary/10'
                      : 'bg-white text-primary/60 border-[#0776BC]/15 hover:border-primary/30 hover:text-primary hover:bg-[#DEEBFF]/50'
                  )}>
                  {varLabel(v)}
                </button>
              ))}
              {filteredVars.length === 0 && <span className="text-[11px] text-gray-400 italic">No matches</span>}
            </div>
            {/* Status toggle */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#0776BC]/10">
              <span className="text-xs text-primary/50">Status</span>
              <button onClick={() => setIsActive(a => !a)} className="inline-flex items-center gap-2">
                <div className={clsx('relative w-8 h-4 rounded-full transition-colors', isActive ? 'bg-green-500' : 'bg-gray-300')}>
                  <span className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all', isActive ? 'left-4' : 'left-0.5')} />
                </div>
                <span className={clsx('text-xs font-medium', isActive ? 'text-green-600' : 'text-gray-400')}>{isActive ? 'Active' : 'Inactive'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer — KKU themed send button ── */}
        <div className="bg-[#DEEBFF]/30 border-t border-[#0776BC]/10 px-5 py-3 flex items-center gap-3 shrink-0">
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <RiSendPlaneLine size={14} />
            {isCreate ? 'Create Template' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#0776BC]/20 text-primary/60 text-sm font-medium hover:bg-[#DEEBFF] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
