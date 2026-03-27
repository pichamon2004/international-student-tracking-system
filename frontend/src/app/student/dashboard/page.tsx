'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiEyeLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { FaPlus } from 'react-icons/fa6';
import { FaIdCard, FaPassport } from 'react-icons/fa6';
import { RiHealthBookFill } from 'react-icons/ri';
import { studentMeApi, requestApi, type ApiRequest } from '@/lib/api';

const STEPS = ['Submitted', 'In Review', 'Approved', 'Processing', 'Completed'];

function daysRemaining(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
}

function statusToStep(status: string): number {
  switch (status) {
    case 'PENDING':               return 0;
    case 'FORWARDED_TO_ADVISOR':  return 1;
    case 'ADVISOR_APPROVED':      return 2;
    case 'STAFF_APPROVED':        return 3;
    case 'COMPLETED':             return 4;
    default:                      return 0;
  }
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={clsx(
            'w-5 h-5 rounded-full border-2',
            i < step  ? 'bg-green-400 border-green-400' :
            i === step ? 'bg-yellow-400 border-yellow-400' :
                         'bg-white border-gray-300'
          )} />
          {i < STEPS.length - 1 && (
            <div className={clsx('w-4 h-0.5', i < step ? 'bg-green-400' : 'bg-gray-300')} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [passportDays, setPassportDays] = useState<number | null>(null);
  const [visaDays, setVisaDays] = useState<number | null>(null);
  const [insuranceDays, setInsuranceDays] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, reqRes] = await Promise.all([
          studentMeApi.get(),
          requestApi.getAll(),
        ]);

        const me = meRes.data.data;

        // Passport days
        const currentPassport = me.passports?.find((p) => p.isCurrent);
        if (currentPassport) setPassportDays(daysRemaining(currentPassport.expiryDate));

        // Visa days
        const currentVisa = me.visas?.find((v) => v.isCurrent);
        if (currentVisa) setVisaDays(daysRemaining(currentVisa.expiryDate));

        // Health insurance days
        const currentInsurance = me.healthInsurances?.find((h) => h.isCurrent);
        if (currentInsurance) setInsuranceDays(daysRemaining(currentInsurance.expiryDate));

        setRequests(reqRes.data.data);
      } catch {
        // Silently handle errors — page remains visible with nulls
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    { label: 'Passport Remaining',         addLabel: 'Passport',         value: passportDays,  icon: FaPassport,        iconBg: '#FFC5C6', iconColor: '#FF0000' },
    { label: 'Visa Remaining',             addLabel: 'VISA',             value: visaDays,      icon: FaIdCard,          iconBg: '#DFC2FF', iconColor: '#8B2CF5' },
    { label: 'Health Insurance Remaining', addLabel: 'Health Insurance', value: insuranceDays, icon: RiHealthBookFill,  iconBg: '#DEEBFF', iconColor: '#578FCA' },
  ];

  const latestRequests = requests.slice(0, 2);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 flex-1 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm h-[100px] 2xl:h-[130px]" />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm flex-1 h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1">

      {/* Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-10">
        {statCards.map(({ label, addLabel, value, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm px-8 md:pl-8 md:pr-6 flex items-center gap-3 md:gap-4 h-[100px] 2xl:h-[130px]">
            {value === null ? (
              <p className="flex-1 text-center text-2xl font-semibold text-primary">
                Please add your<br />{addLabel}
              </p>
            ) : (
              <>
                <div className="rounded-full p-3 md:p-6 flex-shrink-0" style={{ backgroundColor: iconBg }}>
                  <Icon className="w-5 h-5 md:w-8 md:h-8 2xl:w-10 2xl:h-10" style={{ color: iconColor }} />
                </div>
                <div className="flex-1 text-right flex items-end flex-col justify-around h-full py-5">
                  <p className="text-3xl 2xl:text-5xl font-semibold text-primary">{value}</p>
                  <p className="text-xs 2xl:text-sm font-medium text-primary">{label}</p>
                </div>
                <span className="text-primary pb-2 text-base font-normal">Days</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Latest Request */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <p className="font-bold text-primary text-2xl">Latest Request</p>
          <button
            onClick={() => router.push('/student/request')}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            <FaPlus size={16} /> REQ
          </button>
        </div>
        <hr />
        <div className={clsx('flex flex-col gap-6', latestRequests.length === 0 && 'flex-1 items-center justify-center')}>
          {latestRequests.length === 0 && (
            <p className="text-sm text-gray-400 text-center">There are no requests at this time.</p>
          )}
          {latestRequests.map((req) => {
            const step = statusToStep(req.status);
            const startDate = new Date(req.createdAt).toLocaleDateString();
            const updateDate = new Date(req.updatedAt).toLocaleDateString();
            return (
              <div key={req.id} className="bg-secondary rounded-xl p-4 flex flex-col gap-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-lg font-semibold text-primary">{req.title}</p>
                  </div>
                  <StepDots step={step} />
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Start REQ : {startDate}</p>
                    <p className="text-sm text-gray-400">Update REQ : {updateDate}</p>
                    <p className="text-sm text-gray-400">Detail Update : {req.description ?? ''}</p>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => router.push(`/student/request/${req.id}`)}
                      className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition"
                    >
                      <RiEyeLine size={13} /> view
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {requests.length >= 1 && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => router.push('/student/request')}
              className="bg-primary text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-primary/90 transition"
            >
              ดูคำร้องทั้งหมด
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
