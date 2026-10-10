'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SplitGroup, GroupExpense, GroupSettlement, GroupMember } from '@/types';
import { formatCurrency } from '@/lib/format';
import { computeGroupBalances } from '@/lib/balances';
import { useGroupDetail } from '@/hooks/useGroups';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Skeleton } from '../ui/Skeleton';
import { ChevronRight, Plus, HandCoins, Trash2 } from 'lucide-react';

/** Finds the member that represents the signed-in user (falls back to the "(You)" naming convention). */
export function findCurrentMember(
  members: GroupMember[],
  currentUserId?: string
): GroupMember | undefined {
  return (
    (currentUserId ? members.find((m) => m.uid === currentUserId) : undefined) ||
    members.find((m) => m.name.includes('(You)'))
  );
}

/** Strips the "(You)" suffix used for the creator's member name. */
export const displayName = (name: string) => name.replace(/\s*\(You\)\s*$/, '');

export interface GroupBalanceSummary {
  groupId: string;
  /** Positive = you are owed, negative = you owe. */
  net: number;
  totalSpent: number;
}

interface GroupCardProps {
  group: SplitGroup;
  currentUserId?: string;
  currency?: string;
  /** Optional overrides; by default the card subscribes to the group's own data. */
  expenses?: GroupExpense[];
  settlements?: GroupSettlement[];
  onAddExpense: (group: SplitGroup) => void;
  onSettleUp: (group: SplitGroup) => void;
  onDeleteGroup: (id: string) => void | Promise<unknown>;
  /** Reports the current user's balance in this group whenever it changes. */
  onBalanceChange?: (summary: GroupBalanceSummary) => void;
}

const MAX_AVATARS = 4;

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUserId,
  currency = 'INR',
  expenses: expensesProp,
  settlements: settlementsProp,
  onAddExpense,
  onSettleUp,
  onDeleteGroup,
  onBalanceChange,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const detail = useGroupDetail(group.id);
  const expenses = expensesProp ?? detail.expenses;
  const settlements = settlementsProp ?? detail.settlements;
  const loading = !expensesProp && detail.loading;

  const memberBalances = computeGroupBalances(group.members, expenses, settlements);
  const me = findCurrentMember(group.members, currentUserId);
  const myBalance = me ? memberBalances.find((b) => b.memberId === me.id) : undefined;
  const net = myBalance?.netBalance ?? 0;
  const totalSpent = Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

  useEffect(() => {
    if (!loading) onBalanceChange?.({ groupId: group.id, net, totalSpent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, net, totalSpent, loading]);

  const status = net > 0.01 ? 'owed' : net < -0.01 ? 'owe' : 'settled';
  const others = group.members.length - MAX_AVATARS;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteGroup(group.id);
      setShowConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <article className="group/card bg-white rounded-2xl border border-slate-200/70 shadow-card hover:shadow-card-hover hover:border-emerald-200 transition-all duration-200 flex flex-col">
        {/* Header: emoji, name, meta — whole area links to detail */}
        <Link
          href={`/split/${group.id}`}
          className="flex items-center gap-3 p-4 pb-3 rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <span className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
            {group.emoji || '👥'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight text-[#0b3b2e] truncate">
              {group.name}
            </h3>
            <p className="text-xs text-[#64748b] mt-1 flex items-center gap-1.5">
              <span className="font-medium text-emerald-700">{group.category}</span>
              <span aria-hidden>•</span>
              <span>
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </span>
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover/card:text-emerald-600 transition-colors flex-shrink-0" />
        </Link>

        {/* Balance + avatars */}
        <div className="mx-4 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
              {status === 'owed' ? 'You are owed' : status === 'owe' ? 'You owe' : 'Your balance'}
            </p>
            {loading ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <p
                className={`text-lg font-semibold tabular-nums leading-tight mt-0.5 ${
                  status === 'owed'
                    ? 'text-emerald-600'
                    : status === 'owe'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {status === 'settled' ? 'Settled up' : formatCurrency(net, currency)}
              </p>
            )}
            <p className="text-[11px] text-[#64748b] mt-0.5 tabular-nums">
              {formatCurrency(totalSpent, currency)} total spent
            </p>
          </div>

          <div className="flex -space-x-2 flex-shrink-0" aria-label={`${group.members.length} members`}>
            {group.members.slice(0, MAX_AVATARS).map((m) => (
              <Avatar
                key={m.id}
                name={displayName(m.name)}
                size="sm"
                className="!rounded-full !shadow-none ring-2 ring-white !border-0"
              />
            ))}
            {others > 0 && (
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">
                +{others}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-3 mt-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => onAddExpense(group)}
          >
            Expense
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            icon={<HandCoins className="w-3.5 h-3.5" />}
            onClick={() => onSettleUp(group)}
          >
            Settle up
          </Button>
          <IconButton
            variant="ghost"
            size="md"
            label={`Delete group ${group.name}`}
            className="hover:!bg-rose-50 hover:!text-rose-600"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </article>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete group?"
        message={`"${group.name}" and all of its expenses, settlements and activity will be permanently deleted. This can't be undone.`}
        confirmText="Delete group"
      />
    </>
  );
};
