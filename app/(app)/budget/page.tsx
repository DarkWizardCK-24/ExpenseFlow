'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSameMonth, parseISO, isValid, format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { BudgetRingChart } from '@/components/charts/BudgetRingChart';
import { GoalCard } from '@/components/cards/GoalCard';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { GoalForm } from '@/components/forms/GoalForm';
import { AddFundsForm } from '@/components/forms/AddFundsForm';
import { Goal, Transaction } from '@/types';
import { formatCurrency, getCurrencyMeta } from '@/lib/format';
import { Plus, Pencil, Target, PieChart, Wallet, Check } from 'lucide-react';
import { toast } from 'sonner';

const BUDGET_PRESETS = [20000, 30000, 50000, 75000, 100000];

function toDate(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  if (isValid(d)) return d;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

function isThisMonthExpense(t: Transaction, now: Date) {
  if (t.type !== 'expense') return false;
  const d = toDate(t.date);
  return d ? isSameMonth(d, now) : false;
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function BudgetAndGoalsPage() {
  const { userProfile, updateProfileData } = useAuth();
  const { transactions, categories, loading: txLoading } = useTransactions();

  const currency = userProfile?.currency || 'INR';
  const monthlyBudget = userProfile?.monthlyBudget || 0;

  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [createGoalOpen, setCreateGoalOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const monthExpenses = useMemo(
    () => transactions.filter((t) => isThisMonthExpense(t, now)),
    [transactions, now]
  );
  const totalSpent = useMemo(() => monthExpenses.reduce((s, t) => s + t.amount, 0), [monthExpenses]);

  const categoryRows = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(totals)
      .map(([id, spent]) => {
        const cat = categories.find((c) => c.id === id);
        return {
          id,
          spent,
          name: cat?.name || 'Uncategorized',
          emoji: cat?.emoji || '🏷️',
          color: cat?.color || '#10b981',
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [monthExpenses, categories]);

  const loadingOverview = txLoading || !userProfile;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0b3b2e]">Budget &amp; Goals</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {format(now, 'MMMM yyyy')} · keep spending in check and grow your savings
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateGoalOpen(true)}
          className="self-start sm:self-auto"
        >
          New Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Monthly budget */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#0b3b2e]">Monthly budget</h2>
              <p className="text-xs text-[#64748b] mt-0.5">Spending so far this month vs your limit</p>
            </div>
            {monthlyBudget > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => setBudgetSheetOpen(true)}
                aria-label="Edit monthly budget"
              >
                Edit
              </Button>
            )}
          </div>

          {loadingOverview ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Skeleton className="w-40 h-40 !rounded-full flex-shrink-0" />
              <div className="flex-1 w-full space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : monthlyBudget > 0 ? (
            <BudgetRingChart spent={totalSpent} budget={monthlyBudget} currency={currency} />
          ) : (
            <EmptyState
              icon={<Wallet className="w-6 h-6" />}
              text={`You've spent ${formatCurrency(totalSpent, currency)} this month. Set a monthly budget to track your pace.`}
              action={
                <Button variant="primary" size="sm" onClick={() => setBudgetSheetOpen(true)}>
                  Set monthly budget
                </Button>
              }
            />
          )}
        </section>

        {/* Category breakdown */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#0b3b2e]">Where it went</h2>
              <p className="text-xs text-[#64748b] mt-0.5">Spending by category this month</p>
            </div>
          </div>

          {loadingOverview ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : categoryRows.length === 0 ? (
            <EmptyState icon={<PieChart className="w-6 h-6" />} text="No expenses recorded this month yet." />
          ) : (
            <ul className="space-y-3.5">
              {categoryRows.slice(0, 6).map((row) => {
                const share = totalSpent > 0 ? (row.spent / totalSpent) * 100 : 0;
                const ofBudget = monthlyBudget > 0 ? Math.round((row.spent / monthlyBudget) * 100) : null;
                return (
                  <li key={row.id} className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-base"
                      style={{ backgroundColor: `${row.color}1f` }}
                    >
                      {row.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-[#0b3b2e] truncate">{row.name}</span>
                        <span className="text-sm font-bold tabular-nums text-[#0b3b2e]">
                          {formatCurrency(row.spent, currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(share, 2)}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-[#64748b] tabular-nums">
                        <span>{Math.round(share)}% of spending</span>
                        {ofBudget !== null && <span>{ofBudget}% of budget</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
              {categoryRows.length > 6 && (
                <li className="text-xs text-[#64748b] text-center pt-1">
                  +{categoryRows.length - 6} more categor{categoryRows.length - 6 === 1 ? 'y' : 'ies'}
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <GoalsSection currency={currency} createOpen={createGoalOpen} setCreateOpen={setCreateGoalOpen} />

      {/* Edit monthly budget */}
      <Sheet
        isOpen={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        title={monthlyBudget > 0 ? 'Edit monthly budget' : 'Set monthly budget'}
        description="How much do you want to spend at most each month?"
        maxWidth="max-w-md"
      >
        {budgetSheetOpen && (
          <BudgetForm
            initial={monthlyBudget}
            currency={currency}
            onCancel={() => setBudgetSheetOpen(false)}
            onSave={async (value) => {
              await updateProfileData({ monthlyBudget: value });
              toast.success('Monthly budget updated');
              setBudgetSheetOpen(false);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Goals section                               */
/* -------------------------------------------------------------------------- */

function GoalsSection({
  currency,
  createOpen,
  setCreateOpen,
}: {
  currency: string;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { goals, loading, createGoal, updateGoal, deleteGoal, addFunds } = useGoals();
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [fundsGoal, setFundsGoal] = useState<Goal | null>(null);

  const totals = useMemo(
    () =>
      goals.reduce(
        (acc, g) => ({
          saved: acc.saved + g.saved,
          target: acc.target + g.target,
          done: acc.done + (g.target > 0 && g.saved >= g.target ? 1 : 0),
        }),
        { saved: 0, target: 0, done: 0 }
      ),
    [goals]
  );

  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const aDone = a.saved >= a.target ? 1 : 0;
        const bDone = b.saved >= b.target ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }),
    [goals]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#0b3b2e]">Savings goals</h2>
          <p className="text-xs text-[#64748b] mt-0.5 tabular-nums">
            {loading || goals.length === 0 ? (
              'Things you are saving up for'
            ) : (
              <>
                <span className="font-semibold text-[#0b3b2e]">{formatCurrency(totals.saved, currency)}</span> saved of{' '}
                {formatCurrency(totals.target, currency)} · {totals.done}/{goals.length} completed
              </>
            )}
          </p>
        </div>
        {goals.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setCreateOpen(true)}
          >
            Add goal
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 !rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-2.5 w-full !rounded-full" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <EmptyState
            icon={<Target className="w-6 h-6" />}
            text="No savings goals yet. Start one for a trip, a gadget or an emergency fund."
            action={
              <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>
                Create your first goal
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              onAddFunds={(goal) => setFundsGoal(goal)}
              onEdit={(goal) => setEditingGoal(goal)}
              onDelete={(id) => deleteGoal(id)}
            />
          ))}
        </div>
      )}

      {/* Create goal */}
      <Sheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New savings goal"
        description="Set a target and track every deposit along the way"
      >
        {createOpen && (
          <GoalForm
            currency={currency}
            onSubmit={async (data) => {
              const id = await createGoal(data);
              setCreateOpen(false);
              if (id) router.prefetch(`/goals/${id}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        )}
      </Sheet>

      {/* Edit goal */}
      <Sheet
        isOpen={Boolean(editingGoal)}
        onClose={() => setEditingGoal(null)}
        title="Edit goal"
        description={editingGoal?.name}
      >
        {editingGoal && (
          <GoalForm
            key={editingGoal.id}
            initialData={editingGoal}
            currency={currency}
            onSubmit={async ({ name, category, emoji, target }) => {
              await updateGoal(editingGoal.id, { name, category, emoji, target });
              setEditingGoal(null);
            }}
            onCancel={() => setEditingGoal(null)}
          />
        )}
      </Sheet>

      {/* Deposit / withdraw */}
      <Sheet
        isOpen={Boolean(fundsGoal)}
        onClose={() => setFundsGoal(null)}
        title="Update savings"
        description={fundsGoal?.name}
      >
        {fundsGoal && (
          <AddFundsForm
            key={fundsGoal.id}
            goal={fundsGoal}
            currency={currency}
            onSubmit={async (amount, note) => {
              await addFunds(fundsGoal.id, amount, note);
              setFundsGoal(null);
            }}
            onCancel={() => setFundsGoal(null)}
          />
        )}
      </Sheet>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function BudgetForm({
  initial,
  currency,
  onSave,
  onCancel,
}: {
  initial: number;
  currency: string;
  onSave: (value: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial > 0 ? String(initial) : '');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const symbol = getCurrencyMeta(currency).symbol.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(value);
    if (!value || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    setSaving(true);
    try {
      await onSave(Math.round(amount * 100) / 100);
    } catch {
      setError('Could not save your budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-center">
        <label htmlFor="monthly-budget" className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
          Monthly limit
        </label>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-emerald-600">{symbol}</span>
          <input
            id="monthly-budget"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="50000"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(undefined);
            }}
            className="w-full max-w-[220px] bg-transparent text-center text-4xl font-black tracking-tight tabular-nums text-[#0b3b2e] placeholder-slate-300 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{ colorScheme: 'light' }}
          />
        </div>
        {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {BUDGET_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setValue(String(p));
                setError(undefined);
              }}
              className={`h-8 px-3 rounded-full border text-[11px] font-bold bg-white transition-colors ${
                Number(value) === p
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {formatCurrency(p, currency)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#64748b] text-center">
        The budget ring turns amber at 80% and red once you go over.
      </p>

      <div className="sticky -bottom-5 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-emerald-100/80 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} loadingText="Saving..." icon={<Check className="w-4 h-4" />}>
          Save budget
        </Button>
      </div>
    </form>
  );
}

function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-2">
      <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
        {icon}
      </span>
      <p className="text-sm text-[#64748b] mt-3 max-w-xs leading-relaxed">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
