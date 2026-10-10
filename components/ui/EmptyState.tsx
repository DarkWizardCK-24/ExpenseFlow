import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
  compact?: boolean;
  className?: string;
}

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-500',
  violet: 'bg-violet-50 text-violet-600',
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tone = 'emerald',
  compact = false,
  className = '',
}) => (
  <div className={`flex flex-col items-center text-center ${compact ? 'py-6 px-4' : 'py-10 px-6'} ${className}`}>
    <div
      className={`rounded-full flex items-center justify-center mb-3 ${compact ? 'w-11 h-11' : 'w-14 h-14'} ${TONES[tone]}`}
    >
      {icon}
    </div>
    <p className="text-sm font-bold text-[#0b3b2e]">{title}</p>
    {description && <p className="text-xs text-[#64748b] mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
