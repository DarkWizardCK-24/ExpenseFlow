'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useGoalDetail } from '@/hooks/useGoals';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconButton } from '@/components/ui/IconButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AddFundsForm, type FundsMode } from '@/components/forms/AddFundsForm';
import { GoalForm } from '@/components/forms/GoalForm';
import {
  ArrowLeft,
  Plus,
  Minus,
  Pencil,
  Trash2,
  CalendarDays,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  PartyPopper,
  History,
  SearchX,
} from 'lucide-react';

const MILESTONES = [25, 50, 75, 100];

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const { userProfile } = useAuth();
  const { goal, logs, loading, addFunds, updateGoal, deleteGoal } = useGoalDetail(goalId);
  const currency = userProfile?.currency || 'INR';

  const [fundsMode, setFundsMode] = useState<FundsMode | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    let deposited = 0;
    let withdrawn = 0;
    let deposits = 0;
    logs.forEach((l) => {
      if (l.type === 'withdrawal') withdrawn += l.amount;
      else {
        deposited += l.amount;
        deposits += 1;
      }
    });
    return { deposited, withdrawn, deposits };
  }, [logs]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [logs]
  );

  if (loading || (deleting && !goal)) {
    return <GoalDetailSkeleton />;
  }

  if (!goal) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-100 shadow-card p-8 mt-6 flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <SearchX className="w-6 h-6" />
        </span>
        <h1 className="text-base font-bold text-[#0b3b2e] mt-3">Goal not found</h1>
        <p className="text-sm text-[#64748b] mt-1">It may have been deleted or the link is incorrect.</p>
        <Button variant="primary" size="sm" className="mt-5" onClick={() => router.push('/budget')}>
          Back to goals
        </Button>
      </div>
    );
  }

  const ratio = goal.target > 0 ? goal.saved / goal.target : 0;
  const percentage = Math.min(Math.round(ratio * 100), 100);
  const remaining = Math.max(goal.target - goal.saved, 0);
  const isCompleted = goal.target > 0 && goal.saved >= goal.target;
  const nextMilestone = MILESTONES.find((m) => m > percentage);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(ratio, 1) * circumference;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGoal();
      setConfirmOpen(false);
      router.push('/budget');
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/budget"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748b] hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Budget &amp; Goals</span>
        </Link>
        <div className="flex items-center gap-1">
          <IconButton variant="ghost" size="md" label="Edit goal" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="md"
            label="Delete goal"
            onClick={() => setConfirmOpen(true)}
            className="hover:!bg-red-50 hover:!text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      {/* Hero */}
      <section
        className={`rounded-2xl border shadow-card p-5 sm:p-8 ${
          isCompleted
            ? 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-200'
            : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              <span className="w-16 h-16 flex-shrink-0 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-4xl">
                {goal.emoji || '🎯'}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-[#0b3b2e] leading-tight break-words">
                  {goal.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="gray" size="sm">
                    {goal.category}
                  </Badge>
                  {isCompleted ? (
                    <Badge variant="green" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="emerald" size="sm">
                      {percentage}% funded
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat label="Saved" value={formatCurrency(goal.saved, currency)} tone="emerald" />
              <Stat label="Target" value={formatCurrency(goal.target, currency)} />
              <Stat
                label={isCompleted ? 'Extra' : 'Remaining'}
                value={formatCurrency(isCompleted ? goal.saved - goal.target : remaining, currency)}
                tone={isCompleted ? 'emerald' : 'amber'}
              />
            </div>

            {/* Milestones */}
            <div>
              <div className="relative h-2.5 rounded-full bg-emerald-100/70">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#059669] to-[#10b981] transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
                {MILESTONES.slice(0, -1).map((m) => (
                  <span
                    key={m}
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                      percentage >= m ? 'bg-emerald-600 border-white' : 'bg-white border-emerald-200'
                    }`}
                    style={{ left: `${m}%` }}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-medium text-[#64748b] tabular-nums">
                {[0, ...MILESTONES].map((m) => (
                  <span key={m} className={percentage >= m && m > 0 ? 'text-emerald-700 font-semibold' : ''}>
                    {m}%
                  </span>
                ))}
              </div>
              <p className="text-xs text-[#64748b] mt-2">
                {isCompleted
                  ? 'Every milestone hit.'
                  : nextMilestone
                  ? `${formatCurrency(Math.max((goal.target * nextMilestone) / 100 - goal.saved, 0), currency)} to reach the ${nextMilestone}% milestone.`
                  : null}
              </p>
            </div>
          </div>

          {/* Ring */}
          <div
            className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto md:mx-0 flex-shrink-0"
            role="img"
            aria-label={`${percentage}% funded`}
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={radius} strokeWidth="14" stroke="#d1fae5" fill="transparent" />
              <circle
                cx="80"
                cy="80"
                r={radius}
                strokeWidth="14"
                stroke="#059669"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isCompleted ? (
                <>
                  <PartyPopper className="w-7 h-7 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700 mt-1">Goal reached</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-black tabular-nums text-[#0b3b2e]">{percentage}%</span>
                  <span className="text-[11px] font-semibold text-[#64748b]">funded</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-600 text-white p-4">
            <PartyPopper className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">You did it!</p>
              <p className="text-emerald-50/90 text-xs mt-0.5">
                You&apos;ve saved the full {formatCurrency(goal.target, currency)}. Withdraw when you&apos;re ready to
                spend it, or raise the target to keep going.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setFundsMode('deposit')}>
            Add funds
          </Button>
          <Button
            variant="outline"
            icon={<Minus className="w-4 h-4" />}
            onClick={() => setFundsMode('withdraw')}
            disabled={goal.saved <= 0}
          >
            Withdraw
          </Button>
          <p className="col-span-2 sm:col-span-1 sm:ml-auto text-xs text-[#64748b] flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Started {formatDate(goal.createdAt, 'MMM d, yyyy')}
          </p>
        </div>
      </section>

      {/* Activity */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0b3b2e]">Activity</h2>
            <p className="text-xs text-[#64748b] mt-0.5 tabular-nums">
              {stats.deposits} deposit{stats.deposits === 1 ? '' : 's'} ·{' '}
              <span className="text-emerald-700">+{formatCurrency(stats.deposited, currency)}</span>
              {stats.withdrawn > 0 && (
                <>
                  {' '}
                  · <span className="text-amber-700">−{formatCurrency(stats.withdrawn, currency)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <span className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <History className="w-6 h-6" />
            </span>
            <p className="text-sm text-[#64748b] mt-3">No activity yet. Make your first deposit to get going.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setFundsMode('deposit')}
            >
              Add funds
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-2">
            {sortedLogs.map((log) => {
              const isWithdrawal = log.type === 'withdrawal';
              return (
                <li key={log.id} className="flex items-center gap-3 px-2 py-3">
                  <span
                    className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${
                      isWithdrawal ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                    aria-hidden
                  >
                    {isWithdrawal ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0b3b2e] truncate">
                      {log.note || (isWithdrawal ? 'Withdrawal' : 'Deposit')}
                    </p>
                    <p
                      className="text-xs text-[#64748b]"
                      title={formatDate(log.createdAt, 'MMM d, yyyy h:mm a')}
                    >
                      {isWithdrawal ? 'Withdrawal' : 'Deposit'} · {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                      isWithdrawal ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {isWithdrawal ? '−' : '+'}
                    {formatCurrency(log.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Deposit / withdraw */}
      <Sheet
        isOpen={fundsMode !== null}
        onClose={() => setFundsMode(null)}
        title={fundsMode === 'withdraw' ? 'Withdraw funds' : 'Add funds'}
        description={goal.name}
      >
        {fundsMode && (
          <AddFundsForm
            key={fundsMode}
            goal={goal}
            currency={currency}
            defaultMode={fundsMode}
            onSubmit={async (amount, note) => {
              await addFunds(amount, note);
              setFundsMode(null);
            }}
            onCancel={() => setFundsMode(null)}
          />
        )}
      </Sheet>

      {/* Edit */}
      <Sheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit goal" description={goal.name}>
        {editOpen && (
          <GoalForm
            initialData={goal}
            currency={currency}
            onSubmit={async ({ name, category, emoji, target }) => {
              await updateGoal({ name, category, emoji, target });
              setEditOpen(false);
            }}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Sheet>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete goal?"
        message={`"${goal.name}" and its ${logs.length} activity entr${logs.length === 1 ? 'y' : 'ies'} will be permanently deleted. This can't be undone.`}
        confirmText="Delete Goal"
        loading={deleting}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-[#0b3b2e]';
  return (
    <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 sm:p-3 min-w-0">
      <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-[#64748b]">
        {label}
      </span>
      <span className={`block mt-0.5 text-sm sm:text-base font-semibold tabular-nums truncate ${color}`}>{value}</span>
    </div>
  );
}

function GoalDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading goal">
      <Skeleton className="h-5 w-32" />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 !rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-2.5 w-full !rounded-full" />
          </div>
          <Skeleton className="w-40 h-40 !rounded-full mx-auto md:mx-0" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
