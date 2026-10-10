import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Small text shown above the title (e.g. a date). */
  eyebrow?: React.ReactNode;
  /** Primary / secondary actions, rendered on the right (below on mobile). */
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  actions,
  className = '',
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 ${className}`}>
    <div className="min-w-0">
      {eyebrow && <p className="text-xs font-semibold text-emerald-700 mb-1">{eyebrow}</p>}
      <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#0b3b2e] leading-tight">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-[#64748b] mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">{actions}</div>}
  </div>
);

interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h2 className="text-base font-bold text-[#0b3b2e]">{title}</h2>
      {subtitle && <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);
