'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTransactions } from '@/hooks/useTransactions';
import { useGroups, useGroupDetail } from '@/hooks/useGroups';
import { useGoals } from '@/hooks/useGoals';
import { StatCard } from '@/components/cards/StatCard';
import { ExpenseCard } from '@/components/cards/ExpenseCard';
import { GroupCard } from '@/components/cards/GroupCard';
import { GoalCard } from '@/components/cards/GoalCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { useQuickActions } from '@/components/layout/QuickActionsContext';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { GroupExpenseForm } from '@/components/forms/GroupExpenseForm';
import { SettleUpForm } from '@/components/forms/SettleUpForm';
import { AddFundsForm } from '@/components/forms/AddFundsForm';
import { SpendingOverviewChart } from '@/components/charts/SpendingOverviewChart';
import {
  CategoryBreakdownChart,
  CategoryBreakdownItem,
} from '@/components/charts/CategoryBreakdownChart';
import { computeGroupBalances, simplifyDebts } from '@/lib/balances';
import { formatCurrency } from '@/lib/format';
import { Transaction, SplitGroup, Goal, Category } from '@/types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Users2,
  Target,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { subMonths, format, isSameMonth } from 'date-fns';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const calcChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const SeeAllLink: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
  >
    {label}
    <ArrowRight className="w-3.5 h-3.5" />
  </Link>
);

/* ------------------------------------------------------------------ */
/* Group preview: loads the group's ledger so balances, add-expense and */
/* settle-up all work directly from the dashboard.                      */
/* ------------------------------------------------------------------ */
const GroupPreview: React.FC<{
  group: SplitGroup;
  currentUserId?: string;
  currency: string;
  categories: Category[];
  onDelete: (id: string) => Promise<void>;
}> = ({ group, currentUserId, currency, categories, onDelete }) => {
  const { expenses, settlements, addExpense, settleUp } = useGroupDetail(group.id);
  const [mode, setMode] = useState<'expense' | 'settle' | null>(null);

  const suggestions = useMemo(
    () => simplifyDebts(computeGroupBalances(group.members, expenses, settlements)),
    [group.members, expenses, settlements]
  );

  return (
    <>
      <GroupCard
        group={group}
        currentUserId={currentUserId}
        currency={currency}
        expenses={expenses}
        settlements={settlements}
        onAddExpense={() => setMode('expense')}
        onSettleUp={() => setMode('settle')}
        onDeleteGroup={(gid) => onDelete(gid)}
      />

      <Sheet
        isOpen={mode === 'expense'}
        onClose={() => setMode(null)}
        title={`Add expense to ${group.name}`}
        description="Split a shared bill between group members"
      >
        <GroupExpenseForm
          group={group}
          categories={categories}
          currency={currency}
          onSubmit={async (data) => {
            await addExpense(data);
            setMode(null);
          }}
          onCancel={() => setMode(null)}
        />
      </Sheet>

      <Sheet
        isOpen={mode === 'settle'}
        onClose={() => setMode(null)}
        title={`Settle up in ${group.name}`}
        description="Record a payment between members"
      >
        <SettleUpForm
          group={group}
          suggestions={suggestions}
          currency={currency}
          onSubmit={async (from, to, amount) => {
            await settleUp(from, to, amount);
            setMode(null);
          }}
          onCancel={() => setMode(null)}
        />
      </Sheet>
    </>
  );
};

