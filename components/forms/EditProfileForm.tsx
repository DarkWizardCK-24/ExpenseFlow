'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, Phone, User } from 'lucide-react';
import { UserProfile } from '@/types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SUPPORTED_CURRENCIES, getCurrencyMeta, formatCurrency } from '@/lib/format';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  monthlyBudget: z.coerce.number().positive('Budget must be positive'),
  currency: z.string().min(1, 'Select a currency'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  userProfile: UserProfile | null;
  onSubmit: (data: Partial<UserProfile>) => Promise<unknown>;
  onCancel: () => void;
}

const BUDGET_PRESETS = [10000, 25000, 50000, 100000];

const SectionLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-medium text-emerald-950">
    {children}
  </label>
);

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ userProfile, onSubmit, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile?.name || '',
      phone: userProfile?.phone || '',
      monthlyBudget: userProfile?.monthlyBudget || 50000,
      currency: userProfile?.currency || 'INR',
    },
  });

  const selectedCurrency = watch('currency');
  const currentBudget = Number(watch('monthlyBudget'));
  const symbol = getCurrencyMeta(selectedCurrency || 'INR').symbol.trim();

  const onFormSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    try {
      await onSubmit({
        name: data.name.trim(),
        phone: data.phone?.trim() || '',
        monthlyBudget: Number(data.monthlyBudget),
        currency: data.currency,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5" noValidate>
      <Input
        label="Full Name"
        placeholder="Alex Johnson"
        autoComplete="name"
        icon={<User className="w-4 h-4" />}
        {...register('name')}
        error={errors.name?.message}
      />

      <Input
        label="Phone Number"
        type="tel"
        placeholder="+91 98765 43210"
        autoComplete="tel"
        icon={<Phone className="w-4 h-4" />}
        helperText="Optional — helps friends find you in split groups"
        {...register('phone')}
      />

      <div className="space-y-2">
        <SectionLabel htmlFor="profile-currency">Currency</SectionLabel>
        <select
          id="profile-currency"
          {...register('currency')}
          className="w-full h-11 px-3 bg-[#f0fdf4] text-[#0b3b2e] rounded-xl border border-[#a7f3d0] text-sm font-semibold focus:ring-4 focus:ring-emerald-400/25"
          style={{ colorScheme: 'light' }}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} ({c.symbol.trim()}) — {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <SectionLabel htmlFor="profile-budget">Monthly Budget</SectionLabel>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-semibold text-emerald-700 pointer-events-none">{symbol}</span>
          <input
            id="profile-budget"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            {...register('monthlyBudget')}
            className="w-full h-11 pr-4 bg-[#f0fdf4] text-base font-semibold text-[#0b3b2e] tabular-nums rounded-xl border border-[#a7f3d0] focus:bg-white focus:border-[#10b981] focus:ring-4 focus:ring-emerald-400/25 outline-none"
            style={{ colorScheme: 'light', paddingLeft: `${Math.max(symbol.length, 1) * 0.6 + 1.5}rem` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((preset) => {
            const active = currentBudget === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => setValue('monthlyBudget', preset, { shouldValidate: true, shouldDirty: true })}
                className={`h-8 px-3 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                {formatCurrency(preset, selectedCurrency || 'INR')}
              </button>
            );
          })}
        </div>
        {errors.monthlyBudget && (
          <p className="text-xs font-medium text-red-500">{errors.monthlyBudget.message}</p>
        )}
      </div>

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
          Save changes
        </Button>
      </div>
    </form>
  );
};
