'use client';

import React, { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { Transaction, Category } from '@/types';
import { formatCurrency, getCurrencyMeta } from '@/lib/format';
import { ExpenseCard } from '../cards/ExpenseCard';
import { Button } from '../ui/Button';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface CalendarViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency?: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void> | void;
  onAddWithDate: (dateStr: string) => void;
}

/** Short amount for tiny calendar cells, e.g. 1.2k, 45k, 1.1M */
const compactAmount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  categories,
  currency = 'INR',
  onEdit,
  onDelete,
  onAddWithDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const symbol = getCurrencyMeta(currency).symbol.trim();

  const monthStart = startOfMonth(currentMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
  });
  const monthPrefix = format(currentMonth, 'yyyy-MM');

  const { txMap, monthSpend, monthIncome } = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    let spend = 0;
    let income = 0;
    for (const tx of transactions) {
      if (!tx.date) continue;
      const key = tx.date.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(tx);
      // Compare the YYYY-MM prefix directly to avoid UTC parsing shifting the day.
      if (key.startsWith(monthPrefix)) {
        if (tx.type === 'expense') spend += tx.amount;
        else income += tx.amount;
      }
    }
    return { txMap: map, monthSpend: spend, monthIncome: income };
  }, [transactions, monthPrefix]);

  const selectedDayKey = format(selectedDay, 'yyyy-MM-dd');
  const selectedDayTxs = txMap[selectedDayKey] || [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const navBtn =
    'w-9 h-9 rounded-xl border border-slate-100 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-center transition-colors';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* Calendar card */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={navBtn} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm sm:text-base font-semibold text-[#0b3b2e] min-w-[128px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={navBtn} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isSameMonth(currentMonth, new Date()) && (
              <button
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDay(new Date());
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2"
              >
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span className="text-rose-600 font-semibold">−{formatCurrency(monthSpend, currency)}</span>
            <span className="text-emerald-600 font-semibold">+{formatCurrency(monthIncome, currency)}</span>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1 text-center text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTxs = txMap[dayKey] || [];
            const dayExpense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const hasIncome = dayTxs.some((t) => t.type === 'income');
            const inMonth = isSameMonth(day, currentMonth);
            const selected = isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <button
                key={dayKey}
                onClick={() => {
                  setSelectedDay(day);
                  if (!inMonth) setCurrentMonth(day);
                }}
                aria-pressed={selected}
                aria-label={`${format(day, 'MMMM d')}${dayTxs.length ? `, ${dayTxs.length} transactions` : ''}`}
                className={`min-h-[52px] sm:min-h-[68px] p-1 rounded-xl flex flex-col items-center justify-between border transition-colors ${
                  selected
                    ? 'bg-emerald-50 border-emerald-500'
                    : 'border-transparent hover:bg-slate-50'
                } ${inMonth ? 'text-[#0b3b2e]' : 'text-slate-300'}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    today ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayExpense > 0 ? (
                  <span
                    className={`text-[9px] sm:text-[10px] font-semibold tabular-nums leading-none truncate max-w-full ${
                      inMonth ? 'text-rose-500' : 'text-rose-300'
                    }`}
                  >
                    {symbol}
                    {compactAmount(dayExpense)}
                  </span>
                ) : hasIncome ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mb-1" title="Income" />
                ) : (
                  <span className="h-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-[#0b3b2e]">{format(selectedDay, 'EEEE, MMM d')}</h4>
            <p className="text-xs text-[#64748b]">
              {selectedDayTxs.length} transaction{selectedDayTxs.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => onAddWithDate(selectedDayKey)}
          >
            Add
          </Button>
        </div>

        {selectedDayTxs.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CalendarDays className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#64748b] mt-2">Nothing recorded on this day.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTxs.map((tx) => (
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
        )}
      </div>
    </div>
  );
};
