import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'emerald' | 'amber' | 'red' | 'blue' | 'gray';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  const variantClasses = {
    green: 'bg-[#ecfdf5] text-[#059669] border border-emerald-200/80',
    emerald: 'bg-[#d1fae5] text-[#047857] border border-emerald-300/60',
    amber: 'bg-[#fef3c7] text-[#b45309] border border-amber-200',
    red: 'bg-[#fee2e2] text-[#dc2626] border border-red-200',
    blue: 'bg-[#dbeafe] text-[#1d4ed8] border border-blue-200',
    gray: 'bg-slate-100 text-[#64748b] border border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
