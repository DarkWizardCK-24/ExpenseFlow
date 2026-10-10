'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, subDays } from 'date-fns';
import { Transaction, Category, PaymentMethod } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { getCurrencyMeta } from '@/lib/format';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  CreditCard,
  Banknote,
  Landmark,
  CalendarDays,
  Check,
  type LucideIcon,
} from 'lucide-react';

const expenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, 'Please select a category'),
  date: z.string().min(1, 'Please select a date'),
  paymentMethod: z.enum(['UPI', 'Card', 'Cash', 'Bank']),
  note: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  initialData?: Transaction | null;
  categories: Category[];
  prefilledDate?: string;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  onOpenAddCategory?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; icon: LucideIcon }[] = [
  { value: 'UPI', icon: Smartphone },
  { value: 'Card', icon: CreditCard },
  { value: 'Cash', icon: Banknote },
  { value: 'Bank', icon: Landmark },
];

const toDateString = (d: Date) => format(d, 'yyyy-MM-dd');

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
    {children}
  </label>
);

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  initialData,
  categories,
  prefilledDate,
  onSubmit,
  onCancel,
  onOpenAddCategory,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();
  const currencySymbol = getCurrencyMeta(userProfile?.currency || 'INR').symbol.trim();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: initialData?.title || '',
      amount: initialData?.amount || ('' as unknown as number),
      type: initialData?.type || 'expense',
      categoryId: initialData?.categoryId || (categories[0]?.id || 'food'),
      date: initialData?.date || prefilledDate || toDateString(new Date()),
      paymentMethod: initialData?.paymentMethod || 'UPI',
      note: initialData?.note || '',
    },
  });

  const currentType = watch('type');
  const currentCategory = watch('categoryId');
  const currentMethod = watch('paymentMethod');
  const currentDate = watch('date');
  const isExpense = currentType === 'expense';

  const today = toDateString(new Date());
  const yesterday = toDateString(subDays(new Date(), 1));

  const onFormSubmit = async (data: ExpenseFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  const select = (field: 'type' | 'categoryId' | 'paymentMethod' | 'date', value: string) =>
    setValue(field, value as never, { shouldValidate: true, shouldDirty: true });

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Amount hero card — tinted by transaction type */}
      <div
        className={`rounded-2xl border p-4 transition-colors duration-300 ${
          isExpense
            ? 'bg-gradient-to-br from-rose-50 to-white border-rose-100'
            : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'
        }`}
      >
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-xl border border-slate-100 shadow-xs">
          {(
            [
              { value: 'expense', label: 'Expense', icon: ArrowUpRight, active: 'bg-rose-500 text-white shadow-sm' },
              { value: 'income', label: 'Income', icon: ArrowDownLeft, active: 'bg-emerald-600 text-white shadow-sm' },
            ] as const
          ).map(({ value, label, icon: Icon, active }) => (
            <button
              key={value}
              type="button"
              aria-pressed={currentType === value}
              onClick={() => select('type', value)}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                currentType === value ? active : 'text-[#64748b] hover:text-[#0b3b2e]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="mt-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
            {isExpense ? 'How much did you spend?' : 'How much did you receive?'}
          </span>
          <div className="mt-1 flex items-center justify-center gap-1">
            <span
              className={`text-2xl font-bold ${isExpense ? 'text-rose-500' : 'text-emerald-600'}`}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0"
              autoFocus={!initialData}
              aria-label="Amount"
              {...register('amount')}
              className="w-full max-w-[220px] bg-transparent text-center text-4xl font-black tracking-tight text-[#0b3b2e] placeholder-slate-300 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ colorScheme: 'light' }}
            />
          </div>
          {errors.amount && (
            <p className="text-xs font-medium text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <Input
        label={isExpense ? 'Title / Merchant' : 'Title / Source'}
        placeholder={isExpense ? 'e.g. Grocery store, Netflix, Uber' : 'e.g. Salary, Freelance, Refund'}
        {...register('title')}
        error={errors.title?.message}
      />

      {/* Category */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Category</SectionLabel>
          {onOpenAddCategory && (
            <button
              type="button"
              onClick={onOpenAddCategory}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto no-scrollbar p-0.5">
          {categories.map((cat) => {
            const isSelected = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => select('categoryId', cat.id)}
                className={`relative flex flex-col items-center gap-1 px-1.5 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/15'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: `${cat.color}1f` }}
                >
                  {cat.emoji}
                </span>
                <span className="w-full truncate text-center">{cat.name}</span>
                {isSelected && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {errors.categoryId && (
          <p className="text-xs font-medium text-red-500">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Date with quick picks */}
      <div className="space-y-2">
        <SectionLabel>Date</SectionLabel>
        <div className="flex items-center gap-2">
          {[
            { label: 'Today', value: today },
            { label: 'Yesterday', value: yesterday },
          ].map(({ label, value }) => (
            <button
              key={label}
              type="button"
              aria-pressed={currentDate === value}
              onClick={() => select('date', value)}
              className={`h-11 px-3.5 rounded-xl border text-xs font-bold transition-all ${
                currentDate === value
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1 min-w-0">
            <Input
              type="date"
              aria-label="Pick a date"
              icon={<CalendarDays className="w-4 h-4" />}
              {...register('date')}
            />
          </div>
        </div>
        {errors.date && <p className="text-xs font-medium text-red-500">{errors.date.message}</p>}
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <SectionLabel>Payment Method</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(({ value, icon: Icon }) => {
            const isSelected = currentMethod === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => select('paymentMethod', value)}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Note */}
      <Input
        label="Note (Optional)"
        placeholder="Add details, tags, receipt info..."
        {...register('note')}
      />

      {/* Actions — pinned to the bottom of the sheet while scrolling */}
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
          {initialData ? 'Update' : 'Save'} {isExpense ? 'Expense' : 'Income'}
        </Button>
      </div>
    </form>
  );
};
