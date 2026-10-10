'use client';

import React, { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGroups, useGroupDetail } from '@/hooks/useGroups';
import { useTransactions } from '@/hooks/useTransactions';
import { computeGroupBalances, simplifyDebts } from '@/lib/balances';
import { formatCurrency } from '@/lib/format';
import { GroupCard, GroupBalanceSummary } from '@/components/cards/GroupCard';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { GroupForm } from '@/components/forms/GroupForm';
import { GroupExpenseForm } from '@/components/forms/GroupExpenseForm';
import { SettleUpForm } from '@/components/forms/SettleUpForm';
import { Category, SplitGroup } from '@/types';
import { Plus, Users2, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

type QuickAction = { group: SplitGroup; mode: 'expense' | 'settle' } | null;

/** Mounted only while a quick action is open, so we subscribe to just that group. */
function GroupQuickSheet({
  action,
  currency,
  categories,
  onClose,
}: {
  action: NonNullable<QuickAction>;
  currency: string;
  categories: Category[];
  onClose: (changed: boolean) => void;
}) {
  const { group: liveGroup, expenses, settlements, loading, addExpense, settleUp } =
    useGroupDetail(action.group.id);
  const group = liveGroup || action.group;
  const debts = simplifyDebts(computeGroupBalances(group.members, expenses, settlements));

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return action.mode === 'expense' ? (
    <GroupExpenseForm
      group={group}
      categories={categories}
      currency={currency}
      onSubmit={async (data) => {
        await addExpense(data);
        onClose(true);
      }}
      onCancel={() => onClose(false)}
    />
  ) : (
    <SettleUpForm
      group={group}
      suggestions={debts}
      currency={currency}
      onSubmit={async (from, to, amount) => {
        await settleUp(from, to, amount);
        onClose(true);
      }}
      onCancel={() => onClose(false)}
    />
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
  loading,
}: {
  label: string;
  value: string;
  tone: 'rose' | 'emerald' | 'slate';
  icon: React.ReactNode;
  loading?: boolean;
}) {
  const tones = {
    rose: { text: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
    emerald: { text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    slate: { text: 'text-[#0b3b2e]', chip: 'bg-slate-100 text-slate-600' },
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-4 flex items-center gap-3 min-w-0">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tones.chip}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-20 mt-1" />
        ) : (
          <p className={`text-xl font-extrabold tabular-nums leading-tight truncate ${tones.text}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

export default function SplitBillsPage() {
  const { userProfile, user } = useAuth();
  const { groups, loading, createGroup, deleteGroup } = useGroups();
  const { categories } = useTransactions();
  const currency = userProfile?.currency || 'INR';

  const [createOpen, setCreateOpen] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [balances, setBalances] = useState<Record<string, GroupBalanceSummary>>({});
  // Bumped after a quick action so cards re-read data (demo mode has no live listeners).
  const [dataVersion, setDataVersion] = useState(0);
  const closeQuickAction = (changed: boolean) => {
    setQuickAction(null);
    if (changed) setDataVersion((v) => v + 1);
  };

  const handleBalance = useCallback((s: GroupBalanceSummary) => {
    setBalances((prev) => {
      const cur = prev[s.groupId];
      if (cur && cur.net === s.net && cur.totalSpent === s.totalSpent) return prev;
      return { ...prev, [s.groupId]: s };
    });
  }, []);

  // Only count groups that still exist
  const known = groups.map((g) => balances[g.id]).filter(Boolean) as GroupBalanceSummary[];
  const summaryLoading = loading || known.length < groups.length;
  const youOwe = known.reduce((s, b) => s + (b.net < -0.01 ? -b.net : 0), 0);
  const youAreOwed = known.reduce((s, b) => s + (b.net > 0.01 ? b.net : 0), 0);
  const net = Math.round((youAreOwed - youOwe) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#0b3b2e]">Split bills</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Share costs with friends, flatmates and trips
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
          className="flex-shrink-0"
          aria-label="Create new group"
        >
          <span className="hidden sm:inline">New group</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Overall summary */}
      {(loading || groups.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryTile
            label="You owe"
            value={formatCurrency(youOwe, currency)}
            tone={youOwe > 0.01 ? 'rose' : 'slate'}
            icon={<ArrowUpRight className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <SummaryTile
            label="You are owed"
            value={formatCurrency(youAreOwed, currency)}
            tone={youAreOwed > 0.01 ? 'emerald' : 'slate'}
            icon={<ArrowDownLeft className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <SummaryTile
            label="Net balance"
            value={
              Math.abs(net) < 0.01
                ? 'All settled'
                : `${net > 0 ? '+' : '−'}${formatCurrency(net, currency)}`
            }
            tone={net > 0.01 ? 'emerald' : net < -0.01 ? 'rose' : 'slate'}
            icon={<Scale className="w-5 h-5" />}
            loading={summaryLoading}
          />
        </div>
      )}

      {/* Groups */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-card px-6 py-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Users2 className="w-7 h-7" />
          </div>
          <h2 className="mt-4 font-bold text-base text-[#0b3b2e]">No groups yet</h2>
          <p className="text-sm text-[#64748b] mt-1 mb-5">
            Create a group for a trip, your flat or a dinner — we’ll work out who owes whom.
          </p>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((grp) => (
            <GroupCard
              key={`${grp.id}-${dataVersion}`}
              group={grp}
              currentUserId={user?.uid || 'demo-user-flow'}
              currency={currency}
              onAddExpense={(g) => setQuickAction({ group: g, mode: 'expense' })}
              onSettleUp={(g) => setQuickAction({ group: g, mode: 'settle' })}
              onDeleteGroup={(id) => deleteGroup(id)}
              onBalanceChange={handleBalance}
            />
          ))}
        </div>
      )}

      {/* Create group */}
      <Sheet
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New split group"
        description="Add the people you’re sharing costs with"
      >
        <GroupForm
          onSubmit={async (data) => {
            await createGroup(data);
            setCreateOpen(false);
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Sheet>

      {/* Quick add expense / settle up from a card */}
      <Sheet
        isOpen={Boolean(quickAction)}
        onClose={() => setQuickAction(null)}
        title={quickAction?.mode === 'settle' ? 'Settle up' : 'Add expense'}
        description={quickAction ? `${quickAction.group.emoji} ${quickAction.group.name}` : undefined}
      >
        {quickAction && (
          <GroupQuickSheet
            key={`${quickAction.group.id}-${quickAction.mode}`}
            action={quickAction}
            currency={currency}
            categories={categories}
            onClose={closeQuickAction}
          />
        )}
      </Sheet>
    </div>
  );
}
