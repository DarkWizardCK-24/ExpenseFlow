'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Goal } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { getCurrencyMeta } from '@/lib/format';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

const goalSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['Travel', 'Gadget', 'Safety', 'Education', 'Home', 'Vehicle', 'Other']),
  emoji: z.string().min(1, 'Please select an emoji'),
  target: z.coerce.number().positive('Target must be greater than 0'),
  startingAmount: z.coerce.number().min(0, 'Starting amount cannot be negative'),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  onSubmit: (data: {
    name: string;
    category: Goal['category'];
    emoji: string;
    target: number;
    startingAmount: number;
  }) => Promise<unknown>;
  onCancel: () => void;
  /** When provided the form is in edit mode: fields are prefilled and "starting amount" is hidden. */
  initialData?: Goal | null;
  /** Currency code for the amount prefix. Falls back to the user's profile currency. */
  currency?: string;
}

const CATEGORY_DATA: Record<Goal['category'], { emoji: string; label: string }> = {
  Travel: { emoji: '✈️', label: 'Travel' },
  Gadget: { emoji: '💻', label: 'Gadgets' },
  Safety: { emoji: '🛡️', label: 'Emergency' },
  Education: { emoji: '🎓', label: 'Education' },
  Home: { emoji: '🏡', label: 'Home' },
  Vehicle: { emoji: '🚗', label: 'Vehicle' },
  Other: { emoji: '🎯', label: 'Other' },
};

const EMOJI_CHOICES = ['🎯', '✈️', '🗾', '🏝️', '💻', '📱', '🛡️', '🎓', '🏡', '🚗', '🏍️', '💍', '🎸', '👶', '🐶', '💰'];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">{children}</span>
);

const AMOUNT_INPUT_CLASS =
  'w-full bg-transparent font-black tracking-tight text-[#0b3b2e] placeholder-slate-300 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, onCancel, initialData, currency }) => {
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();
  const isEdit = Boolean(initialData);
  const currencySymbol = getCurrencyMeta(currency || userProfile?.currency || 'INR').symbol.trim();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'Travel',
      emoji: initialData?.emoji || '✈️',
      target: initialData?.target || ('' as unknown as number),
      startingAmount: 0,
    },
  });

  const selectedCategory = watch('category');
  const selectedEmoji = watch('emoji');

  const onCategoryChange = (cat: Goal['category']) => {
    const prevDefault = CATEGORY_DATA[selectedCategory].emoji;
    setValue('category', cat, { shouldDirty: true });
    // Only swap the emoji if the user hasn't picked a custom one.
    if (selectedEmoji === prevDefault || !selectedEmoji) {
      setValue('emoji', CATEGORY_DATA[cat].emoji, { shouldDirty: true });
    }
  };

  const onFormSubmit = async (data: GoalFormData) => {
    setSubmitting(true);
    try {
      await onSubmit({
        name: data.name.trim(),
        category: data.category,
        emoji: data.emoji,
        target: Number(data.target),
        startingAmount: isEdit ? 0 : Number(data.startingAmount) || 0,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Hero: emoji + target amount */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 flex-shrink-0 rounded-2xl bg-white border border-emerald-100 shadow-xs flex items-center justify-center text-3xl">
            {selectedEmoji || '🎯'}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
              Target amount
            </span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-emerald-600">{currencySymbol}</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="50,000"
                autoFocus={!isEdit}
                aria-label="Target amount"
                {...register('target')}
                className={`${AMOUNT_INPUT_CLASS} text-3xl`}
                style={{ colorScheme: 'light' }}
              />
            </div>
          </div>
        </div>
        {errors.target && <p className="text-xs font-medium text-red-500 mt-2">{errors.target.message}</p>}

        {/* Emoji quick-picks */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="group" aria-label="Goal emoji">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Use ${e} emoji`}
              aria-pressed={selectedEmoji === e}
              onClick={() => setValue('emoji', e, { shouldDirty: true, shouldValidate: true })}
              className={`w-9 h-9 flex-shrink-0 rounded-xl border text-lg flex items-center justify-center transition-all ${
                selectedEmoji === e
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/15'
                  : 'bg-white/60 border-transparent hover:border-emerald-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <Input
        label="Goal name"
        placeholder="e.g. Europe trip, New laptop, Down payment"
        {...register('name')}
        error={errors.name?.message}
      />

      {/* Category */}
      <div className="space-y-2">
        <SectionLabel>Category</SectionLabel>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {(Object.keys(CATEGORY_DATA) as Goal['category'][]).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(cat)}
                className={`relative flex flex-col items-center gap-1 px-1.5 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/15'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-base">
                  {CATEGORY_DATA[cat].emoji}
                </span>
                <span className="w-full truncate text-center">{CATEGORY_DATA[cat].label}</span>
                {isSelected && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Starting amount (create only) */}
      {!isEdit && (
        <Input
          label="Already saved (optional)"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="0"
          icon={<span className="text-sm font-bold">{currencySymbol}</span>}
          helperText="We'll log this as your starting balance."
          {...register('startingAmount')}
          error={errors.startingAmount?.message}
        />
      )}

      {/* Actions */}
      <div className="sticky -bottom-5 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-emerald-100/80 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          loadingText={isEdit ? 'Updating...' : 'Creating...'}
          icon={<Check className="w-4 h-4" />}
        >
          {isEdit ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
};
