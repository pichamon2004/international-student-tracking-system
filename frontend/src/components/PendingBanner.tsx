'use client';

import { useState } from 'react';
import { RiTimeLine, RiCloseLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { ApiChangeRequest, changeRequestApi } from '@/lib/api';

interface Props {
  pending: ApiChangeRequest;
  currentData?: Record<string, unknown>;
  fieldLabels?: Record<string, string>;
  onCancel?: () => void;
}

export default function PendingBanner({ pending, currentData, fieldLabels, onCancel }: Props) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await changeRequestApi.cancel(pending.id);
      toast.success('Change request cancelled');
      onCancel?.();
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const changedFields = Object.entries(pending.payload).filter(([key, val]) => {
    if (!currentData) return true;
    return String(val) !== String(currentData[key] ?? '');
  });

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-700">
          <RiTimeLine size={18} className="shrink-0 mt-0.5" />
          <span className="font-semibold text-sm">Pending Staff Approval</span>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium transition disabled:opacity-40 shrink-0"
        >
          {cancelling ? 'Cancelling…' : 'Cancel Request'}
        </button>
      </div>

      <p className="mt-2 text-xs text-amber-600 leading-relaxed">
        You have a change request waiting for staff review. The information shown below is your
        current saved data — changes will apply once approved.
      </p>

      {pending.action === 'DELETE' ? (
        <p className="mt-3 text-xs font-medium text-red-600">
          This record is pending deletion.
        </p>
      ) : pending.action === 'CREATE' ? (
        <p className="mt-3 text-xs font-medium text-blue-600">
          A new record is pending creation.
        </p>
      ) : changedFields.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-amber-700 mb-1.5">Pending changes:</p>
          <ul className="space-y-1">
            {changedFields.map(([key, newVal]) => {
              const label = fieldLabels?.[key] ?? key;
              const oldVal = currentData?.[key];
              return (
                <li key={key} className="text-xs text-amber-800">
                  <span className="font-medium">{label}:</span>{' '}
                  {oldVal !== undefined && oldVal !== null && String(oldVal) !== '' ? (
                    <>
                      <span className="line-through text-amber-500">{String(oldVal)}</span>
                      {' → '}
                    </>
                  ) : null}
                  <span className="font-semibold">{String(newVal)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
