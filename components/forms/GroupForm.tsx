'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SplitGroup, SplitGroupCategory, GroupMember } from '@/types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Check, Lock, Plus, UserPlus, X } from 'lucide-react';

const groupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters'),
  category: z.enum(['Trip', 'Home', 'Food', 'Party', 'Ride', 'Work']),
  emoji: z.string().min(1, 'Please select an emoji'),
});

type GroupFormData = z.infer<typeof groupSchema>;

/** Payload handed back in edit mode — ready for `useGroupDetail().updateGroup`. */
export interface GroupFormUpdate {
  name: string;
  category: SplitGroupCategory;
  emoji: string;
  members: GroupMember[];
}

interface GroupFormProps {
  /** Create mode: receives member names (the current user is added by the hook). */
  onSubmit?: (data: {
    name: string;
    category: SplitGroupCategory;
    emoji: string;
    members: string[];
  }) => Promise<unknown>;
  onCancel: () => void;
  /** When provided the form switches to edit mode. */
  initialData?: SplitGroup | null;
  /** Edit mode submit: receives full member objects with existing ids preserved. */
  onUpdate?: (data: GroupFormUpdate) => Promise<unknown>;
  /** Edit mode: return false for members that can't be removed (e.g. involved in expenses). */
  canRemoveMember?: (memberId: string) => boolean;
}

const CATEGORIES: SplitGroupCategory[] = ['Trip', 'Home', 'Food', 'Party', 'Ride', 'Work'];

const CATEGORY_ICONS: Record<SplitGroupCategory, string> = {
  Trip: '✈️',
  Home: '🏡',
  Food: '🍕',
  Party: '🎉',
  Ride: '🚗',
  Work: '💼',
};

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🏡', '🍕', '🍻', '🎉', '🎂', '🚗', '💼', '🎮', '⚽', '🛒', '🎬', '💡', '👥'];

const SectionLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="block text-xs font-medium text-emerald-950">
      {children}
    </span>
    {hint && <span className="text-[11px] text-[#64748b]">{hint}</span>}
  </div>
);

interface EditableMember extends GroupMember {
  isNew?: boolean;
}

