'use client';

import { createPortal } from 'react-dom';
import { RiCloseLine, RiCheckboxCircleLine } from 'react-icons/ri';

/* ─── Types ─────────────────────────────────────────────────── */

export interface PassportRecord {
  passportNumber: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  isCurrent: boolean;
  // Extended — populated for current record
  extraItems?: { label: string; value: string }[];
  imageUrl?: string;
  mrzLine1?: string;
  mrzLine2?: string;
}

export interface VisaRecord {
  passportNo: string;
  visaType: string;
  placeOfIssue: string;
  validFrom: string;
  validUntil: string;
  entries: string;
  isCurrent: boolean;
  imageUrls?: string[];
}

export interface InsuranceRecord {
  provider: string;
  policyNumber: string;
  coverageType: string;
  startDate: string;
  expiryDate: string;
  isCurrent: boolean;
  imageUrl?: string;
}

export type RenewalModalData =
  | { kind: 'passport';  data: PassportRecord  }
  | { kind: 'visa';      data: VisaRecord       }
  | { kind: 'insurance'; data: InsuranceRecord  };

/* ─── Field component ───────────────────────────────────────── */

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-primary/50">{label}</span>
      <span className={`text-sm font-bold text-primary ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────── */

export function RenewalDetailModal({ record, onClose }: { record: RenewalModalData; onClose: () => void }) {
  const { kind, data } = record;
  const isCurrent = data.isCurrent;

  const statusBadge = isCurrent
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><RiCheckboxCircleLine size={12} /> Current record</span>
    : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Past record</span>;

  /* Passport fields */
  const passportFields: { label: string; value: string; mono?: boolean }[] =
    kind === 'passport'
      ? (data.extraItems
          ? data.extraItems.map(it => ({ label: it.label, value: it.value }))
          : [
              { label: 'Passport No.',    value: data.passportNumber, mono: true },
              { label: 'Issuing Country', value: data.issuingCountry },
              { label: 'Date of Issue',   value: data.issueDate },
              { label: 'Expiry Date',     value: data.expiryDate },
            ])
      : [];

  /* Visa fields */
  const visaFields: { label: string; value: string; mono?: boolean }[] =
    kind === 'visa'
      ? [
          { label: 'Passport',          value: data.passportNo, mono: true },
          { label: 'Place of Issue',    value: data.placeOfIssue },
          { label: 'Valid From',        value: data.validFrom },
          { label: 'Valid Until',       value: data.validUntil },
          { label: 'Type of Visa',      value: data.visaType },
          { label: 'Number of Entries', value: data.entries },
        ]
      : [];

  /* Insurance fields */
  const insuranceFields: { label: string; value: string; mono?: boolean }[] =
    kind === 'insurance'
      ? [
          { label: 'Provider',      value: data.provider },
          { label: 'Policy No.',    value: data.policyNumber, mono: true },
          { label: 'Coverage Type', value: data.coverageType },
          { label: 'Valid From',    value: data.startDate },
          { label: 'Valid Until',   value: data.expiryDate },
        ]
      : [];

  const fields = [...passportFields, ...visaFields, ...insuranceFields];

  const title =
    kind === 'passport'  ? 'Passport Information' :
    kind === 'visa'      ? 'Visa Information' :
                           'Health Insurance';

  /* Info card */
  const infoCard = (
    <div className="bg-[#DEEBFF]/70 rounded-2xl p-5">
      <p className="text-sm font-bold text-primary mb-3">{title}</p>
      <div className="mb-3">{statusBadge}</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {fields.map(f => <Field key={f.label} label={f.label} value={f.value} mono={f.mono} />)}
      </div>
    </div>
  );

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">
              {kind === 'passport' ? 'Passport Information' : kind === 'visa' ? 'Visa Information' : 'Health Insurance'}
            </span>
            <span className="ml-1">{statusBadge}</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition">
            <RiCloseLine size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">

        {/* ── Insurance: side-by-side ── */}
        {kind === 'insurance' && (
          <div className="flex gap-3 items-stretch">
            <div className="flex-1">{infoCard}</div>
            {data.imageUrl && (
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl p-3 bg-gray-50 flex items-center">
                <img
                  src={data.imageUrl}
                  alt="Insurance card"
                  className="w-full rounded-xl object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Passport: stacked ── */}
        {kind === 'passport' && (
          <div className="flex flex-col gap-3">
            {infoCard}
            {data.imageUrl && (
              <img
                src={data.imageUrl}
                alt="Passport"
                className="w-full rounded-2xl shadow object-cover"
                style={{ maxHeight: '260px', objectPosition: 'top' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {(data.mrzLine1 || data.mrzLine2) && (
              <div className="bg-gray-50 border border-red-400 rounded-xl px-4 py-3 font-mono text-[11px] text-gray-800 leading-relaxed tracking-widest">
                {data.mrzLine1 && <p>{data.mrzLine1}</p>}
                {data.mrzLine2 && <p>{data.mrzLine2}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Visa: stacked with image grid ── */}
        {kind === 'visa' && (
          <div className="flex flex-col gap-3">
            {infoCard}
            {data.imageUrls && data.imageUrls.length > 0 && (
              <div className={`grid gap-3 ${data.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {data.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Visa ${i + 1}`}
                    className="w-full rounded-2xl shadow object-cover aspect-[4/3]"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        </div>{/* end Body */}
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