export default function DashboardPage() {
  const { userProfile, user } = useAuth();
  const { openAddTransaction, openAddGoal, openAddGroup, openAddCategory } = useQuickActions();
  const {
    transactions,
    categories,
    loading: txLoading,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { groups, loading: groupsLoading, deleteGroup } = useGroups();
  const { goals, loading: goalsLoading, deleteGoal, addFunds } = useGoals();

  const currency = userProfile?.currency || 'INR';
  const monthlyBudget = userProfile?.monthlyBudget || 0;
  const firstName = (userProfile?.name || '').trim().split(/\s+/)[0];

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [goalForFunds, setGoalForFunds] = useState<Goal | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const stats = useMemo(() => {
    const now = new Date();
    const lastMonthDate = subMonths(now, 1);
    let monthIncome = 0;
    let monthExpenses = 0;
    let lastIncome = 0;
    let lastExpenses = 0;
    let allIncome = 0;
    let allExpenses = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      const d = tx.date ? new Date(tx.date) : now;
      const thisMonth = isSameMonth(d, now);
      const lastMonth = isSameMonth(d, lastMonthDate);
      if (tx.type === 'income') {
        allIncome += tx.amount;
        if (thisMonth) monthIncome += tx.amount;
        if (lastMonth) lastIncome += tx.amount;
      } else {
        allExpenses += tx.amount;
        if (thisMonth) {
          monthExpenses += tx.amount;
          categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amount;
        }
        if (lastMonth) lastExpenses += tx.amount;
      }
    });

    const history = Array.from({ length: 6 }).map((_, i) => {
      const target = subMonths(now, 5 - i);
      let spending = 0;
      let income = 0;
      transactions.forEach((t) => {
        if (t.date && isSameMonth(new Date(t.date), target)) {
          if (t.type === 'expense') spending += t.amount;
          else income += t.amount;
        }
      });
      return { month: format(target, 'MMM'), spending, income };
    });

    return {
      monthIncome,
      monthExpenses,
      net: monthIncome - monthExpenses,
      balance: allIncome - allExpenses,
      incomeChange: calcChange(monthIncome, lastIncome),
      expenseChange: calcChange(monthExpenses, lastExpenses),
      savingsRate: monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0,
      categoryTotals,
      history,
    };
  }, [transactions]);

  const categoryBreakdown: CategoryBreakdownItem[] = Object.entries(stats.categoryTotals).map(
    ([catId, value]) => {
      const cat = categoryMap.get(catId);
      return {
        name: cat?.name || 'Other',
        emoji: cat?.emoji || '📦',
        value,
        color: cat?.color || '#10b981',
      };
    }
  );

  const recentTransactions = transactions.slice(0, 5);
  const featuredGoal = goals.find((g) => g.saved < g.target) || goals[0];
  const firstGroup = groups[0];

  const budgetPct = monthlyBudget > 0 ? Math.round((stats.monthExpenses / monthlyBudget) * 100) : 0;
  const budgetLeft = monthlyBudget - stats.monthExpenses;
  const budgetBar =
    budgetPct >= 100 ? 'bg-rose-400' : budgetPct >= 80 ? 'bg-amber-300' : 'bg-white';

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={format(new Date(), 'EEEE, d MMMM')}
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        subtitle="Here's how your money is doing this month."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              className="hidden sm:inline-flex"
              icon={<Users2 className="w-4 h-4" />}
              onClick={openAddGroup}
            >
              Split a bill
            </Button>
            <Button
              variant="primary"
              size="md"
              className="hidden sm:inline-flex"
              icon={<Plus className="w-4 h-4" />}
              onClick={openAddTransaction}
            >
              Add transaction
            </Button>
          </>
        }
      />

      {/* Balance hero */}
      <section
        aria-label="Balance overview"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#10b981] text-white shadow-emerald-lg"
      >
        <div aria-hidden="true" className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-emerald-100 text-sm font-medium">
              <Wallet className="w-4 h-4" />
              Total balance
            </div>
            {txLoading ? (
              <Skeleton className="h-11 w-56 mt-2 bg-white/20" />
            ) : (
              <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight tabular-nums break-words">
                {stats.balance < 0 ? '-' : ''}
                {formatCurrency(stats.balance, currency)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 tabular-nums">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-emerald-100">In</span>
                <span className="font-semibold">{formatCurrency(stats.monthIncome, currency)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 tabular-nums">
                <TrendingDown className="w-3.5 h-3.5 text-rose-200" />
                <span className="text-emerald-100">Out</span>
                <span className="font-semibold">{formatCurrency(stats.monthExpenses, currency)}</span>
              </span>
            </div>
          </div>

          {/* Monthly budget */}
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4 sm:p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{format(new Date(), 'MMMM')} budget</p>
              <Link
                href="/profile"
                className="text-xs font-semibold text-emerald-100 hover:text-white underline-offset-2 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {monthlyBudget > 0 ? 'Edit' : 'Set budget'}
              </Link>
            </div>
            {monthlyBudget > 0 ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-2 tabular-nums">
                  <span className="text-2xl font-extrabold">{formatCurrency(stats.monthExpenses, currency)}</span>
                  <span className="text-xs text-emerald-100">of {formatCurrency(monthlyBudget, currency)}</span>
                </div>
                <div
                  className="mt-3 h-2.5 w-full rounded-full bg-white/20 overflow-hidden"
                  role="progressbar"
                  aria-label="Monthly budget used"
                  aria-valuenow={Math.min(budgetPct, 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${budgetBar}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-emerald-50 tabular-nums">
                  {budgetLeft >= 0
                    ? `${formatCurrency(budgetLeft, currency)} left · ${budgetPct}% used`
                    : `Over budget by ${formatCurrency(Math.abs(budgetLeft), currency)}`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-emerald-50">
                Set a monthly budget to see how much you have left to spend.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section aria-label="This month" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Income"
          amount={stats.monthIncome}
          currency={currency}
          changePercent={stats.incomeChange}
          tone="emerald"
          icon={<TrendingUp />}
          loading={txLoading}
        />
        <StatCard
          title="Expenses"
          amount={stats.monthExpenses}
          currency={currency}
          changePercent={stats.expenseChange}
          invertChange
          tone="rose"
          icon={<TrendingDown />}
          loading={txLoading}
        />
        <StatCard
          title="Net savings"
          amount={stats.net}
          currency={currency}
          subtitle={stats.monthIncome > 0 ? `${stats.savingsRate}% savings rate` : 'No income yet this month'}
          tone={stats.net >= 0 ? 'sky' : 'amber'}
          colorValue
          icon={<PiggyBank />}
          loading={txLoading}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card lift={false} className="lg:col-span-3 min-w-0">
          <SectionHeader
            title="Cash flow"
            subtitle="Income vs spending, last 6 months"
            action={<SeeAllLink href="/reports" label="Reports" />}
            className="mb-4"
          />
          {txLoading ? <Skeleton className="h-64 sm:h-72 w-full" /> : (
            <SpendingOverviewChart data={stats.history} currency={currency} />
          )}
        </Card>

        <Card lift={false} className="lg:col-span-2 min-w-0">
          <SectionHeader
            title="Where it went"
            subtitle={`Spending by category in ${format(new Date(), 'MMMM')}`}
            className="mb-4"
          />
          {txLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="w-44 h-44 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <CategoryBreakdownChart data={categoryBreakdown} currency={currency} layout="stacked" maxItems={5} />
          )}
        </Card>
      </div>

      {/* Recent transactions + goals/groups */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <section aria-labelledby="recent-tx" className="lg:col-span-3 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-tx" className="text-base font-bold text-[#0b3b2e]">
              Recent transactions
            </h2>
            {transactions.length > 0 && (
              <SeeAllLink href="/transactions" label={`See all (${transactions.length})`} />
            )}
          </div>

          {txLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <Card lift={false} padding="none">
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No transactions yet"
                description="Add your first income or expense to start tracking."
                action={
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddTransaction}>
                    Add transaction
                  </Button>
                }
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {recentTransactions.map((tx) => (
                <li key={tx.id}>
                  <ExpenseCard
                    transaction={tx}
                    category={categoryMap.get(tx.categoryId)}
                    currency={currency}
                    onEdit={(t) => setEditingTx(t)}
                    onDelete={(id) => deleteTransaction(id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="lg:col-span-2 min-w-0 space-y-6">
          {/* Goal preview */}
          <section aria-labelledby="goal-preview" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="goal-preview" className="text-base font-bold text-[#0b3b2e]">
                Savings goal
              </h2>
              {goals.length > 0 && <SeeAllLink href="/budget" label={`All goals (${goals.length})`} />}
            </div>
            {goalsLoading ? (
              <Skeleton className="h-44 w-full rounded-2xl" />
            ) : featuredGoal ? (
              <GoalCard
                goal={featuredGoal}
                currency={currency}
                onAddFunds={(g) => setGoalForFunds(g)}
                onDelete={(id) => deleteGoal(id)}
              />
            ) : (
              <Card lift={false} padding="none">
                <EmptyState
                  compact
                  tone="amber"
                  icon={<Target className="w-5 h-5" />}
                  title="No savings goals yet"
                  description="Save towards a trip, a gadget or a safety net."
                  action={
                    <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddGoal}>
                      Create goal
                    </Button>
                  }
                />
              </Card>
            )}
          </section>

          {/* Group preview */}
          <section aria-labelledby="group-preview" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="group-preview" className="text-base font-bold text-[#0b3b2e]">
                Split group
              </h2>
              {groups.length > 0 && <SeeAllLink href="/split" label={`All groups (${groups.length})`} />}
            </div>
            {groupsLoading ? (
              <Skeleton className="h-44 w-full rounded-2xl" />
            ) : firstGroup ? (
              <GroupPreview
                key={firstGroup.id}
                group={firstGroup}
                currentUserId={user?.uid}
                currency={currency}
                categories={categories}
                onDelete={deleteGroup}
              />
            ) : (
              <Card lift={false} padding="none">
                <EmptyState
                  compact
                  tone="sky"
                  icon={<Users2 className="w-5 h-5" />}
                  title="No split groups yet"
                  description="Share rent, trips or dinners and settle up easily."
                  action={
                    <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddGroup}>
                      Create group
                    </Button>
                  }
                />
              </Card>
            )}
          </section>
        </div>
      </div>

      {/* Edit transaction */}
      <Sheet
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Edit transaction"
        description="Update the details of this transaction"
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
            onOpenAddCategory={openAddCategory}
          />
        )}
      </Sheet>

      {/* Add funds to goal */}
      <Sheet
        isOpen={Boolean(goalForFunds)}
        onClose={() => setGoalForFunds(null)}
        title={goalForFunds ? `Add funds to ${goalForFunds.name}` : 'Add funds'}
        description="Record a deposit towards this goal"
      >
        {goalForFunds && (
          <AddFundsForm
            goal={goalForFunds}
            onSubmit={async (amount, note) => {
              await addFunds(goalForFunds.id, amount, note);
              setGoalForFunds(null);
            }}
            onCancel={() => setGoalForFunds(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
