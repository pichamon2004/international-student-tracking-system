'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiMailLine, RiPhoneLine, RiMapPinLine, RiCheckboxCircleLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { BsPeopleFill } from 'react-icons/bs';
import { RenewalDetailModal, type RenewalModalData } from '@/components/RenewalDetailModal';
import {
  studentApi, visaApi, healthInsuranceApi, dependentApi, academicDocumentApi,
  type ApiStudentDetail, type ApiVisa, type ApiHealthInsurance, type ApiDependent, type ApiAcademicDocument,
} from '@/lib/api';

type Tab = 'Personal' | 'Passport & Visa' | 'Health Insurance' | 'Academic Record' | 'Dependents' | 'Renewal History';

const TABS: Tab[] = ['Personal', 'Passport & Visa', 'Health Insurance', 'Academic Record', 'Dependents', 'Renewal History'];

function getVisaBadge(visas: ApiVisa[]): { label: string; cls: string } {
  const current = visas.find(v => v.isCurrent) ?? visas[0];
  if (!current) return { label: 'No Visa', cls: 'bg-gray-100 text-gray-500' };
  const days = Math.ceil((new Date(current.expiryDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { label: 'Expired',    cls: 'bg-red-100 text-red-600' };
  if (days < 14)  return { label: `${days} days`, cls: 'bg-red-100 text-red-600' };
  if (days <= 45) return { label: `${days} days`, cls: 'bg-yellow-100 text-yellow-600' };
  return { label: `${days} days`, cls: 'bg-green-100 text-green-700' };
}

function fmt(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-GB');
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-primary/50">{label}</span>
          <span className="text-sm font-semibold text-primary">{value}</span>
        </div>
      ))}
    </div>
  );
}

function CurrentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <RiCheckboxCircleLine size={12} /> Current
    </span>
  );
}

