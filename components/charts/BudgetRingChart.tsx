'use client';

import React from 'react';
import { endOfMonth, differenceInCalendarDays } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BudgetRingChartProps {
  spent: number;
  budget: number;
  currency?: string;
  /** Show the "safe to spend per day" hint for the rest of the month. Defaults to true. */
  showDailyAllowance?: boolean;
}

export const BudgetRingChart: React.FC<BudgetRingChartProps> = ({
  spent,
  budget,
  currency = 'INR',
  showDailyAllowance = true,
}) => {
  const hasBudget = budget > 0;
  const ratio = hasBudget ? spent / budget : 0;
  const usedPercent = Math.round(ratio * 100);
  const remaining = Math.max(budget - spent, 0);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(ratio, 1) * circumference;

  const isOverBudget = hasBudget && spent > budget;
  const isNearLimit = ratio >= 0.8 && !isOverBudget;

  const strokeColor = isOverBudget ? '#ef4444' : isNearLimit ? '#f59e0b' : '#059669';
  const trackColor = isOverBudget ? '#fee2e2' : isNearLimit ? '#fef3c7' : '#d1fae5';

  const now = new Date();
  const daysLeft = differenceInCalendarDays(endOfMonth(now), now) + 1;
  const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Ring */}
      <div
        className="relative w-40 h-40 flex items-center justify-center flex-shrink-0"
        role="img"
        aria-label={`${usedPercent}% of monthly budget used`}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} strokeWidth="14" stroke={trackColor} fill="transparent" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            strokeWidth="14"
            stroke={strokeColor}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
              isOverBudget ? 'text-red-600' : 'text-[#0b3b2e]'
            }`}
          >
            {usedPercent}%
          </span>
          <span className="text-[11px] font-medium text-[#64748b]">of budget used</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 w-full min-w-0 space-y-3">
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[#64748b]">Spent this month</dt>
            <dd className="font-medium tabular-nums text-[#0b3b2e]">{formatCurrency(spent, currency)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[#64748b]">Monthly budget</dt>
            <dd className="font-medium tabular-nums text-[#0b3b2e]">
              {hasBudget ? formatCurrency(budget, currency) : 'Not set'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-slate-100">
            <dt className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-emerald-700'}`}>
              {isOverBudget ? 'Over budget by' : 'Left to spend'}
            </dt>
            <dd
              className={`text-sm sm:text-base font-semibold tabular-nums ${
                isOverBudget ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(isOverBudget ? spent - budget : remaining, currency)}
            </dd>
          </div>
        </dl>

        {isOverBudget ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
            <span>You&apos;ve gone past your monthly budget. Time to slow down.</span>
          </div>
        ) : isNearLimit ? (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-xl text-xs font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px text-amber-600" />
            <span>
              Over 80% used
              {showDailyAllowance && hasBudget
                ? ` — about ${formatCurrency(Math.floor(dailyAllowance), currency)}/day left for ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
                : '.'}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-px text-emerald-600" />
            <span>
              On track
              {showDailyAllowance && hasBudget
                ? ` — you can spend about ${formatCurrency(Math.floor(dailyAllowance), currency)}/day for the next ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
                : '.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
