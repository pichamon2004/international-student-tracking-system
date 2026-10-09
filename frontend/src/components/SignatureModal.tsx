'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiUploadCloud2Line, RiCheckLine, RiTimeLine, RiImageLine, RiDownloadLine } from 'react-icons/ri';
import SignaturePad from '@/components/ui/SignaturePad';
import { generatedDocApi, type ApiDocSignature } from '@/lib/api';

type DigitalTab = 'draw' | 'uploadImage';

const ROLE_LABELS: Record<string, string> = {
  student:  'Student',
  ir_staff: 'IR Staff',
  advisor:  'Advisor',
  dean:     'Dean',
};

interface Props {
  docId:       number;
  myRole:      string;
  signatures:  ApiDocSignature[];
  requiredRoles: string[];
  signingMethod?: 'manual' | 'digital';
  fileUrl?:    string | null;
  onSigned:    (updated: ApiDocSignature[]) => void;
  onClose:     () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SignatureModal({
  docId,
  myRole,
  signatures,
  requiredRoles,
  signingMethod = 'digital',
  fileUrl,
  onSigned,
  onClose,
}: Props) {
  const [digitalTab, setDigitalTab] = useState<DigitalTab>('draw');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isSigned = (role: string) => signatures.some(s => s.role === role);
  const myAlreadySigned = isSigned(myRole);
  const myRoleNotRequired = requiredRoles.length > 0 && !requiredRoles.includes(myRole);

  const handleDigitalConfirm = async (dataUrl: string) => {
    setLoading(true);
    setError('');
    try {
      await generatedDocApi.addDigitalSignature(docId, myRole, dataUrl);
      const res = await generatedDocApi.getSignatures(docId);
      onSigned(res.data.data);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG or JPG)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await handleDigitalConfirm(dataUrl);
    } catch {
      setError('Failed to read image file');
      setLoading(false);
    }
  };

  const handlePdfFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await generatedDocApi.uploadSignedPdf(docId, file, myRole);
      const res = await generatedDocApi.getSignatures(docId);
      onSigned(res.data.data);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary flex items-center justify-between px-6 py-4 rounded-t-2xl shrink-0">
          <h2 className="text-sm font-semibold text-white">Sign Document</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            <RiCloseLine size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-5 p-6">
          {/* Signature status row */}
          {requiredRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {requiredRoles.map(role => (
                <div
                  key={role}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isSigned(role)
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  {isSigned(role) ? <RiCheckLine size={12} /> : <RiTimeLine size={12} />}
                  {ROLE_LABELS[role] ?? role}
                </div>
              ))}
            </div>
          )}

          {myRoleNotRequired ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              This document does not require a signature from the {ROLE_LABELS[myRole] ?? myRole} role —
              only {requiredRoles.map(r => ROLE_LABELS[r] ?? r).join(', ')} need to sign.
            </div>
          ) : myAlreadySigned ? (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <RiCheckLine size={16} />
              You have already signed this document.
            </div>
          ) : signingMethod === 'manual' ? (
            /* ── Manual: print, sign by hand, upload the whole signed PDF back ── */
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                This document requires a manual signature. Download it, print it, sign it by hand, then scan or
                photograph the signed copy and upload it here as a PDF.
              </p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition"
                >
                  <RiDownloadLine size={14} /> Download Document
                </a>
              )}
              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handlePdfFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <RiUploadCloud2Line size={32} className="text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Drop the signed PDF here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-0.5">Only .pdf files accepted</p>
                </div>
                {loading && <p className="text-xs text-primary font-medium">Uploading…</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          ) : (
            /* ── Digital: draw on canvas, or upload an image of your signature ── */
            <>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {(['draw', 'uploadImage'] as DigitalTab[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDigitalTab(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      digitalTab === t ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'draw' ? 'Draw Signature' : 'Upload Signature Image'}
                  </button>
                ))}
              </div>

              {digitalTab === 'draw' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-500">
                    Draw your signature below. It will be embedded into the PDF automatically.
                  </p>
                  {loading ? (
                    <div className="h-24 flex items-center justify-center text-sm text-gray-400">
                      Saving…
                    </div>
                  ) : (
                    <SignaturePad onConfirm={handleDigitalConfirm} />
                  )}
                </div>
              )}

              {digitalTab === 'uploadImage' && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-500">
                    Upload an image of your signature (PNG or JPG). It will be embedded into the PDF the same way a
                    drawn signature would be.
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition cursor-pointer ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageFile(file);
                    }}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <RiImageLine size={32} className="text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Drop an image here or click to browse</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG or JPG</p>
                    </div>
                    {loading && <p className="text-xs text-primary font-medium">Saving…</p>}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
