'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Goal } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, getCurrencyMeta } from '@/lib/format';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';

const fundsSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  note: z.string().optional(),
});

type FundsFormData = z.infer<typeof fundsSchema>;

export type FundsMode = 'deposit' | 'withdraw';

interface AddFundsFormProps {
  goal: Goal;
  /** Called with a positive amount for deposits and a negative amount for withdrawals. */
  onSubmit: (amount: number, note?: string) => Promise<unknown>;
  onCancel: () => void;
  /** Initial mode of the deposit/withdraw toggle. Defaults to 'deposit'. */
  defaultMode?: FundsMode;
  /** Currency code; falls back to the user's profile currency. */
  currency?: string;
}

export const AddFundsForm: React.FC<AddFundsFormProps> = ({
  goal,
  onSubmit,
  onCancel,
  defaultMode = 'deposit',
  currency,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();
  const currencyCode = currency || userProfile?.currency || 'INR';
  const currencySymbol = getCurrencyMeta(currencyCode).symbol.trim();

  const canWithdraw = goal.saved > 0;
  const [mode, setMode] = useState<FundsMode>(defaultMode === 'withdraw' && canWithdraw ? 'withdraw' : 'deposit');
  const isWithdraw = mode === 'withdraw';
  const remaining = Math.max(goal.target - goal.saved, 0);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<FundsFormData>({
    resolver: zodResolver(fundsSchema),
    defaultValues: {
      amount: '' as unknown as number,
      note: '',
    },
  });

  const currentAmount = Number(watch('amount')) || 0;

  const switchMode = (next: FundsMode) => {
    setMode(next);
    clearErrors('amount');
  };

  const quickPicks: { label: string; value: number }[] = isWithdraw
    ? [
        ...(goal.saved >= 1000 ? [{ label: formatCurrency(1000, currencyCode), value: 1000 }] : []),
        ...(goal.saved >= 2 ? [{ label: 'Half', value: Math.round((goal.saved / 2) * 100) / 100 }] : []),
        { label: 'All', value: goal.saved },
      ]
    : [
        { label: formatCurrency(500, currencyCode), value: 500 },
        { label: formatCurrency(1000, currencyCode), value: 1000 },
        { label: formatCurrency(5000, currencyCode), value: 5000 },
        ...(remaining > 0 ? [{ label: 'Complete goal', value: remaining }] : []),
      ];

  const onFormSubmit = async (data: FundsFormData) => {
    const amount = Number(data.amount);
    if (isWithdraw && amount > goal.saved) {
      setError('amount', {
        type: 'max',
        message: `You can withdraw at most ${formatCurrency(goal.saved, currencyCode)}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const note = data.note?.trim() || (isWithdraw ? 'Withdrawal' : 'Deposit');
      await onSubmit(isWithdraw ? -amount : amount, note);
    } finally {
      setSubmitting(false);
    }
  };

  const projected = isWithdraw ? goal.saved - currentAmount : goal.saved + currentAmount;
  const overdraw = isWithdraw && currentAmount > goal.saved;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Hero card — tinted by mode */}
      <div
        className={`rounded-2xl border p-4 transition-colors duration-300 ${
          isWithdraw
            ? 'bg-gradient-to-br from-amber-50 to-white border-amber-100'
            : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-xs flex items-center justify-center text-xl flex-shrink-0">
            {goal.emoji || '🎯'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0b3b2e] truncate">{goal.name}</p>
            <p className="text-xs text-[#64748b] tabular-nums">
              {formatCurrency(goal.saved, currencyCode)} saved of {formatCurrency(goal.target, currencyCode)}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-xl border border-slate-100 shadow-xs">
          <button
            type="button"
            aria-pressed={!isWithdraw}
            onClick={() => switchMode('deposit')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              !isWithdraw ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#64748b] hover:text-[#0b3b2e]'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Deposit
          </button>
          <button
            type="button"
            aria-pressed={isWithdraw}
            disabled={!canWithdraw}
            title={canWithdraw ? undefined : 'Nothing saved yet to withdraw'}
            onClick={() => switchMode('withdraw')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isWithdraw ? 'bg-amber-500 text-white shadow-sm' : 'text-[#64748b] hover:text-[#0b3b2e]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdraw
          </button>
        </div>

        {/* Amount */}
        <div className="mt-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
            {isWithdraw ? 'How much are you taking out?' : 'How much are you adding?'}
          </span>
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className={`text-2xl font-bold ${isWithdraw ? 'text-amber-600' : 'text-emerald-600'}`}>
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              max={isWithdraw ? goal.saved : undefined}
              placeholder="0"
              autoFocus
              aria-label="Amount"
              {...register('amount')}
              className="w-full max-w-[220px] bg-transparent text-center text-4xl font-black tracking-tight tabular-nums text-[#0b3b2e] placeholder-slate-300 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ colorScheme: 'light' }}
            />
          </div>
          {errors.amount ? (
            <p className="text-xs font-medium text-red-500 mt-1">{errors.amount.message}</p>
          ) : overdraw ? (
            <p className="text-xs font-medium text-red-500 mt-1">
              Only {formatCurrency(goal.saved, currencyCode)} available
            </p>
          ) : currentAmount > 0 ? (
            <p className="text-xs text-[#64748b] mt-1 tabular-nums">
              New balance: <span className="font-semibold text-[#0b3b2e]">{formatCurrency(projected, currencyCode)}</span>
            </p>
          ) : null}
        </div>

        {/* Quick picks */}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {quickPicks.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue('amount', p.value, { shouldValidate: true, shouldDirty: true })}
              className={`h-8 px-3 rounded-full border text-[11px] font-bold bg-white transition-colors ${
                currentAmount === p.value
                  ? isWithdraw
                    ? 'border-amber-400 text-amber-700'
                    : 'border-emerald-500 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Note (optional)"
        placeholder={isWithdraw ? 'e.g. Booked flights, Emergency repair' : 'e.g. Monthly savings, Bonus'}
        {...register('note')}
      />

      <div className="sticky -bottom-5 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-emerald-100/80 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={overdraw}
          loading={submitting}
          loadingText={isWithdraw ? 'Withdrawing...' : 'Adding...'}
          icon={<Check className="w-4 h-4" />}
        >
          {isWithdraw ? 'Withdraw Funds' : 'Add Funds'}
        </Button>
      </div>
    </form>
  );
};
