'use client';

import React from 'react';
import { Transaction, Category } from '@/types';
import { ExpenseCard } from '../cards/ExpenseCard';
import { formatCurrency, formatDate } from '@/lib/format';
import { isToday, isYesterday, parseISO, isValid } from 'date-fns';
import { Receipt } from 'lucide-react';

interface TimelineViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency?: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void> | void;
  /** Optional custom empty state. */
  emptyState?: React.ReactNode;
}

export const dayLabel = (dateStr: string) => {
  const d = parseISO(dateStr);
  if (!isValid(d)) return 'Unknown date';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return formatDate(dateStr, 'EEEE, MMM d');
};

export const groupByDate = (transactions: Transaction[]) => {
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const d = tx.date ? tx.date.split('T')[0] : 'Unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(tx);
  }
  // YYYY-MM-DD strings sort lexicographically; newest first
  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, items: grouped[date] }));
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  transactions,
  categories,
  currency = 'INR',
  onEdit,
  onDelete,
  emptyState,
}) => {
  const groups = groupByDate(transactions);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (groups.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div className="text-center py-12 px-6 bg-white rounded-2xl border border-slate-100 shadow-card">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm text-[#64748b] mt-3">No transactions yet.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <ol className="relative space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100">
      {groups.map(({ date, items }) => {
        const dayNet = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        const year = date.slice(0, 4);
        const showYear = year !== String(new Date().getFullYear());

        return (
          <li key={date} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-[3px] border-emerald-500"
            />

            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <h3 className="font-semibold text-sm text-[#0b3b2e] truncate">
                  {dayLabel(date)}
                  {showYear && <span className="text-[#64748b] font-normal">, {year}</span>}
                </h3>
                <span className="text-xs text-[#64748b] flex-shrink-0">
                  {items.length} item{items.length > 1 ? 's' : ''}
                </span>
              </div>
              <span
                className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                  dayNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {dayNet >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(dayNet), currency)}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((tx) => (
                <ExpenseCard
                  key={tx.id}
                  transaction={tx}
                  category={categoryMap.get(tx.categoryId)}
                  currency={currency}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  hideDate
                  className=""
                />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
