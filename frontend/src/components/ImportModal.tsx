'use client';

import { useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { RiCloseLine, RiUploadLine, RiDownloadLine, RiCheckLine, RiCloseFill, RiArrowRightLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';

export interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
  example?: string;
}

interface ParsedRow {
  [key: string]: string;
}


interface ImportModalProps {
  title: string;
  columns: ColumnDef[];
  importEndpoint: string;
  templateFileName: string;
  onClose: () => void;
  onDone: () => void;
}

type Stage = 'upload' | 'mapping' | 'preview';

function validateRow(row: ParsedRow, columns: ColumnDef[]): string | null {
  for (const col of columns) {
    if (col.required && !row[col.key]?.trim()) {
      return `Missing required field: ${col.label}`;
    }
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    return 'Invalid email format';
  }
  return null;
}

function computeErrors(rows: ParsedRow[], columns: ColumnDef[]): (string | null)[] {
  const perRow = rows.map(r => validateRow(r, columns));
  // detect duplicate emails within the batch
  const seen = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const email = rows[i].email?.trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) {
      perRow[i] = `Duplicate email (same as row ${seen.get(email)! + 1})`;
    } else {
      seen.set(email, i + 1);
    }
  }
  return perRow;
}

// ── auto-suggest: ลอง match ชื่อ header ใน Excel กับ key ของระบบ ──
function autoMatch(excelHeaders: string[], systemKey: string): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-\.]/g, '');
  const target = normalize(systemKey);
  return excelHeaders.find(h => normalize(h) === target) ?? '';
}