export const GroupForm: React.FC<GroupFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  onUpdate,
  canRemoveMember,
}) => {
  const isEdit = Boolean(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [members, setMembers] = useState<EditableMember[]>(
    initialData ? initialData.members.map((m) => ({ ...m })) : []
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || 'Trip',
      emoji: initialData?.emoji || CATEGORY_ICONS.Trip,
    },
  });

  const selectedCategory = watch('category');
  const selectedEmoji = watch('emoji');

  const isLocked = (m: EditableMember) => Boolean(m.uid);
  const isRemovable = (m: EditableMember) =>
    !isLocked(m) && (m.isNew || !canRemoveMember || canRemoveMember(m.id));

  const addMember = (raw = newMemberName) => {
    const name = raw.trim();
    if (!name) return false;
    if (members.some((m) => m.name.trim().toLowerCase() === name.toLowerCase())) {
      setMemberError(`${name} is already in this group`);
      return false;
    }
    setMembers((prev) => [
      ...prev,
      { id: `mem-${Date.now()}-${prev.length}`, name, isNew: true },
    ]);
    setNewMemberName('');
    setMemberError(null);
    return true;
  };

  const renameMember = (id: string, name: string) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
    setMemberError(null);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setMemberError(null);
  };

  const onCategoryChange = (cat: SplitGroupCategory) => {
    // Only follow the category icon if the user hasn't picked a custom emoji.
    const followsCategory = selectedEmoji === CATEGORY_ICONS[selectedCategory];
    setValue('category', cat, { shouldDirty: true });
    if (followsCategory) setValue('emoji', CATEGORY_ICONS[cat], { shouldDirty: true });
  };

  const onFormSubmit = async (data: GroupFormData) => {
    // Include a name typed into the add box but not yet added.
    let list = members;
    const pending = newMemberName.trim();
    if (pending && !members.some((m) => m.name.trim().toLowerCase() === pending.toLowerCase())) {
      list = [...members, { id: `mem-${Date.now()}-${members.length}`, name: pending, isNew: true }];
    }

    const cleaned = list.map((m) => ({ ...m, name: m.name.trim() }));
    if (cleaned.some((m) => !m.name)) {
      setMemberError('Member names can’t be empty');
      return;
    }
    const lower = cleaned.map((m) => m.name.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      setMemberError('Each member needs a unique name');
      return;
    }
    const otherMembers = cleaned.filter((m) => !m.uid);
    if (otherMembers.length === 0) {
      setMemberError('Add at least one person to split with');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && onUpdate) {
        await onUpdate({
          name: data.name.trim(),
          category: data.category,
          emoji: data.emoji,
          // Strip UI-only flags and undefined fields (Firestore rejects undefined).
          members: cleaned.map(({ isNew: _isNew, ...m }) =>
            Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)) as unknown as GroupMember
          ),
        });
      } else if (onSubmit) {
        await onSubmit({
          name: data.name.trim(),
          category: data.category,
          emoji: data.emoji,
          members: otherMembers.map((m) => m.name),
        });
      }
      setNewMemberName('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Identity hero: emoji preview + name */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
        <div className="flex items-start gap-3">
          <span
            className="w-14 h-14 rounded-2xl bg-white border border-emerald-100 shadow-xs flex items-center justify-center text-3xl flex-shrink-0"
            aria-hidden
          >
            {selectedEmoji}
          </span>
          <div className="flex-1 min-w-0">
            <Input
              label="Group name"
              placeholder="e.g. Goa Trip, Flat 402, Team lunch"
              autoFocus={!isEdit}
              {...register('name')}
              error={errors.name?.message}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="radiogroup" aria-label="Group emoji">
          {EMOJI_OPTIONS.map((e) => {
            const active = selectedEmoji === e;
            return (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Emoji ${e}`}
                onClick={() => setValue('emoji', e, { shouldDirty: true })}
                className={`w-10 h-10 flex-shrink-0 rounded-xl text-lg flex items-center justify-center border transition-all ${
                  active
                    ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/15'
                    : 'bg-white/60 border-transparent hover:border-emerald-200'
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category tiles */}
      <div className="space-y-2">
        <SectionLabel>Group type</SectionLabel>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategoryChange(cat)}
                className={`relative py-2.5 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/15'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
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

      {/* Members */}
      <div className="space-y-2">
        <SectionLabel hint={isEdit ? `${members.length} total` : 'You’re included automatically'}>
          Members
        </SectionLabel>

        <ul className="space-y-1.5">
          {!isEdit && (
            <li className="flex items-center gap-2.5 p-2 pr-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <Avatar name="You" size="sm" className="!rounded-full !shadow-none !border-0" />
              <span className="flex-1 text-sm font-semibold text-emerald-900">You</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Owner</span>
            </li>
          )}

          {members.map((m) => {
            const locked = isLocked(m);
            const removable = isRemovable(m);
            return (
              <li
                key={m.id}
                className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                  locked ? 'bg-emerald-50/70 border-emerald-100' : 'bg-white border-slate-200'
                }`}
              >
                <Avatar
                  name={m.name || '?'}
                  size="sm"
                  className="!rounded-full !shadow-none !border-0"
                />
                {locked ? (
                  <span className="flex-1 min-w-0 text-sm font-semibold text-emerald-900 truncate">
                    {m.name}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => renameMember(m.id, e.target.value)}
                    aria-label={`Name of member ${m.name}`}
                    className="flex-1 min-w-0 h-9 px-2 -mx-1 rounded-lg bg-transparent text-sm font-medium text-[#0b3b2e] hover:bg-slate-50 focus:bg-[#f0fdf4] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                    style={{ colorScheme: 'light' }}
                  />
                )}
                {locked ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 pr-1">You</span>
                ) : removable ? (
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <span
                    className="w-8 h-8 flex items-center justify-center text-slate-300 flex-shrink-0"
                    title="Has expenses or settlements — can’t be removed"
                    aria-label="Can't remove: member has expenses or settlements"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Add member */}
        <div className="flex gap-2 pt-1">
          <div className="flex-1 min-w-0">
            <Input
              aria-label="New member name"
              placeholder="Add a friend by name"
              value={newMemberName}
              icon={<UserPlus className="w-4 h-4" />}
              onChange={(e) => {
                setNewMemberName(e.target.value);
                setMemberError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMember();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addMember()}
            disabled={!newMemberName.trim()}
            icon={<Plus className="w-4 h-4" />}
          >
            Add
          </Button>
        </div>
        {memberError && <p className="text-xs font-medium text-red-500">{memberError}</p>}
        {isEdit && canRemoveMember && (
          <p className="text-[11px] text-[#64748b] flex items-center gap-1">
            <Lock className="w-3 h-3" /> Members with expenses or settlements can be renamed but not removed.
          </p>
        )}
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
          loadingText={isEdit ? 'Saving...' : 'Creating...'}
          icon={<Check className="w-4 h-4" />}
        >
          {isEdit ? 'Save changes' : 'Create group'}
        </Button>
      </div>
    </form>
  );
};
