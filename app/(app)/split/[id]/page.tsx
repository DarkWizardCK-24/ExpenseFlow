'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useGroupDetail, useGroups } from '@/hooks/useGroups';
import { useTransactions } from '@/hooks/useTransactions';
import { computeGroupBalances, simplifyDebts } from '@/lib/balances';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GroupExpenseForm } from '@/components/forms/GroupExpenseForm';
import { GroupForm } from '@/components/forms/GroupForm';
import { SettleUpForm } from '@/components/forms/SettleUpForm';
import { ActivityLogTimeline } from '@/components/timeline/ActivityLogTimeline';
import { findCurrentMember, displayName } from '@/components/cards/GroupCard';
import { DebtSimplification, GroupExpense, GroupSettlement } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  HandCoins,
  Pencil,
  Trash2,
  Receipt,
  Undo2,
  PartyPopper,
  SearchX,
} from 'lucide-react';

type Tab = 'balances' | 'expenses' | 'settlements' | 'activity';

type PendingConfirm =
  | { kind: 'expense'; item: GroupExpense }
  | { kind: 'settlement'; item: GroupSettlement }
  | { kind: 'group' }
  | null;

const cardClass = 'bg-white rounded-2xl border border-slate-200/70 shadow-card';

function EmptyState({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
        {icon}
      </div>
      <p className="mt-3 text-sm text-[#64748b]">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading group">
      <Skeleton className="h-4 w-28" />
      <div className={`${cardClass} p-5 space-y-5`}>
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
      <Skeleton className="h-11 w-full max-w-lg" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const { userProfile, user } = useAuth();
  const { categories } = useTransactions();
  const { deleteGroup } = useGroups();
  const {
    group,
    expenses,
    settlements,
    logs,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    settleUp,
    deleteSettlement,
    updateGroup,
    isMemberInvolved,
  } = useGroupDetail(groupId);

  const currency = userProfile?.currency || 'INR';
  const money = (n: number) => formatCurrency(n, currency);

  const [tab, setTab] = useState<Tab>('balances');
  const [expenseSheet, setExpenseSheet] = useState<{ open: boolean; editing: GroupExpense | null }>({
    open: false,
    editing: null,
  });
  const [settleSheet, setSettleSheet] = useState<{ open: boolean; initial: DebtSimplification | null }>({
    open: false,
    initial: null,
  });
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (loading || leaving) return <DetailSkeleton />;

  if (!group) {
    return (
      <div className={`${cardClass} max-w-lg mx-auto mt-8`}>
        <EmptyState
          icon={<SearchX className="w-6 h-6" />}
          title="This group doesn’t exist or was deleted."
          action={
            <Link href="/split">
              <Button variant="primary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Back to groups
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // ---- Derived data ----
  const memberBalances = computeGroupBalances(group.members, expenses, settlements);
  const debts = simplifyDebts(memberBalances);
  const memberMap = new Map(group.members.map((m) => [m.id, m]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const me = findCurrentMember(group.members, user?.uid || 'demo-user-flow');
  const myNet = memberBalances.find((b) => b.memberId === me?.id)?.netBalance ?? 0;
  const totalSpent = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;

  const nameOf = (id: string) => {
    const m = memberMap.get(id);
    if (!m) return 'Former member';
    return m.id === me?.id ? 'You' : displayName(m.name);
  };

  // ---- Actions ----
  const openAddExpense = () => setExpenseSheet({ open: true, editing: null });
  const openSettle = (initial: DebtSimplification | null = null) =>
    setSettleSheet({ open: true, initial });

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.kind === 'expense') {
        await deleteExpense(confirm.item.id);
      } else if (confirm.kind === 'settlement') {
        await deleteSettlement(confirm.item.id);
      } else {
        await deleteGroup(group.id);
        setLeaving(true);
        router.push('/split');
      }
      setConfirm(null);
    } catch {
      // hooks already surface a toast
    } finally {
      setConfirmLoading(false);
    }
  };

  const confirmProps = (() => {
    if (!confirm) return { title: '', message: '', confirmText: 'Delete' };
    if (confirm.kind === 'expense')
      return {
        title: 'Delete expense?',
        message: `"${confirm.item.title}" (${money(confirm.item.amount)}) will be removed and balances recalculated.`,
        confirmText: 'Delete expense',
      };
    if (confirm.kind === 'settlement')
      return {
        title: 'Undo settlement?',
        message: `The payment of ${money(confirm.item.amount)} from ${nameOf(confirm.item.from)} to ${nameOf(
          confirm.item.to
        )} will be removed and the debt restored.`,
        confirmText: 'Undo settlement',
      };
    return {
      title: 'Delete group?',
      message: `"${group.name}" and all its expenses, settlements and activity will be permanently deleted. This can’t be undone.`,
      confirmText: 'Delete group',
    };
  })();

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'balances', label: 'Balances' },
    { id: 'expenses', label: 'Expenses', count: expenses.length },
    { id: 'settlements', label: 'Settlements', count: settlements.length },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/split"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All groups
      </Link>

      {/* ---- Header ---- */}
      <section className={`${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">
              {group.emoji || '👥'}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0b3b2e] truncate">{group.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#64748b]">
                <span className="font-semibold text-emerald-700">{group.category}</span>
                <span aria-hidden>•</span>
                <div className="flex -space-x-1.5">
                  {group.members.slice(0, 5).map((m) => (
                    <Avatar
                      key={m.id}
                      name={displayName(m.name)}
                      size="sm"
                      className="!w-6 !h-6 !text-[9px] !rounded-full !shadow-none !border-0 ring-2 ring-white"
                    />
                  ))}
                </div>
                <span>
                  {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton variant="emerald" size="lg" label="Edit group" onClick={() => setEditGroupOpen(true)}>
              <Pencil className="w-4 h-4" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="lg"
              label="Delete group"
              className="border border-slate-200 hover:!bg-rose-50 hover:!text-rose-600"
              onClick={() => setConfirm({ kind: 'group' })}
            >
              <Trash2 className="w-4 h-4" />
            </IconButton>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              icon={<HandCoins className="w-4 h-4" />}
              onClick={() => openSettle()}
            >
              Settle up
            </Button>
            <Button
              variant="primary"
              className="flex-1 sm:flex-none"
              icon={<Plus className="w-4 h-4" />}
              onClick={openAddExpense}
            >
              Expense
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Total spent
            </p>
            <p className="text-base sm:text-lg font-extrabold tabular-nums text-[#0b3b2e] truncate">
              {money(totalSpent)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-3 min-w-0 ${
              myNet > 0.01
                ? 'bg-emerald-50 border-emerald-100'
                : myNet < -0.01
                ? 'bg-rose-50 border-rose-100'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              {myNet > 0.01 ? 'You are owed' : myNet < -0.01 ? 'You owe' : 'Your balance'}
            </p>
            <p
              className={`text-base sm:text-lg font-extrabold tabular-nums truncate ${
                myNet > 0.01 ? 'text-emerald-600' : myNet < -0.01 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {Math.abs(myNet) < 0.01 ? 'Settled' : money(myNet)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Expenses
            </p>
            <p className="text-base sm:text-lg font-extrabold tabular-nums text-[#0b3b2e]">
              {expenses.length}
            </p>
          </div>
        </div>
      </section>

      {/* ---- Tabs ---- */}
      <div
        role="tablist"
        aria-label="Group sections"
        className="flex gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full sm:max-w-lg"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              tab === t.id ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#64748b] hover:text-[#0b3b2e]'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className="ml-1 text-[11px] tabular-nums text-[#64748b]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {/* ---- Balances ---- */}
        {tab === 'balances' && (
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <section className={cardClass}>
              <header className="px-4 sm:px-5 pt-4 pb-3">
                <h2 className="text-base font-bold text-[#0b3b2e]">Suggested payments</h2>
                <p className="text-xs text-[#64748b]">Fewest payments to settle everyone up</p>
              </header>
              {debts.length === 0 ? (
                <EmptyState
                  icon={<PartyPopper className="w-6 h-6" />}
                  title={expenses.length ? 'Everyone is settled up.' : 'No debts yet — add an expense to get started.'}
                  action={
                    expenses.length ? undefined : (
                      <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddExpense}>
                        Add expense
                      </Button>
                    )
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {debts.map((d) => {
                    const involvesMe = d.from === me?.id || d.to === me?.id;
                    return (
                      <li key={`${d.from}-${d.to}`} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <div className="flex items-center -space-x-2 flex-shrink-0">
                          <Avatar name={displayName(memberMap.get(d.from)?.name || '?')} size="sm" className="!rounded-full !shadow-none ring-2 ring-white !border-0" />
                          <Avatar name={displayName(memberMap.get(d.to)?.name || '?')} size="sm" className="!rounded-full !shadow-none ring-2 ring-white !border-0" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#0b3b2e] truncate">
                            <span className="font-semibold">{nameOf(d.from)}</span>
                            <span className="text-[#64748b]"> {d.from === me?.id ? 'owe' : 'owes'} </span>
                            <span className="font-semibold">{nameOf(d.to)}</span>
                          </p>
                          <p
                            className={`text-sm font-bold tabular-nums ${
                              d.from === me?.id ? 'text-rose-600' : d.to === me?.id ? 'text-emerald-600' : 'text-[#0b3b2e]'
                            }`}
                          >
                            {money(d.amount)}
                          </p>
                        </div>
                        <Button
                          variant={involvesMe ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => openSettle(d)}
                          aria-label={`Settle ${money(d.amount)} from ${nameOf(d.from)} to ${nameOf(d.to)}`}
                        >
                          Settle
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className={cardClass}>
              <header className="px-4 sm:px-5 pt-4 pb-3">
                <h2 className="text-base font-bold text-[#0b3b2e]">Member balances</h2>
                <p className="text-xs text-[#64748b]">What each person paid vs. their share</p>
              </header>
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {memberBalances.map((mb) => {
                  const pos = mb.netBalance > 0.01;
                  const neg = mb.netBalance < -0.01;
                  return (
                    <li key={mb.memberId} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                      <Avatar name={displayName(mb.name)} size="md" className="!rounded-full !shadow-none !border-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0b3b2e] truncate">{nameOf(mb.memberId)}</p>
                        <p className="text-[11px] text-[#64748b] tabular-nums">
                          Paid {money(mb.totalPaid)} · Share {money(mb.totalShare)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            pos ? 'text-emerald-600' : neg ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {pos ? '+' : neg ? '−' : ''}
                          {pos || neg ? money(mb.netBalance) : 'Settled'}
                        </p>
                        {(pos || neg) && (
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b]">
                            {pos ? 'gets back' : 'owes'}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {/* ---- Expenses ---- */}
        {tab === 'expenses' && (
          <section className={cardClass}>
            <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b3b2e]">Expenses</h2>
                <p className="text-xs text-[#64748b] tabular-nums">{money(totalSpent)} across {expenses.length} bills</p>
              </div>
              {expenses.length > 0 && (
                <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddExpense}>
                  Add
                </Button>
              )}
            </header>
            {expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No expenses yet. Add the first bill to split it."
                action={
                  <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAddExpense}>
                    Add expense
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {expenses.map((exp) => {
                  const cat = categoryMap.get(exp.categoryId);
                  const myShare = me ? exp.splits?.[me.id] ?? 0 : 0;
                  const iPaid = exp.paidBy === me?.id;
                  const lent = iPaid ? Math.round((exp.amount - myShare) * 100) / 100 : 0;
                  return (
                    <li key={exp.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/60 transition-colors">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-emerald-50"
                        style={cat ? { backgroundColor: `${cat.color}1f` } : undefined}
                        aria-hidden
                      >
                        {cat?.emoji || '🧾'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0b3b2e] truncate">{exp.title}</p>
                        <p className="text-[11px] text-[#64748b] truncate">
                          {nameOf(exp.paidBy)} paid · {formatDate(exp.createdAt, 'MMM d')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums text-[#0b3b2e]">{money(exp.amount)}</p>
                        {me && (iPaid ? lent > 0.01 : myShare > 0.01) ? (
                          <p className={`text-[11px] font-semibold tabular-nums ${iPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {iPaid ? `you lent ${money(lent)}` : `you owe ${money(myShare)}`}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">not involved</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <IconButton
                          variant="ghost"
                          size="md"
                          label={`Edit ${exp.title}`}
                          onClick={() => setExpenseSheet({ open: true, editing: exp })}
                        >
                          <Pencil className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="md"
                          label={`Delete ${exp.title}`}
                          className="hover:!bg-rose-50 hover:!text-rose-600"
                          onClick={() => setConfirm({ kind: 'expense', item: exp })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ---- Settlements ---- */}
        {tab === 'settlements' && (
          <section className={cardClass}>
            <header className="px-4 sm:px-5 pt-4 pb-3">
              <h2 className="text-base font-bold text-[#0b3b2e]">Settlements</h2>
              <p className="text-xs text-[#64748b]">Payments recorded between members</p>
            </header>
            {settlements.length === 0 ? (
              <EmptyState
                icon={<HandCoins className="w-6 h-6" />}
                title="No payments recorded yet."
                action={
                  debts.length > 0 ? (
                    <Button variant="secondary" size="sm" icon={<HandCoins className="w-3.5 h-3.5" />} onClick={() => openSettle()}>
                      Settle up
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {settlements.map((st) => (
                  <li key={st.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <HandCoins className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#0b3b2e] flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold truncate">{nameOf(st.from)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="font-semibold truncate">{nameOf(st.to)}</span>
                      </p>
                      <p className="text-[11px] text-[#64748b]">{formatDate(st.createdAt, 'MMM d, yyyy')}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-emerald-700 flex-shrink-0">{money(st.amount)}</p>
                    <IconButton
                      variant="ghost"
                      size="md"
                      label={`Undo settlement of ${money(st.amount)}`}
                      className="hover:!bg-amber-50 hover:!text-amber-700"
                      onClick={() => setConfirm({ kind: 'settlement', item: st })}
                    >
                      <Undo2 className="w-4 h-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ---- Activity ---- */}
        {tab === 'activity' && (
          <section className={`${cardClass} p-4 sm:p-5`}>
            <h2 className="text-base font-bold text-[#0b3b2e] mb-4">Activity</h2>
            <ActivityLogTimeline logs={logs} />
          </section>
        )}
      </div>

      {/* ---- Sheets ---- */}
      <Sheet
        isOpen={expenseSheet.open}
        onClose={() => setExpenseSheet({ open: false, editing: null })}
        title={expenseSheet.editing ? 'Edit expense' : 'Add expense'}
        description={`${group.emoji} ${group.name}`}
      >
        <GroupExpenseForm
          key={expenseSheet.editing?.id || 'new'}
          group={group}
          categories={categories}
          currency={currency}
          initialData={expenseSheet.editing}
          onSubmit={async (data) => {
            if (expenseSheet.editing) await updateExpense(expenseSheet.editing.id, data);
            else await addExpense(data);
            setExpenseSheet({ open: false, editing: null });
          }}
          onCancel={() => setExpenseSheet({ open: false, editing: null })}
        />
      </Sheet>

      <Sheet
        isOpen={settleSheet.open}
        onClose={() => setSettleSheet({ open: false, initial: null })}
        title="Settle up"
        description="Record a payment between members"
      >
        <SettleUpForm
          key={settleSheet.initial ? `${settleSheet.initial.from}-${settleSheet.initial.to}` : 'any'}
          group={group}
          suggestions={debts}
          initial={settleSheet.initial}
          currency={currency}
          onSubmit={async (from, to, amount) => {
            await settleUp(from, to, amount);
            setSettleSheet({ open: false, initial: null });
          }}
          onCancel={() => setSettleSheet({ open: false, initial: null })}
        />
      </Sheet>

      <Sheet
        isOpen={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        title="Edit group"
        description="Rename, change the look, or manage members"
      >
        <GroupForm
          initialData={group}
          canRemoveMember={(id) => !isMemberInvolved(id)}
          onUpdate={async (data) => {
            await updateGroup(data);
            setEditGroupOpen(false);
          }}
          onCancel={() => setEditGroupOpen(false)}
        />
      </Sheet>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => !confirmLoading && setConfirm(null)}
        onConfirm={runConfirm}
        loading={confirmLoading}
        title={confirmProps.title}
        message={confirmProps.message}
        confirmText={confirmProps.confirmText}
      />
    </div>
  );
}
