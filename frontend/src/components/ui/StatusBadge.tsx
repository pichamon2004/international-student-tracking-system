import { clsx } from 'clsx';

type Status = 'รออนุมัติ' | 'อนุมัติ' | 'ปฏิเสธ' | 'pending' | 'approved' | 'rejected' | 'Pending' | 'Approved' | 'Rejected';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  รออนุมัติ: { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  pending:   { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  Pending:   { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  อนุมัติ:   { label: 'Approved', className: 'bg-green-100 text-green-700' },
  approved:  { label: 'Approved', className: 'bg-green-100 text-green-700' },
  Approved:  { label: 'Approved', className: 'bg-green-100 text-green-700' },
  ปฏิเสธ:   { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  rejected:  { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  Rejected:  { label: 'Rejected', className: 'bg-red-100 text-red-600' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
