'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTransactions } from '@/hooks/useTransactions';
import { Transaction } from '@/types';
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { TimelineView, groupByDate, dayLabel } from '@/components/timeline/TimelineView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ManageCategoriesSheet } from '@/components/categories/ManageCategoriesSheet';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { formatCurrency } from '@/lib/format';
import {
  Search,
  Plus,
  CalendarDays,
  GitCommitVertical,
  List,
  X,
  Tags,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Receipt,
  SearchX,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

type ViewMode = 'list' | 'timeline' | 'calendar';
type TypeFilter = 'all' | 'income' | 'expense';

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'list', label: 'List', icon: List },
  { value: 'timeline', label: 'Timeline', icon: GitCommitVertical },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const fieldClass =
  'h-11 bg-white border border-slate-200 rounded-xl text-sm text-[#0b3b2e] placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-400/20 transition-all';

export default function TransactionsPage() {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <TransactionsContent onManageCategories={() => setManageOpen(true)} />
      <ManageCategoriesSheet isOpen={manageOpen} onClose={() => setManageOpen(false)} />
    </>
  );
}

function TransactionsContent({ onManageCategories }: { onManageCategories: () => void }) {
  const { userProfile } = useAuth();
  const {
    transactions,
    categories,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
  } = useTransactions();

  const currency = userProfile?.currency || 'INR';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState('');

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (q) {
        const haystack = [tx.title, tx.note, categoryMap.get(tx.categoryId)?.name, String(tx.amount)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      const day = tx.date?.split('T')[0] ?? '';
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [transactions, categoryMap, searchQuery, typeFilter, categoryFilter, startDate, endDate]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const groups = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions]);

  const hasDateFilter = Boolean(startDate || endDate);
  const hasActiveFilters =
    Boolean(searchQuery) || typeFilter !== 'all' || categoryFilter !== 'all' || hasDateFilter;

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const openAdd = (date = '') => {
    setPrefilledDate(date);
    setAddOpen(true);
  };

  const handleDelete = (id: string) => deleteTransaction(id);

  const emptyState =
    transactions.length === 0 ? (
      <EmptyState
        icon={Receipt}
        message="No transactions yet. Record your first income or expense."
        action={
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openAdd()}>
            Add transaction
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={SearchX}
        message="No transactions match your filters."
        action={
          <Button size="sm" variant="outline" icon={<X className="w-4 h-4" />} onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0b3b2e]">Transactions</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Search, filter and manage every income and expense.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <Button variant="outline" icon={<Tags className="w-4 h-4" />} onClick={onManageCategories}>
            Categories
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => openAdd()}>
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add transaction</span>
          </Button>
        </div>
      </div>

      {/* Summary strip (filtered set) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <SummaryTile
          label="Income"
          value={`+${formatCurrency(totals.income, currency)}`}
          icon={ArrowDownLeft}
          tone="emerald"
          loading={loading}
        />
        <SummaryTile
          label="Expenses"
          value={`−${formatCurrency(totals.expense, currency)}`}
          icon={ArrowUpRight}
          tone="rose"
          loading={loading}
        />
        <SummaryTile
          label="Net"
          value={`${totals.net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(totals.net), currency)}`}
          icon={Scale}
          tone={totals.net >= 0 ? 'emerald' : 'rose'}
          neutralBg
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              aria-label="Search transactions"
              placeholder="Search title, note, category or amount"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${fieldClass} w-full pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden`}
              style={{ colorScheme: 'light' }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 min-w-0">
            <div
              role="group"
              aria-label="Filter by type"
              className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl flex-1 lg:flex-none lg:w-64"
            >
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  className={`h-9 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                    typeFilter === t
                      ? t === 'expense'
                        ? 'bg-white text-rose-600 shadow-xs'
                        : 'bg-white text-emerald-700 shadow-xs'
                      : 'text-[#64748b] hover:text-[#0b3b2e]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Date range filter"
              aria-pressed={showDateFilters}
              aria-expanded={showDateFilters}
              onClick={() => setShowDateFilters((s) => !s)}
              className={`relative h-11 w-11 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors lg:hidden ${
                showDateFilters || hasDateFilter
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasDateFilter && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${fieldClass} px-3 w-full lg:w-48 font-medium`}
            style={{ colorScheme: 'light' }}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`${
            showDateFilters ? 'flex' : 'hidden'
          } lg:flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100`}
        >
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#64748b]">
            <span className="font-medium">From</span>
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#0b3b2e] outline-none focus:border-emerald-500"
              style={{ colorScheme: 'light' }}
            />
            <span className="font-medium">to</span>
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-[#0b3b2e] outline-none focus:border-emerald-500"
              style={{ colorScheme: 'light' }}
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Results toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#64748b]" aria-live="polite">
          {loading ? (
            'Loading…'
          ) : (
            <>
              <span className="font-semibold text-[#0b3b2e]">{filteredTransactions.length}</span>{' '}
              {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
              {hasActiveFilters && ` of ${transactions.length}`}
            </>
          )}
        </p>
        <div role="group" aria-label="View" className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={viewMode === value}
              aria-label={`${label} view`}
              onClick={() => setViewMode(value)}
              className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === value ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#64748b] hover:text-[#0b3b2e]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          transactions={filteredTransactions}
          categories={categories}
          currency={currency}
          onEdit={setEditingTx}
          onDelete={handleDelete}
          onAddWithDate={openAdd}
        />
      ) : viewMode === 'timeline' ? (
        <TimelineView
          transactions={filteredTransactions}
          categories={categories}
          currency={currency}
          onEdit={setEditingTx}
          onDelete={handleDelete}
          emptyState={emptyState}
        />
      ) : groups.length === 0 ? (
        emptyState
      ) : (
        <div className="space-y-5">
          {groups.map(({ date, items }) => {
            const dayNet = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
            const year = date.slice(0, 4);
            return (
              <section key={date} aria-label={dayLabel(date)}>
                <div className="flex items-center justify-between gap-3 mb-2 px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    {dayLabel(date)}
                    {year !== String(new Date().getFullYear()) && `, ${year}`}
                  </h2>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
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
                      onEdit={setEditingTx}
                      onDelete={handleDelete}
                      hideDate
                      className=""
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Add transaction */}
      <Sheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Transaction"
        description="Record a new income or expense"
      >
        <ExpenseForm
          categories={categories}
          prefilledDate={prefilledDate}
          onSubmit={async (data) => {
            await addTransaction(data);
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
          onOpenAddCategory={() => setCategoryFormOpen(true)}
        />
      </Sheet>

      {/* Edit transaction (prefilled) */}
      <Sheet
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Edit Transaction"
        description="Update the details of this entry"
      >
        {editingTx && (
          <ExpenseForm
            key={editingTx.id}
            initialData={editingTx}
            categories={categories}
            onSubmit={async (data) => {
              await updateTransaction(editingTx.id, data);
              setEditingTx(null);
            }}
            onCancel={() => setEditingTx(null)}
            onOpenAddCategory={() => setCategoryFormOpen(true)}
          />
        )}
      </Sheet>

      {/* Quick-create category from within the transaction form */}
      <Sheet
        isOpen={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        title="New Category"
        description="Pick a name, icon and color"
        maxWidth="max-w-lg"
      >
        <CategoryForm
          onSubmit={async (cat) => {
            await addCategory(cat);
            setCategoryFormOpen(false);
          }}
          onCancel={() => setCategoryFormOpen(false)}
        />
      </Sheet>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
  neutralBg = false,
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: 'emerald' | 'rose';
  neutralBg?: boolean;
  loading: boolean;
}) {
  const toneText = tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600';
  const toneChip = tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
  return (
    <div
      className={`rounded-2xl border shadow-card p-3 sm:p-4 min-w-0 ${
        neutralBg ? 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100' : 'bg-white border-slate-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center ${toneChip}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-[#64748b]">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-3/4 mt-2" />
      ) : (
        <p
          className={`mt-1.5 sm:mt-2 text-sm sm:text-lg font-semibold tabular-nums truncate ${toneText}`}
          title={value}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-[#64748b] mt-3">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
