import { IconType } from 'react-icons';
import { RiCloseLine, RiEyeLine, RiCheckLine, RiAddLine, RiEditLine, RiDeleteBinLine } from 'react-icons/ri';
import { clsx } from 'clsx';
import { IoClose } from "react-icons/io5";

type Variant = 'primary' | 'danger' | 'success' | 'info' | 'ghost' | 'warning';

interface ButtonProps {
  variant?: Variant;
  label?: string;
  icon?: IconType;
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:opacity-90',
  danger:  'bg-[#FF5B5B] text-white hover:bg-red-500',
  success: 'bg-[#93ED8B] text-white hover:bg-green-400',
  info:    'bg-[#8ED2FF] text-white hover:bg-blue-400',
  ghost:   'bg-gray-100 text-gray-700 hover:bg-gray-200',
  warning: 'bg-[#FFC107] text-gray-700 hover:bg-yellow-500',
};

const variantDefaults: Record<Variant, { label: string; icon: IconType }> = {
  danger:  { label: 'Reject',  icon: IoClose },
  success: { label: 'Approve', icon: RiCheckLine },
  info:    { label: 'View',    icon: RiEyeLine },
  primary: { label: 'Submit',  icon: RiAddLine },
  ghost:   { label: 'Edit',    icon: RiEditLine },
  warning: { label: 'Edit',  icon: RiDeleteBinLine },
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  label,
  icon,
  size = 'sm',
  onClick,
  disabled,
  type = 'button',
  className = '',
}: ButtonProps) {
  const defaults = variantDefaults[variant];
  const resolvedLabel = label ?? defaults.label;
  const ResolvedIcon = icon ?? defaults.icon;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <ResolvedIcon size={16} />
      {resolvedLabel}
    </button>
  );
}
