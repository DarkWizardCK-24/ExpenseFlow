'use client';

import React, { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface DataPoint {
  month: string;
  spending: number;
  income: number;
}

interface SpendingOverviewChartProps {
  data: DataPoint[];
  currency?: string;
  /** Tailwind height class for the plot area. */
  heightClass?: string;
  /** Hide the built-in legend. */
  hideLegend?: boolean;
}

const INCOME_COLOR = '#10b981';
const SPENDING_COLOR = '#f43f5e';

const compact = (val: number) => {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(val >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `${val}`;
};

export const SpendingOverviewChart: React.FC<SpendingOverviewChartProps> = ({
  data,
  currency = 'INR',
  heightClass = 'h-64 sm:h-72',
  hideLegend = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const spendingId = `spending-${uid}`;
  const incomeId = `income-${uid}`;
  const hasData = data.some((d) => d.spending > 0 || d.income > 0);

  if (!hasData) {
    return (
      <div className={`${heightClass} flex flex-col items-center justify-center text-center px-4`}>
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
          <BarChart3 className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-[#0b3b2e]">No activity in this period</p>
        <p className="text-xs text-[#64748b] mt-0.5">Your income and spending trend will appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!hideLegend && (
        <div className="flex items-center gap-4 mb-3 text-xs font-medium text-[#64748b]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SPENDING_COLOR }} />
            Spending
          </span>
        </div>
      )}
      <div
        className={`w-full ${heightClass}`}
        role="img"
        aria-label={`Income and spending over ${data.length} months`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={spendingId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SPENDING_COLOR} stopOpacity={0.22} />
                <stop offset="100%" stopColor={SPENDING_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={incomeId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INCOME_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={INCOME_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={48}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={compact}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const income = Number(payload.find((p) => p.dataKey === 'income')?.value ?? 0);
                const spending = Number(payload.find((p) => p.dataKey === 'spending')?.value ?? 0);
                const net = income - spending;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-xs min-w-[160px]">
                    <p className="font-bold text-[#0b3b2e] mb-2">{label}</p>
                    <div className="space-y-1 tabular-nums">
                      <p className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#64748b]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
                          Income
                        </span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(income, currency)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-[#64748b]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SPENDING_COLOR }} />
                          Spending
                        </span>
                        <span className="font-semibold text-rose-600">{formatCurrency(spending, currency)}</span>
                      </p>
                      <p className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-100">
                        <span className="text-[#64748b]">Net</span>
                        <span className={`font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {net >= 0 ? '+' : '-'}
                          {formatCurrency(net, currency)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={INCOME_COLOR}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${incomeId})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="spending"
              stroke={SPENDING_COLOR}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${spendingId})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
