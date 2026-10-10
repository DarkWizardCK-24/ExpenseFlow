import React from 'react';
import { formatCurrency } from '@/lib/format';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

type Tone = 'emerald' | 'rose' | 'sky' | 'amber' | 'violet' | 'slate';

interface StatCardProps {
  title: string;
  amount: number;
  currency?: string;
  changePercent?: number; // e.g. 12.5
  isPrimary?: boolean;
  icon: React.ReactNode;
  subtitle?: string;
  /** Icon tint for non-primary cards. */
  tone?: Tone;
  /** When true, an increase is shown as bad (e.g. expenses). */
  invertChange?: boolean;
  /** Text after the change percentage. */
  changeLabel?: string;
  /** Shows a value other than a currency amount (e.g. "42%"). */
  displayValue?: string;
  /** Colors the value with the tone color. */
  colorValue?: boolean;
  loading?: boolean;
  className?: string;
}

const TONES: Record<Tone, { icon: string; value: string }> = {
  emerald: { icon: 'bg-emerald-50 text-emerald-600 border-emerald-100', value: 'text-emerald-600' },
  rose: { icon: 'bg-rose-50 text-rose-500 border-rose-100', value: 'text-rose-600' },
  sky: { icon: 'bg-sky-50 text-sky-600 border-sky-100', value: 'text-sky-700' },
  amber: { icon: 'bg-amber-50 text-amber-600 border-amber-100', value: 'text-amber-700' },
  violet: { icon: 'bg-violet-50 text-violet-600 border-violet-100', value: 'text-violet-700' },
  slate: { icon: 'bg-slate-50 text-slate-600 border-slate-200', value: 'text-[#0b3b2e]' },
};

const ChangeBadge: React.FC<{
  change: number;
  invert: boolean;
  label: string;
  onDark?: boolean;
}> = ({ change, invert, label, onDark }) => {
  const isFlat = change === 0;
  const isUp = change > 0;
  const isGood = isFlat ? true : invert ? !isUp : isUp;

  const color = onDark
    ? 'bg-white/15 text-white'
    : isFlat
      ? 'bg-slate-100 text-slate-600'
      : isGood
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-rose-50 text-rose-600';

  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#64748b]">
      <span
        className={`inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md tabular-nums ${color}`}
      >
        <Icon className="w-3 h-3" aria-hidden="true" />
        {Math.abs(change)}%
      </span>
      <span className={onDark ? 'text-emerald-100' : ''}>{label}</span>
    </span>
  );
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  currency = 'INR',
  changePercent,
  isPrimary = false,
  icon,
  subtitle,
  tone = 'emerald',
  invertChange = false,
  changeLabel = 'vs last month',
  displayValue,
  colorValue = false,
  loading = false,
  className = '',
}) => {
  const value = displayValue ?? `${amount < 0 ? '-' : ''}${formatCurrency(amount, currency)}`;

  if (isPrimary) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#10b981] text-white shadow-emerald-lg ${className}`}
      >
        <div aria-hidden="true" className="absolute -right-10 -bottom-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4 relative">
          <span className="text-xs font-medium text-emerald-100">{title}</span>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/15">
            {icon}
          </div>
        </div>
        <div className="relative">
          {loading ? (
            <Skeleton className="h-9 w-40 bg-white/20" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap min-h-[22px]">
            {changePercent !== undefined && !loading && (
              <ChangeBadge change={changePercent} invert={invertChange} label={changeLabel} onDark />
            )}
            {subtitle && <span className="text-xs text-emerald-100">{subtitle}</span>}
          </div>
        </div>
      </div>
    );
  }

  const t = TONES[tone];

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 bg-white border border-emerald-100/80 shadow-card hover:shadow-card-hover transition-shadow duration-200 flex flex-col gap-3 min-w-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-[#64748b] truncate">{title}</span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px] ${t.icon}`}>
          {icon}
        </div>
      </div>

      <div className="min-w-0">
        {loading ? (
          <>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-24 mt-2" />
          </>
        ) : (
          <>
            <p
              className={`text-lg sm:text-xl font-semibold tracking-tight tabular-nums truncate ${
                colorValue ? t.value : 'text-[#0b3b2e]'
              }`}
            >
              {value}
            </p>
            <div className="mt-1.5 min-h-[22px] flex items-center flex-wrap gap-1.5">
              {changePercent !== undefined ? (
                <ChangeBadge change={changePercent} invert={invertChange} label={changeLabel} />
              ) : subtitle ? (
                <span className="text-xs text-[#64748b]">{subtitle}</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
