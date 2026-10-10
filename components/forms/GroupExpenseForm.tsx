'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SplitGroup, SplitType, Category, GroupExpense } from '@/types';
import { calculateSplits } from '@/lib/balances';
import { formatCurrency, getCurrencyMeta } from '@/lib/format';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Check } from 'lucide-react';

const groupExpenseSchema = z.object({
  title: z.string().trim().min(2, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  categoryId: z.string().min(1, 'Category is required'),
  paidBy: z.string().min(1, 'Select who paid'),
  splitType: z.enum(['equal', 'exact', 'percentage', 'shares']),
});

type FormData = z.infer<typeof groupExpenseSchema>;

interface GroupExpenseFormProps {
  group: SplitGroup;
  categories: Category[];
  currency?: string;
  /** When provided, the form is prefilled for editing. */
  initialData?: GroupExpense | null;
  onSubmit: (data: {
    title: string;
    amount: number;
    categoryId: string;
    paidBy: string;
    splitType: SplitType;
    splits: Record<string, number>;
  }) => Promise<unknown>;
  onCancel: () => void;
}

const SPLIT_TYPES: { value: SplitType; label: string; hint: string }[] = [
  { value: 'equal', label: 'Equally', hint: 'Everyone selected pays the same' },
  { value: 'exact', label: 'Exact', hint: 'Enter each person’s amount' },
  { value: 'percentage', label: '%', hint: 'Percentages must add up to 100' },
  { value: 'shares', label: 'Shares', hint: 'Split by ratio, e.g. 2 : 1 : 1' },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const shortName = (name: string) => name.replace(/\s*\(You\)\s*$/, '');

/** Rebuilds the per-member inputs (exact / % / shares) from a saved expense. */
function inputsFromExpense(exp: GroupExpense, memberIds: string[]): Record<string, number> {
  const entries = Object.entries(exp.splits || {}).filter(
    ([id, v]) => memberIds.includes(id) && v > 0
  );
  if (exp.splitType === 'exact') return Object.fromEntries(entries);
  if (exp.splitType === 'percentage' && exp.amount > 0) {
    return Object.fromEntries(entries.map(([id, v]) => [id, round2((v / exp.amount) * 100)]));
  }
  if (exp.splitType === 'shares' && entries.length) {
    const min = Math.min(...entries.map(([, v]) => v));
    return Object.fromEntries(entries.map(([id, v]) => [id, Math.max(1, Math.round(v / min))]));
  }
  return {};
}

export const GroupExpenseForm: React.FC<GroupExpenseFormProps> = ({
  group,
  categories,
  currency = 'USD',
  initialData,
  onSubmit,
  onCancel,
}) => {
  const isEdit = Boolean(initialData);
  const memberIds = group.members.map((m) => m.id);
  const currencySymbol = getCurrencyMeta(currency).symbol.trim();

  const [submitting, setSubmitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitInputs, setSplitInputs] = useState<Record<string, number>>(() =>
    initialData ? inputsFromExpense(initialData, memberIds) : {}
  );
  const [activeMembers, setActiveMembers] = useState<string[]>(() => {
    if (initialData) {
      const included = memberIds.filter((id) => (initialData.splits?.[id] ?? 0) > 0);
      if (included.length) return included;
    }
    return memberIds;
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(groupExpenseSchema),
    defaultValues: {
      title: initialData?.title || '',
      amount: initialData?.amount || ('' as unknown as number),
      categoryId: initialData?.categoryId || categories[0]?.id || 'food',
      paidBy:
        (initialData && memberIds.includes(initialData.paidBy) ? initialData.paidBy : '') ||
        group.members.find((m) => m.uid)?.id ||
        group.members[0]?.id ||
        '',
      splitType: initialData?.splitType || 'equal',
    },
  });

  const amount = Number(watch('amount')) || 0;
  const splitType = watch('splitType');
  const paidBy = watch('paidBy');
  const categoryId = watch('categoryId');

  const select = (field: 'categoryId' | 'paidBy' | 'splitType', value: string) => {
    setValue(field, value as never, { shouldValidate: true, shouldDirty: true });
    setSplitError(null);
  };

  const toggleMember = (memberId: string) => {
    setSplitError(null);
    setActiveMembers((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length <= 1) return prev; // at least one person must share
        return prev.filter((id) => id !== memberId);
      }
      // keep group order
      return memberIds.filter((id) => id === memberId || prev.includes(id));
    });
  };

  const setInput = (memberId: string, value: number) => {
    setSplitError(null);
    setSplitInputs((prev) => ({ ...prev, [memberId]: value }));
  };

  const calculatedSplits = calculateSplits(amount, activeMembers, splitType, splitInputs);

  // Validation feedback for exact / percentage modes
  const inputTotal = round2(activeMembers.reduce((s, id) => s + (splitInputs[id] || 0), 0));
  let remainder: { text: string; ok: boolean } | null = null;
  if (splitType === 'exact') {
    const left = round2(amount - inputTotal);
    remainder = {
      ok: Math.abs(left) < 0.01,
      text:
        Math.abs(left) < 0.01
          ? 'Amounts add up'
          : left > 0
          ? `${formatCurrency(left, currency)} left to assign`
          : `${formatCurrency(-left, currency)} over the total`,
    };
  } else if (splitType === 'percentage') {
    const left = round2(100 - inputTotal);
    remainder = {
      ok: Math.abs(left) < 0.01,
      text: Math.abs(left) < 0.01 ? 'Adds up to 100%' : left > 0 ? `${left}% left` : `${-left}% over`,
    };
  }

  const onFormSubmit = async (data: FormData) => {
    if (remainder && !remainder.ok) {
      setSplitError(
        splitType === 'exact'
          ? 'The split amounts must add up to the total bill.'
          : 'Percentages must add up to 100%.'
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: data.title.trim(),
        amount: Number(data.amount),
        categoryId: data.categoryId,
        paidBy: data.paidBy,
        splitType: data.splitType,
        splits: calculateSplits(Number(data.amount), activeMembers, data.splitType, splitInputs),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const numberInputClass =
    'h-9 px-2 text-right bg-[#f0fdf4] border border-[#a7f3d0] rounded-lg text-sm tabular-nums focus:bg-white focus:border-[#10b981] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Amount hero */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
          Total bill
        </span>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className="text-2xl font-semibold text-emerald-600">{currencySymbol}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            autoFocus={!isEdit}
            aria-label="Total bill amount"
            {...register('amount')}
            className="w-full max-w-[220px] bg-transparent text-center text-3xl sm:text-4xl font-bold tracking-tight text-[#0b3b2e] placeholder-slate-300 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{ colorScheme: 'light' }}
          />
        </div>
        {errors.amount && (
          <p className="text-xs font-medium text-red-500 mt-1">{errors.amount.message}</p>
        )}
        {amount > 0 && splitType === 'equal' && (
          <p className="text-xs text-[#64748b] mt-1 tabular-nums">
            {formatCurrency(round2(amount / activeMembers.length), currency)} each ·{' '}
            {activeMembers.length} {activeMembers.length === 1 ? 'person' : 'people'}
          </p>
        )}
      </div>

      <Input
        label="What was it for?"
        placeholder="e.g. Dinner, Airbnb, Cab to airport"
        {...register('title')}
        error={errors.title?.message}
      />

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Category
          </span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => select('categoryId', cat.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 h-9 pl-1.5 pr-3 rounded-full border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/15'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-200'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${cat.color}1f` }}
                  >
                    {cat.emoji}
                  </span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid by */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Paid by
        </span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" role="radiogroup" aria-label="Paid by">
          {group.members.map((m) => {
            const isSelected = paidBy === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => select('paidBy', m.id)}
                className={`flex-shrink-0 inline-flex items-center gap-2 h-10 pl-1 pr-3 rounded-full border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                <Avatar
                  name={shortName(m.name)}
                  size="sm"
                  className="!w-8 !h-8 !rounded-full !shadow-none !border-0"
                />
                <span className="max-w-[110px] truncate">{m.uid ? 'You' : m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split method */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
          Split
        </span>
        <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          {SPLIT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={splitType === t.value}
              onClick={() => select('splitType', t.value)}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                splitType === t.value
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-100'
                  : 'text-[#64748b] hover:text-[#0b3b2e]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#64748b]">
          {SPLIT_TYPES.find((t) => t.value === splitType)?.hint}
        </p>
      </div>

      {/* Allocation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
            Between
          </span>
          {remainder && amount > 0 && (
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                remainder.ok ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {remainder.text}
            </span>
          )}
        </div>
        <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {group.members.map((member) => {
            const included = activeMembers.includes(member.id);
            const share = calculatedSplits[member.id] || 0;
            return (
              <li
                key={member.id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  included ? 'bg-white' : 'bg-slate-50/70'
                }`}
              >
                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleMember(member.id)}
                    className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                  />
                  <span
                    className={`text-sm font-medium truncate ${
                      included ? 'text-[#0b3b2e]' : 'text-slate-400 line-through'
                    }`}
                  >
                    {member.name}
                  </span>
                </label>

                {included && splitType === 'exact' && (
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0"
                    aria-label={`Amount for ${member.name}`}
                    value={splitInputs[member.id] ?? ''}
                    onChange={(e) => setInput(member.id, parseFloat(e.target.value) || 0)}
                    className={`w-24 ${numberInputClass}`}
                  />
                )}
                {included && splitType === 'percentage' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0"
                      aria-label={`Percentage for ${member.name}`}
                      value={splitInputs[member.id] ?? ''}
                      onChange={(e) => setInput(member.id, parseFloat(e.target.value) || 0)}
                      className={`w-16 ${numberInputClass}`}
                    />
                    <span className="text-xs text-[#64748b]">%</span>
                  </div>
                )}
                {included && splitType === 'shares' && (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="1"
                    aria-label={`Shares for ${member.name}`}
                    value={splitInputs[member.id] ?? 1}
                    onChange={(e) => setInput(member.id, parseInt(e.target.value) || 1)}
                    className={`w-14 ${numberInputClass}`}
                  />
                )}

                {splitType !== 'exact' && (
                  <span
                    className={`w-20 text-right text-sm font-bold tabular-nums ${
                      included ? 'text-[#0b3b2e]' : 'text-slate-300'
                    }`}
                  >
                    {formatCurrency(included ? share : 0, currency)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {splitError && <p className="text-xs font-medium text-red-500">{splitError}</p>}
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
          loadingText="Saving..."
          icon={<Check className="w-4 h-4" />}
        >
          {isEdit ? 'Update expense' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
};