export default function ImportModal({
  title,
  columns,
  importEndpoint,
  templateFileName,
  onClose,
  onDone,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');

  // raw data from Excel
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');

  // mapping: systemKey → excelHeader ('' = ไม่ map)
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // mapped & validated rows
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<(string | null)[]>([]);

  // edit state
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // result
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const downloadTemplate = () => {
    const exampleRow = columns.map(c => c.example ?? '');
    const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.key), exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, templateFileName);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // parse as array-of-arrays to get raw headers
      const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const headers = (aoa[0] ?? []).map(String).filter(Boolean);

      // parse as JSON with raw headers as keys
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // auto-suggest mapping
      const suggested: Record<string, string> = {};
      for (const col of columns) {
        suggested[col.key] = autoMatch(headers, col.key);
      }

      setExcelHeaders(headers);
      setExcelRows(rows);
      setMapping(suggested);
      setStage('mapping');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const applyMapping = () => {
    // transform excelRows → parsedRows using current mapping
    const mapped: ParsedRow[] = excelRows.map(row => {
      const result: ParsedRow = {};
      for (const col of columns) {
        const excelKey = mapping[col.key];
        result[col.key] = excelKey ? String(row[excelKey] ?? '') : '';
      }
      return result;
    });
    setParsedRows(mapped);
    setRowErrors(computeErrors(mapped, columns));
    setStage('preview');
  };

  // ── inline edit ──────────────────────────────────────────────────
  const startEdit = (rowIdx: number, col: string, value: string) => {
    setEditingCell({ row: rowIdx, col });
    setEditValue(value);
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { row: rowIdx, col } = editingCell;
    const newRows = parsedRows.map((r, i) =>
      i === rowIdx ? { ...r, [col]: editValue } : r
    );
    const newErrors = computeErrors(newRows, columns);
    setParsedRows(newRows);
    setRowErrors(newErrors);
    setEditingCell(null);
  }, [editingCell, editValue, parsedRows, columns]);

  const validRows = parsedRows.filter((_, i) => !rowErrors[i]);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post(importEndpoint, { rows: validRows });
      const { successCount: sc, failCount: fc } = res.data.data;
      if (fc === 0) toast.success(`นำเข้าสำเร็จ ${sc} รายการ`);
      else toast.error(`สำเร็จ ${sc} / ล้มเหลว ${fc} รายการ`);
      if (sc > 0) onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => onClose();

  const resetToUpload = () => {
    setStage('upload');
    setExcelHeaders([]);
    setExcelRows([]);
    setMapping({});
    setParsedRows([]);
    setRowErrors([]);
    setEditingCell(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const mappingHasRequired = columns
    .filter(c => c.required)
    .every(c => mapping[c.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold text-primary">{title}</p>
            {/* Step indicator */}
            {(stage === 'mapping' || stage === 'preview') && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className={stage === 'mapping' ? 'text-primary font-medium' : ''}>จับคู่คอลัมน์</span>
                <RiArrowRightLine size={12} />
                <span className={stage === 'preview' ? 'text-primary font-medium' : ''}>ตรวจสอบ</span>
              </div>
            )}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RiCloseLine size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* Stage: upload */}
          {stage === 'upload' && (
            <>
              <div className="flex gap-3">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RiDownloadLine size={16} />
                  Download Template
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-blue-50/50'
                    : 'border-gray-200 hover:border-primary/40 hover:bg-blue-50/30'
                }`}
                onDrop={e => { setIsDragging(false); handleDrop(e); }}
                onDragOver={e => e.preventDefault()}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <RiUploadLine size={32} className="text-gray-300" />
                <p className="text-sm text-gray-500">ลากไฟล์มาวาง หรือ <span className="text-primary font-medium">เลือกไฟล์</span></p>
                <p className="text-xs text-gray-400">.xlsx หรือ .xls</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </>
          )}

          {/* Stage: mapping */}
          {stage === 'mapping' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">พบ {excelHeaders.length} คอลัมน์ · {excelRows.length} แถว</p>
                </div>
                <button onClick={resetToUpload} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <RiCloseLine size={14} /> เปลี่ยนไฟล์
                </button>
              </div>

              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Field ของระบบ</th>
                      <th className="px-4 py-2.5 text-left w-6"></th>
                      <th className="px-4 py-2.5 text-left">คอลัมน์ใน Excel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {columns.map(col => (
                      <tr key={col.key} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-700">{col.label}</span>
                          {col.required && <span className="ml-1 text-red-400 text-xs">*</span>}
                        </td>
                        <td className="text-gray-300 text-center">→</td>
                        <td className="px-4 py-2">
                          <CustomSelect
                            value={mapping[col.key] ?? ''}
                            onChange={v => setMapping(m => ({ ...m, [col.key]: v }))}
                            options={excelHeaders}
                            placeholder="— ไม่ใช้ —"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!mappingHasRequired && (
                <p className="text-xs text-red-500">กรุณาเลือก field ที่มีเครื่องหมาย * ให้ครบก่อน</p>
              )}
            </>
          )}

          {/* Stage: preview */}
          {stage === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-gray-700">{fileName}</p>
                  <p className="text-xs text-gray-400">
                    {parsedRows.length} แถว — พร้อม {validRows.length} / มี error {parsedRows.length - validRows.length}
                  </p>
                </div>
                <button
                  onClick={() => setStage('mapping')}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  ← แก้การจับคู่
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">#</th>
                      {columns.map(c => (
                        <th key={c.key} className="px-3 py-2 text-left">{c.label}</th>
                      ))}
                      <th className="px-3 py-2 text-left">สถานะ</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedRows.map((row, i) => {
                      const err = rowErrors[i];
                      return (
                        <tr key={i} className={err ? 'bg-red-50' : 'hover:bg-gray-50/60'}>
                          <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                          {columns.map(c => {
                            const isEditing = editingCell?.row === i && editingCell?.col === c.key;
                            return (
                              <td key={c.key} className="px-1.5 py-1 max-w-[160px]">
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') commitEdit();
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="w-full border border-primary rounded-lg px-2 py-1 text-xs text-primary outline-none bg-white"
                                  />
                                ) : (
                                  <button
                                    onClick={() => startEdit(i, c.key, row[c.key] ?? '')}
                                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors text-gray-700 truncate block text-xs"
                                    title="คลิกเพื่อแก้ไข"
                                  >
                                    {row[c.key] || <span className="text-gray-300 italic">—</span>}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            {err ? (
                              <span className="text-xs text-red-500 flex items-center gap-1">
                                <RiCloseFill size={13} /> {err}
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <RiCheckLine size={13} /> พร้อม
                              </span>
                            )}
                          </td>
                          <td className="pr-2">
                            <button
                              onClick={() => {
                                const newRows = parsedRows.filter((_, idx) => idx !== i);
                                setParsedRows(newRows);
                                setRowErrors(computeErrors(newRows, columns));
                                if (editingCell?.row === i) setEditingCell(null);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-100 hover:text-red-500 transition-colors"
                              title="ลบแถวนี้"
                            >
                              <RiCloseLine size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>

          {stage === 'mapping' && (
            <button
              onClick={applyMapping}
              disabled={!mappingHasRequired}
              className="px-5 py-2 rounded-xl text-sm bg-primary text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              ถัดไป <RiArrowRightLine size={15} />
            </button>
          )}

          {stage === 'preview' && (
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="px-5 py-2 rounded-xl text-sm bg-primary text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <RiUploadLine size={15} />
              )}
              Import {validRows.length} แถว
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