function PastBadge() {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Past
    </span>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Personal');
  const [renewalModal, setRenewalModal] = useState<RenewalModalData | null>(null);
  const [student, setStudent] = useState<ApiStudentDetail | null>(null);
  const [allVisas, setAllVisas] = useState<ApiVisa[]>([]);
  const [allInsurances, setAllInsurances] = useState<ApiHealthInsurance[]>([]);
  const [dependents, setDependents] = useState<ApiDependent[]>([]);
  const [academicDocs, setAcademicDocs] = useState<ApiAcademicDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([
      studentApi.getById(numId),
      visaApi.getAll(numId),
      healthInsuranceApi.getAll(numId),
      dependentApi.getAll(numId),
      academicDocumentApi.getAll(numId),
    ])
      .then(([sRes, vRes, iRes, dRes, aRes]) => {
        setStudent(sRes.data.data);
        setAllVisas(vRes.data.data);
        setAllInsurances(iRes.data.data);
        setDependents(dRes.data.data);
        setAcademicDocs(aRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-6 animate-pulse flex flex-col gap-6">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="flex gap-6 flex-1">
          <div className="w-64 bg-gray-100 rounded-2xl h-80" />
          <div className="flex-1 bg-gray-100 rounded-2xl h-80" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white w-full flex-1 rounded-2xl p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Student not found</p>
        <button onClick={() => router.back()} className="text-primary text-sm hover:underline">Back</button>
      </div>
    );
  }

  const name = [student.titleEn, student.firstNameEn, student.lastNameEn].filter(Boolean).join(' ') || '—';
  const initials = name.split(' ').filter(w => /^[A-Z]/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const currentPassport = student.passports?.find(p => p.isCurrent) ?? student.passports?.[0] ?? null;
  const currentVisa = allVisas.find(v => v.isCurrent) ?? allVisas[0] ?? null;
  const currentInsurance = allInsurances.find(i => i.isCurrent) ?? allInsurances[0] ?? null;
  const visaBadge = getVisaBadge(allVisas);

  const personalItems = [
    { label: 'Prefix',       value: student.titleEn ?? '—' },
    { label: 'First Name',   value: student.firstNameEn ?? '—' },
    { label: 'Middle Name',  value: student.middleNameEn ?? '—' },
    { label: 'Last Name',    value: student.lastNameEn ?? '—' },
    { label: 'Date of Birth', value: fmt(student.dateOfBirth) },
    { label: 'Gender',       value: student.gender ?? '—' },
    { label: 'Religion',     value: student.religion ?? '—' },
    { label: 'Nationality',  value: student.nationality ?? '—' },
    { label: 'Home Country', value: student.homeCountry ?? '—' },
    { label: 'Home Address', value: student.homeAddress ?? '—' },
    { label: 'Program',      value: student.program ?? '—' },
    { label: 'Faculty',      value: student.faculty ?? '—' },
    { label: 'Level',        value: student.level ?? '—' },
  ];

  const passportItems = currentPassport ? [
    { label: 'Passport No.',    value: currentPassport.passportNumber },
    { label: 'Issuing Country', value: currentPassport.issuingCountry },
    { label: 'Place of Issue',  value: currentPassport.placeOfIssue ?? '—' },
    { label: 'Date of Issue',   value: fmt(currentPassport.issueDate) },
    { label: 'Expiry Date',     value: fmt(currentPassport.expiryDate) },
    { label: 'MRZ Line 1',      value: currentPassport.mrzLine1 ?? '—' },
    { label: 'MRZ Line 2',      value: currentPassport.mrzLine2 ?? '—' },
  ] : [{ label: 'Status', value: 'No passport on file' }];

  const visaItems = currentVisa ? [
    { label: 'Visa Type',       value: currentVisa.visaType },
    { label: 'Visa Number',     value: currentVisa.visaNumber ?? '—' },
    { label: 'Issuing Country', value: currentVisa.issuingCountry },
    { label: 'Place of Issue',  value: currentVisa.issuingPlace ?? '—' },
    { label: 'Valid From',      value: fmt(currentVisa.issueDate) },
    { label: 'Valid Until',     value: fmt(currentVisa.expiryDate) },
    { label: 'Entries',         value: currentVisa.entries ?? '—' },
  ] : [{ label: 'Status', value: 'No visa on file' }];

  const insuranceItems = currentInsurance ? [
    { label: 'Provider',      value: currentInsurance.provider },
    { label: 'Policy No.',    value: currentInsurance.policyNumber ?? '—' },
    { label: 'Coverage Type', value: currentInsurance.coverageType ?? '—' },
    { label: 'Valid From',    value: fmt(currentInsurance.startDate) },
    { label: 'Valid Until',   value: fmt(currentInsurance.expiryDate) },
  ] : [{ label: 'Status', value: 'No insurance on file' }];

  return (
    <div className="bg-white w-full flex-1 rounded-2xl p-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-all duration-200 shrink-0"
        >
          <RiArrowLeftLine size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-primary">Student Profile</h1>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left: Profile Card ── */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-4">

          {/* Avatar */}
          <div className="bg-secondary rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
            <div className="text-center">
              <p className="font-semibold text-primary">{name}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{student.studentId ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{student.nationality ?? '—'}</p>
            </div>
            <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', visaBadge.cls)}>
              Visa: {visaBadge.label}
            </span>
          </div>

          {/* Contact */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Contact</p>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMailLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span className="break-all">{student.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <RiPhoneLine size={15} className="shrink-0 text-primary/50" />
              <span>{student.phone ?? '—'}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMapPinLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span>{student.addressInThailand ?? student.homeAddress ?? '—'}</span>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-secondary rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide">Emergency Contact</p>
            <span className="text-sm font-semibold text-primary mt-1">{student.emergencyContact ?? '—'}</span>
            <div className="flex items-start gap-2.5 text-sm text-primary">
              <RiMailLine size={15} className="shrink-0 mt-0.5 text-primary/50" />
              <span className="break-all">{student.emergencyEmail ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <RiPhoneLine size={15} className="shrink-0 text-primary/50" />
              <span>{student.emergencyPhone ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-primary">
              <BsPeopleFill size={15} className="shrink-0 text-primary/50" />
              <span>{student.emergencyRelation ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Tab Bar */}
          <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-3 py-2 rounded-t-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-primary'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Personal ── */}
          {activeTab === 'Personal' && (
            <div className="bg-secondary rounded-2xl p-6">
              <InfoGrid items={personalItems} />
            </div>
          )}

          {/* ── Passport & Visa ── */}
          {activeTab === 'Passport & Visa' && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-3">
                <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                  <p className="text-sm font-semibold text-primary">Passport Information</p>
                  <InfoGrid items={passportItems} />
                </div>
                {currentPassport?.imageUrl && (
                  <img src={currentPassport.imageUrl} alt="Passport"
                    className="w-full md:w-3/5 object-cover rounded-xl bg-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                  <p className="text-sm font-semibold text-primary">Visa Information</p>
                  <InfoGrid items={visaItems} />
                </div>
                {currentVisa?.imageUrl && (
                  <img src={currentVisa.imageUrl} alt="Visa"
                    className="h-36 w-full object-contain rounded-xl bg-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            </div>
          )}

          {/* ── Health Insurance ── */}
          {activeTab === 'Health Insurance' && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 bg-secondary rounded-2xl p-6 flex flex-col gap-4">
                <InfoGrid items={insuranceItems} />
              </div>
              {currentInsurance?.fileUrl && (
                <img src={currentInsurance.fileUrl} alt="Insurance"
                  className="w-full lg:w-1/2 object-cover rounded-xl bg-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          )}

          {/* ── Academic Record ── */}
          {activeTab === 'Academic Record' && (
            <div className="flex flex-col gap-4">
              <div className="bg-secondary rounded-2xl p-6">
                <InfoGrid items={[
                  { label: 'Faculty',   value: student.faculty ?? '—' },
                  { label: 'Program',   value: student.program ?? '—' },
                  { label: 'Level',     value: student.level ?? '—' },
                  { label: 'Enrollment Date',      value: fmt(student.enrollmentDate) },
                  { label: 'Expected Graduation',  value: fmt(student.expectedGraduation) },
                  { label: 'Scholarship',          value: student.scholarship ?? '—' },
                ]} />
              </div>
              {academicDocs.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide">Academic Documents</p>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Institution</th>
                          <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Issue Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {academicDocs.map(doc => (
                          <tr key={doc.id}>
                            <td className="py-3 px-4 text-primary font-medium">{doc.docType}</td>
                            <td className="py-3 px-4 text-primary">{doc.institution}</td>
                            <td className="py-3 px-4 text-primary">{fmt(doc.issueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Dependents ── */}
          {activeTab === 'Dependents' && (
            <div className="bg-secondary rounded-2xl p-6">
              {dependents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No dependents recorded</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Relation</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Nationality</th>
                      <th className="text-left py-2 px-3 font-semibold text-primary/70 text-xs">Passport No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dependents.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100 last:border-none">
                        <td className="py-2.5 px-3 text-primary font-medium">{[d.firstName, d.lastName].filter(Boolean).join(' ')}</td>
                        <td className="py-2.5 px-3 text-gray-500">{d.relationship}</td>
                        <td className="py-2.5 px-3 text-gray-500">{d.nationality}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-500 text-xs">{d.passportNumber ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Renewal History ── */}
          {activeTab === 'Renewal History' && (
            <div className="flex flex-col gap-5">

              {/* PASSPORT */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Passport History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Passport No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Issuing Country</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Issue Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Expiry Date</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.passports?.length ? student.passports.map((p) => (
                        <tr key={p.id}
                          onClick={() => setRenewalModal({ kind: 'passport', data: {
                            passportNumber: p.passportNumber,
                            issuingCountry: p.issuingCountry,
                            issueDate: fmt(p.issueDate),
                            expiryDate: fmt(p.expiryDate),
                            isCurrent: p.isCurrent,
                            imageUrl: p.imageUrl ?? undefined,
                            mrzLine1: p.mrzLine1 ?? undefined,
                            mrzLine2: p.mrzLine2 ?? undefined,
                            extraItems: passportItems,
                          }})}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', p.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 font-mono text-primary font-medium">{p.passportNumber}</td>
                          <td className="py-3 px-4 text-primary">{p.issuingCountry}</td>
                          <td className="py-3 px-4 text-primary">{fmt(p.issueDate)}</td>
                          <td className="py-3 px-4 text-primary">{fmt(p.expiryDate)}</td>
                          <td className="py-3 px-4 text-center">{p.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">No passport records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VISA */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Visa History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Visa Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Visa Number</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Valid From</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Valid Until</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allVisas.length ? allVisas.map((v) => (
                        <tr key={v.id}
                          onClick={() => setRenewalModal({ kind: 'visa', data: {
                            passportNo: '—',
                            visaType: v.visaType,
                            placeOfIssue: v.issuingPlace ?? '—',
                            validFrom: fmt(v.issueDate),
                            validUntil: fmt(v.expiryDate),
                            entries: v.entries ?? '—',
                            isCurrent: v.isCurrent,
                            imageUrls: v.imageUrl ? [v.imageUrl] : undefined,
                          }})}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', v.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 text-primary font-medium">{v.visaType}</td>
                          <td className="py-3 px-4 font-mono text-primary">{v.visaNumber ?? '—'}</td>
                          <td className="py-3 px-4 text-primary">{fmt(v.issueDate)}</td>
                          <td className="py-3 px-4 text-primary">{fmt(v.expiryDate)}</td>
                          <td className="py-3 px-4 text-center">{v.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">No visa records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HEALTH INSURANCE */}
              <div>
                <p className="text-xs font-semibold text-primary/50 uppercase tracking-wide mb-2">Health Insurance History</p>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Provider</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Policy No.</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Start Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Expiry Date</th>
                        <th className="text-center py-3 px-4 font-semibold text-primary/60 text-xs uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allInsurances.length ? allInsurances.map((ins) => (
                        <tr key={ins.id}
                          onClick={() => setRenewalModal({ kind: 'insurance', data: {
                            provider: ins.provider,
                            policyNumber: ins.policyNumber ?? '—',
                            coverageType: ins.coverageType ?? '—',
                            startDate: fmt(ins.startDate),
                            expiryDate: fmt(ins.expiryDate),
                            isCurrent: ins.isCurrent,
                            imageUrl: ins.fileUrl ?? undefined,
                          }})}
                          className={clsx('cursor-pointer hover:bg-secondary/40 transition', ins.isCurrent && 'bg-green-50/40')}>
                          <td className="py-3 px-4 text-primary font-medium">{ins.provider}</td>
                          <td className="py-3 px-4 font-mono text-primary">{ins.policyNumber ?? '—'}</td>
                          <td className="py-3 px-4 text-primary">{fmt(ins.startDate)}</td>
                          <td className="py-3 px-4 text-primary">{fmt(ins.expiryDate)}</td>
                          <td className="py-3 px-4 text-center">{ins.isCurrent ? <CurrentBadge /> : <PastBadge />}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">No insurance records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {renewalModal && (
        <RenewalDetailModal
          record={renewalModal}
          onClose={() => setRenewalModal(null)}
        />
      )}

    </div>
  );
}
