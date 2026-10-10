'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Category } from '@/types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(30, 'Keep it under 30 characters'),
  emoji: z.string().min(1, 'Please choose an emoji'),
  color: z.string().min(4, 'Please choose a color'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  /** When provided the form edits this category (prefilled, "Update Category"). */
  initialData?: Category | null;
  onSubmit: (cat: Omit<Category, 'id'>) => Promise<unknown>;
  onCancel: () => void;
}

const PRESET_EMOJIS = [
  '🍔', '☕', '🛒', '✈️', '🚗', '⛽', '🛍️', '👗', '⚡', '🏠', '📱', '💡',
  '🎉', '🎬', '🎮', '🎵', '🏥', '💊', '🏋️', '📚', '🎓', '🐾', '🎁', '💼',
  '💰', '📈', '🧾', '📦', '🏷️', '🍕', '🍺', '💇',
];
const PRESET_COLORS = [
  '#10b981', '#059669', '#14b8a6', '#06b6d4', '#0284c7', '#3b82f6',
  '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#64748b',
];

const SectionLabel: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <span id={id} className="block text-xs font-semibold uppercase tracking-wider text-emerald-900 mb-2">
    {children}
  </span>
);

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      emoji: initialData?.emoji || '🏷️',
      color: initialData?.color || '#10b981',
    },
  });

  const currentEmoji = watch('emoji');
  const currentColor = watch('color');
  const currentName = watch('name');

  // Keep a custom (non-preset) emoji/color from an edited category selectable.
  const emojis = PRESET_EMOJIS.includes(currentEmoji) ? PRESET_EMOJIS : [currentEmoji, ...PRESET_EMOJIS];
  const colors = PRESET_COLORS.includes(currentColor) ? PRESET_COLORS : [currentColor, ...PRESET_COLORS];

  const onFormSubmit = async (data: CategoryFormData) => {
    setSubmitting(true);
    try {
      await onSubmit({
        name: data.name.trim(),
        emoji: data.emoji,
        color: data.color,
      });
    } catch {
      // Errors are surfaced by the caller (hooks toast); keep the form open.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Live preview */}
      <div
        className="rounded-2xl border p-4 flex items-center gap-3 transition-colors"
        style={{ backgroundColor: `${currentColor}10`, borderColor: `${currentColor}33` }}
      >
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${currentColor}24` }}
          aria-hidden="true"
        >
          {currentEmoji}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">Preview</p>
          <p className="font-bold text-[#0b3b2e] truncate">{currentName?.trim() || 'Category name'}</p>
        </div>
      </div>

      <Input
        label="Category Name"
        placeholder="e.g. Fitness, Pets, Books"
        autoFocus={!isEdit}
        {...register('name')}
        error={errors.name?.message}
      />

      {/* Emoji Picker */}
      <div>
        <SectionLabel id="cat-emoji-label">Icon</SectionLabel>
        <div
          role="group"
          aria-labelledby="cat-emoji-label"
          className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-2xl max-h-[118px] overflow-y-auto no-scrollbar"
        >
          {emojis.map((emoji) => {
            const selected = currentEmoji === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-label={`Icon ${emoji}`}
                aria-pressed={selected}
                onClick={() => setValue('emoji', emoji, { shouldValidate: true, shouldDirty: true })}
                className={`aspect-square text-lg sm:text-xl rounded-lg flex items-center justify-center transition-all ${
                  selected
                    ? 'bg-white shadow-xs ring-2 ring-emerald-500'
                    : 'hover:bg-white/80'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        {errors.emoji && <p className="text-xs font-medium text-red-500 mt-1">{errors.emoji.message}</p>}
      </div>

      {/* Color Picker */}
      <div>
        <SectionLabel id="cat-color-label">Color</SectionLabel>
        <div role="group" aria-labelledby="cat-color-label" className="flex items-center gap-2.5 flex-wrap">
          {colors.map((color) => {
            const selected = currentColor === color;
            return (
              <button
                key={color}
                type="button"
                aria-label={`Color ${color}`}
                aria-pressed={selected}
                onClick={() => setValue('color', color, { shouldValidate: true, shouldDirty: true })}
                style={{ backgroundColor: color }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform ${
                  selected ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                }`}
              >
                {selected && <Check className="w-4 h-4" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        {errors.color && <p className="text-xs font-medium text-red-500 mt-1">{errors.color.message}</p>}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-[auto_1fr] gap-3 pt-2">
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
          {isEdit ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
};
