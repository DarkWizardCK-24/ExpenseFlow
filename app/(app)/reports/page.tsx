'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTransactions } from '@/hooks/useTransactions';
import {
  CategoryBreakdownChart,
  CategoryBreakdownItem,
} from '@/components/charts/CategoryBreakdownChart';
import { SpendingOverviewChart } from '@/components/charts/SpendingOverviewChart';
import { StatCard } from '@/components/cards/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { useQuickActions } from '@/components/layout/QuickActionsContext';
import { formatCurrency } from '@/lib/format';
import {
  Download,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarDays,
  Store,
  BarChart3,
  Plus,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { subMonths, format, isSameMonth, getDaysInMonth } from 'date-fns';
import { toast } from 'sonner';

const MONTHS_BACK = 6;

const calcChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const { transactions, categories, loading } = useTransactions();
  const { openAddTransaction } = useQuickActions();
  const currency = userProfile?.currency || 'INR';

  // 0 = current month, 1 = last month, ...
  const [offset, setOffset] = useState(0);

  const months = useMemo(
    () => Array.from({ length: MONTHS_BACK }).map((_, i) => subMonths(new Date(), i)),
    []
  );
  const selectedMonth = months[offset];
  const previousMonth = subMonths(selectedMonth, 1);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date && isSameMonth(new Date(t.date), selectedMonth)),
    [transactions, selectedMonth]
  );

  const report = useMemo(() => {
    let income = 0;
    let expense = 0;
    let prevIncome = 0;
    let prevExpense = 0;
    const catMap: Record<string, { total: number; count: number }> = {};
    const merchantMap: Record<string, { count: number; total: number }> = {};
    const daysInMonth = getDaysInMonth(selectedMonth);
    const daily = Array.from({ length: daysInMonth }).map((_, i) => ({ day: i + 1, spending: 0 }));

    transactions.forEach((t) => {
      if (t.date && isSameMonth(new Date(t.date), previousMonth)) {
        if (t.type === 'income') prevIncome += t.amount;
        else prevExpense += t.amount;
      }
    });

    monthTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
        return;
      }
      expense += t.amount;
      catMap[t.categoryId] = {
        total: (catMap[t.categoryId]?.total || 0) + t.amount,
        count: (catMap[t.categoryId]?.count || 0) + 1,
      };
      const key = t.title.trim() || 'Untitled';
      merchantMap[key] = {
        count: (merchantMap[key]?.count || 0) + 1,
        total: (merchantMap[key]?.total || 0) + t.amount,
      };
      const isoDay = /^\d{4}-\d{2}-(\d{2})/.exec(t.date);
      const day = isoDay ? Number(isoDay[1]) : new Date(t.date).getDate();
      if (daily[day - 1]) daily[day - 1].spending += t.amount;
    });

    const lookup = new Map(categories.map((c) => [c.id, c]));
    const ranked = Object.entries(catMap)
      .map(([id, v]) => {
        const cat = lookup.get(id);
        return {
          id,
          name: cat?.name || 'Other',
          emoji: cat?.emoji || '📦',
          color: cat?.color || '#10b981',
          value: v.total,
          count: v.count,
        };
      })
      .sort((a, b) => b.value - a.value);

    const breakdown: CategoryBreakdownItem[] = ranked.map(({ name, emoji, color, value }) => ({
      name,
      emoji,
      color,
      value,
    }));

    const merchants = Object.entries(merchantMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const isCurrent = offset === 0;
    const daysElapsed = isCurrent ? new Date().getDate() : daysInMonth;

    return {
      income,
      expense,
      net: income - expense,
      incomeChange: calcChange(income, prevIncome),
      expenseChange: calcChange(expense, prevExpense),
      avgDaily: daysElapsed > 0 ? expense / daysElapsed : 0,
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      ranked,
      breakdown,
      merchants,
      daily,
    };
  }, [transactions, monthTransactions, categories, selectedMonth, previousMonth, offset]);

  const trend = useMemo(
    () =>
      Array.from({ length: MONTHS_BACK }).map((_, i) => {
        const target = subMonths(new Date(), MONTHS_BACK - 1 - i);
        let spending = 0;
        let income = 0;
        transactions.forEach((t) => {
          if (t.date && isSameMonth(new Date(t.date), target)) {
            if (t.type === 'expense') spending += t.amount;
            else income += t.amount;
          }
        });
        return { month: format(target, 'MMM'), spending, income };
      }),
    [transactions]
  );

  const exportCSV = () => {
    if (monthTransactions.length === 0) {
      toast.error('No transactions to export for this month');
      return;
    }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = ['Date', 'Title', 'Type', 'Category', 'Payment Method', 'Amount', 'Note'];
    const rows = monthTransactions.map((t) => {
      const catName = categories.find((c) => c.id === t.categoryId)?.name || 'General';
      return [
        t.date || '',
        escape(t.title),
        t.type,
        escape(catName),
        t.paymentMethod,
        t.amount.toFixed(2),
        escape(t.note || ''),
      ].join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ExpenseFlow-Report-${format(selectedMonth, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const hasMonthData = monthTransactions.length > 0;
  const changeLabel = `vs ${format(previousMonth, 'MMM')}`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Reports"
        subtitle="Understand where your money comes from and where it goes."
        actions={
          <Button
            variant="outline"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={exportCSV}
            disabled={!hasMonthData}
          >
            Export CSV
          </Button>
        }
      />

      {/* Period selector */}
      <div
        role="radiogroup"
        aria-label="Report month"
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar"
      >
        {months.map((m, i) => {
          const selected = i === offset;
          return (
            <button
              key={m.toISOString()}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setOffset(i)}
              className={`flex-shrink-0 h-10 px-4 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                selected
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-800'
              }`}
            >
              {i === 0 ? 'This month' : i === 1 ? 'Last month' : format(m, 'MMM yyyy')}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <section aria-label={`Summary for ${format(selectedMonth, 'MMMM yyyy')}`} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Income"
          amount={report.income}
          currency={currency}
          changePercent={report.incomeChange}
          changeLabel={changeLabel}
          tone="emerald"
          icon={<TrendingUp />}
          loading={loading}
        />
        <StatCard
          title="Expenses"
          amount={report.expense}
          currency={currency}
          changePercent={report.expenseChange}
          changeLabel={changeLabel}
          invertChange
          tone="rose"
          icon={<TrendingDown />}
          loading={loading}
        />
        <StatCard
          title="Net savings"
          amount={report.net}
          currency={currency}
          subtitle={report.income > 0 ? `${report.savingsRate}% of income saved` : 'No income recorded'}
          tone={report.net >= 0 ? 'sky' : 'amber'}
          colorValue
          icon={<PiggyBank />}
          loading={loading}
        />
        <StatCard
          title="Avg. daily spend"
          amount={report.avgDaily}
          displayValue={formatCurrency(Math.round(report.avgDaily), currency)}
          subtitle={`${monthTransactions.filter((t) => t.type === 'expense').length} expenses`}
          tone="violet"
          icon={<CalendarDays />}
          loading={loading}
        />
      </section>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : !hasMonthData ? (
        <Card lift={false} padding="none">
          <EmptyState
            icon={<BarChart3 className="w-6 h-6" />}
            title={`Nothing recorded in ${format(selectedMonth, 'MMMM yyyy')}`}
            description="Add transactions for this month to see your breakdown."
            action={
              offset === 0 ? (
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddTransaction}>
                  Add transaction
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card lift={false} className="min-w-0">
              <SectionHeader
                title="Spending by category"
                subtitle={format(selectedMonth, 'MMMM yyyy')}
                className="mb-5"
              />
              <CategoryBreakdownChart data={report.breakdown} currency={currency} />
            </Card>

            <Card lift={false} className="min-w-0">
              <SectionHeader title="Daily spending" subtitle="How spending was spread across the month" className="mb-4" />
              {report.expense === 0 ? (
                <EmptyState compact icon={<BarChart3 className="w-5 h-5" />} title="No expenses this month" />
              ) : (
                <div className="h-64" role="img" aria-label="Daily spending bar chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.daily} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={12}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        content={({ active, payload, label }) =>
                          active && payload && payload.length ? (
                            <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-100 text-xs">
                              <p className="font-bold text-[#0b3b2e]">
                                {format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), Number(label)), 'EEE, d MMM')}
                              </p>
                              <p className="text-rose-600 font-semibold mt-0.5 tabular-nums">
                                {formatCurrency(Number(payload[0].value), currency)}
                              </p>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="spending" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <Card lift={false} className="lg:col-span-3 min-w-0">
              <SectionHeader title="Top categories" subtitle="Ranked by amount spent" className="mb-4" />
              {report.ranked.length === 0 ? (
                <EmptyState compact icon={<BarChart3 className="w-5 h-5" />} title="No expenses this month" />
              ) : (
                <ol className="space-y-4">
                  {report.ranked.slice(0, 6).map((item, idx) => {
                    const pct = report.expense > 0 ? Math.round((item.value / report.expense) * 100) : 0;
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-[#94a3b8] tabular-nums text-right">{idx + 1}</span>
                        <span
                          aria-hidden="true"
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: `${item.color}1f` }}
                        >
                          {item.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-[#0b3b2e] truncate">{item.name}</p>
                            <p className="text-sm font-bold text-[#0b3b2e] tabular-nums flex-shrink-0">
                              {formatCurrency(item.value, currency)}
                            </p>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }}
                              />
                            </div>
                            <span className="text-xs text-[#64748b] tabular-nums w-20 text-right">
                              {pct}% · {item.count}×
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            <Card lift={false} className="lg:col-span-2 min-w-0">
              <SectionHeader title="Top merchants" subtitle="Where you spent the most" className="mb-4" />
              {report.merchants.length === 0 ? (
                <EmptyState compact icon={<Store className="w-5 h-5" />} title="No merchants yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {report.merchants.map((m) => (
                    <li key={m.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0b3b2e] truncate">{m.name}</p>
                          <p className="text-xs text-[#64748b]">
                            {m.count} transaction{m.count > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-rose-600 tabular-nums flex-shrink-0">
                        -{formatCurrency(m.total, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {/* 6-month trend */}
      <Card lift={false} className="min-w-0">
        <SectionHeader title="6-month trend" subtitle="Income vs spending month over month" className="mb-4" />
        {loading ? <Skeleton className="h-64 sm:h-72 w-full" /> : <SpendingOverviewChart data={trend} currency={currency} />}
      </Card>
    </div>
  );
}
