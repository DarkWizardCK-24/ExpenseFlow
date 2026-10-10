'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';

export interface CategoryBreakdownItem {
  name: string;
  emoji: string;
  value: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownItem[];
  currency?: string;
  /** 'auto' = side-by-side from md, 'stacked' = donut above legend (for narrow columns). */
  layout?: 'auto' | 'stacked';
  /** Max legend rows before grouping the rest into "Other". */
  maxItems?: number;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
  currency = 'INR',
  layout = 'auto',
  maxItems = 6,
}) => {
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center p-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
          <PieIcon className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-[#0b3b2e]">No spending yet</p>
        <p className="text-xs text-[#64748b] mt-0.5">Add an expense to see where your money goes.</p>
      </div>
    );
  }

  let items = sorted;
  if (sorted.length > maxItems) {
    const head = sorted.slice(0, maxItems - 1);
    const restValue = sorted.slice(maxItems - 1).reduce((s, i) => s + i.value, 0);
    items = [...head, { name: 'Other', emoji: '📦', value: restValue, color: '#94a3b8' }];
  }

  const stacked = layout === 'stacked';

  return (
    <div className={`flex flex-col items-center gap-5 ${stacked ? '' : 'md:flex-row md:gap-6'}`}>
      {/* Donut */}
      <div
        className="w-44 h-44 sm:w-48 sm:h-48 relative flex-shrink-0"
        role="img"
        aria-label={`Spending by category, total ${formatCurrency(total, currency)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as CategoryBreakdownItem;
                  const pct = (item.value / total) * 100;
                  return (
                    <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-100 text-xs">
                      <p className="font-bold text-[#0b3b2e] flex items-center gap-1.5">
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                      </p>
                      <p className="text-[#64748b] font-medium mt-1 tabular-nums">
                        {formatCurrency(item.value, currency)} · {formatPercent(pct)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={items}
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={items.length > 1 ? 2 : 0}
              cornerRadius={4}
              dataKey="value"
              animationDuration={700}
              stroke="none"
            >
              {items.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[11px] font-medium text-[#64748b]">Total spent</span>
          <span className="text-base font-extrabold text-[#0b3b2e] tabular-nums">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex-1 w-full min-w-0 space-y-3">
        {items.map((item) => {
          const pct = (item.value / total) * 100;
          return (
            <li key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: item.color }}
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  />
                  <span className="truncate font-medium text-[#0b3b2e]">
                    <span aria-hidden="true">{item.emoji}</span> {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
                  <span className="font-semibold text-[#0b3b2e]">{formatCurrency(item.value, currency)}</span>
                  <span className="text-xs text-[#94a3b8] w-9 text-right">{formatPercent(pct)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
