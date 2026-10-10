'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Goal } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Progress } from '../ui/Progress';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useSwipeToDelete } from '@/hooks/useSwipeToDelete';
import { Plus, ChevronRight, Trash2, Pencil, CheckCircle2 } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  currency?: string;
  onAddFunds: (goal: Goal) => void;
  onDelete: (id: string) => void | Promise<void>;
  /** Optional: shows an edit button when provided. */
  onEdit?: (goal: Goal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currency = 'INR',
  onAddFunds,
  onDelete,
  onEdit,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { dragProps } = useSwipeToDelete({
    onDelete: () => setShowConfirm(true),
    threshold: 80,
  });

  const percentage = goal.target > 0 ? Math.min(Math.round((goal.saved / goal.target) * 100), 100) : 0;
  const isCompleted = goal.target > 0 && goal.saved >= goal.target;
  const isNotStarted = goal.saved <= 0;
  const remaining = Math.max(goal.target - goal.saved, 0);

  let statusText = 'In progress';
  let statusVariant: 'gray' | 'emerald' | 'green' = 'emerald';
  if (isCompleted) {
    statusText = 'Completed';
    statusVariant = 'green';
  } else if (isNotStarted) {
    statusText = 'Not started';
    statusVariant = 'gray';
  }

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(goal.id);
      setShowConfirm(false);
    } catch {
      // hook already surfaces a toast; keep the dialog open
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl select-none group">
        {/* Swipe-to-delete zone */}
        <div className="absolute inset-y-0 right-0 w-28 bg-red-500 rounded-r-2xl flex items-center justify-end pr-6 text-white z-0">
          <Trash2 className="w-5 h-5" />
        </div>

        <div
          {...dragProps}
          className="relative z-10 bg-white rounded-2xl shadow-card border border-slate-100 p-4 sm:p-5 hover:shadow-card-hover transition-shadow"
          style={dragProps.style}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <span
              className={`w-12 h-12 flex-shrink-0 rounded-2xl border flex items-center justify-center text-2xl ${
                isCompleted ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-50 border-emerald-100'
              }`}
            >
              {goal.emoji || '🎯'}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/goals/${goal.id}`}
                className="block font-semibold text-sm text-[#0b3b2e] leading-snug truncate hover:text-emerald-700 focus:outline-none focus-visible:underline"
              >
                {goal.name}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[11px] font-medium text-[#64748b]">{goal.category}</span>
                <span className="text-slate-300" aria-hidden>
                  &middot;
                </span>
                <Badge
                  variant={statusVariant}
                  size="sm"
                  icon={isCompleted ? <CheckCircle2 className="w-3 h-3" /> : undefined}
                >
                  {statusText}
                </Badge>
              </div>
            </div>
            <span
              className={`text-base sm:text-lg font-bold tabular-nums ${isCompleted ? 'text-emerald-600' : 'text-[#0b3b2e]'}`}
            >
              {percentage}%
            </span>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <Progress value={percentage} max={100} variant="emerald" height="md" />
            <div className="mt-2 flex items-baseline justify-between gap-2 text-xs tabular-nums">
              <span>
                <span className="font-semibold text-[#0b3b2e]">{formatCurrency(goal.saved, currency)}</span>
                <span className="text-[#64748b]"> of {formatCurrency(goal.target, currency)}</span>
              </span>
              <span className="text-[#64748b] truncate">
                {isCompleted ? 'Goal reached' : `${formatCurrency(remaining, currency)} to go`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onAddFunds(goal)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold hover:bg-emerald-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Add funds
            </button>

            <div className="flex items-center gap-1">
              {onEdit && (
                <IconButton variant="ghost" size="md" label={`Edit ${goal.name}`} onClick={() => onEdit(goal)}>
                  <Pencil className="w-4 h-4" />
                </IconButton>
              )}
              <IconButton
                variant="ghost"
                size="md"
                label={`Delete ${goal.name}`}
                onClick={() => setShowConfirm(true)}
                className="hover:!bg-red-50 hover:!text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </IconButton>
              <Link
                href={`/goals/${goal.id}`}
                aria-label={`View ${goal.name} details`}
                title="View details"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => !deleting && setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete goal?"
        itemName={goal.name}
        confirmText="Delete Goal"
        loading={deleting}
      />
    </>
  );
};
