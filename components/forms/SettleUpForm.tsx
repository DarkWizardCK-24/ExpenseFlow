'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SplitGroup, DebtSimplification } from '@/types';
import { formatCurrency, getCurrencyMeta } from '@/lib/format';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { ArrowRight, ArrowLeftRight, Check, Sparkles } from 'lucide-react';

const settleSchema = z
  .object({
    from: z.string().min(1, 'Select who paid'),
    to: z.string().min(1, 'Select who received'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
  })
  .refine((d) => d.from !== d.to, { message: 'Payer and receiver must be different', path: ['to'] });

type SettleFormData = z.infer<typeof settleSchema>;

interface SettleUpFormProps {
  group: SplitGroup;
  suggestions?: DebtSimplification[];
  currency?: string;
  /** Prefill with a specific debt (defaults to the first suggestion). */
  initial?: DebtSimplification | null;
  onSubmit: (from: string, to: string, amount: number) => Promise<unknown>;
  onCancel: () => void;
}

const shortName = (name: string) => name.replace(/\s*\(You\)\s*$/, '');

export const SettleUpForm: React.FC<SettleUpFormProps> = ({
  group,
  suggestions = [],
  currency = 'USD',
  initial,
  onSubmit,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const currencySymbol = getCurrencyMeta(currency).symbol.trim();
  const start = initial || suggestions[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettleFormData>({
    resolver: zodResolver(settleSchema),
    defaultValues: {
      from: start?.from || group.members[0]?.id || '',
      to: start?.to || group.members[1]?.id || '',
      amount: start?.amount || ('' as unknown as number),
    },
  });

  const from = watch('from');
  const to = watch('to');
  const amount = Number(watch('amount')) || 0;
  const nameOf = (id: string) => {
    const m = group.members.find((x) => x.id === id);
    return m ? (m.uid ? 'You' : m.name) : 'Member';
  };

  const set = (field: 'from' | 'to' | 'amount', value: string | number) =>
    setValue(field, value as never, { shouldValidate: true, shouldDirty: true });

  const applySuggestion = (s: DebtSimplification) => {
    set('from', s.from);
    set('to', s.to);
    set('amount', s.amount);
  };

  const swap = () => {
    const f = from;
    set('from', to);
    set('to', f);
  };

  const onFormSubmit = async (data: SettleFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data.from, data.to, Number(data.amount));
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass =
    'w-full h-11 pl-3 pr-8 bg-white text-[#0b3b2e] rounded-xl border border-slate-200 text-sm font-semibold focus:border-[#10b981] focus:outline-none focus:ring-4 focus:ring-emerald-400/20';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Hero: from → to + amount */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1 min-w-0 w-24">
            <Avatar name={shortName(group.members.find((m) => m.id === from)?.name || '?')} size="md" className="!rounded-full" />
            <span className="text-xs font-semibold text-[#0b3b2e] truncate max-w-full">{nameOf(from)}</span>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div className="flex flex-col items-center gap-1 min-w-0 w-24">
            <Avatar name={shortName(group.members.find((m) => m.id === to)?.name || '?')} size="md" className="!rounded-full" />
            <span className="text-xs font-semibold text-[#0b3b2e] truncate max-w-full">{nameOf(to)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-emerald-600">{currencySymbol}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            aria-label="Settlement amount"
            {...register('amount')}
            className="w-full max-w-[200px] bg-transparent text-center text-3xl sm:text-4xl font-bold tracking-tight text-[#0b3b2e] placeholder-slate-300 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{ colorScheme: 'light' }}
          />
        </div>
        {errors.amount && (
          <p className="text-xs font-medium text-red-500 text-center mt-1">{errors.amount.message}</p>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-950">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Suggested
          </span>
          <div className="space-y-1.5">
            {suggestions.map((s) => {
              const active = s.from === from && s.to === to && Math.abs(s.amount - amount) < 0.01;
              return (
                <button
                  key={`${s.from}-${s.to}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applySuggestion(s)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    active
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/15'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 font-medium text-[#0b3b2e]">
                    <span className="truncate">{nameOf(s.from)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{nameOf(s.to)}</span>
                  </span>
                  <span className="font-bold tabular-nums text-emerald-700 flex-shrink-0">
                    {formatCurrency(s.amount, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual pickers */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Or record a custom payment
        </span>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block min-w-0">
            <span className="block text-[11px] text-[#64748b] mb-1">Paid by</span>
            <select {...register('from')} className={selectClass} style={{ colorScheme: 'light' }}>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap payer and receiver"
            className="h-11 w-10 rounded-xl border border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 flex items-center justify-center"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <label className="block min-w-0">
            <span className="block text-[11px] text-[#64748b] mb-1">Paid to</span>
            <select {...register('to')} className={selectClass} style={{ colorScheme: 'light' }}>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {errors.to && <p className="text-xs font-medium text-red-500">{errors.to.message}</p>}
      </div>

      {/* Actions */}
      <div className="sticky -bottom-5 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-emerald-100/80 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          loadingText="Recording..."
          icon={<Check className="w-4 h-4" />}
        >
          Record payment
        </Button>
      </div>
    </form>
  );
};
