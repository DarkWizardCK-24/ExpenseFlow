'use client';

import React from 'react';
import { isToday, isYesterday } from 'date-fns';
import { GroupActivityLog } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { PlusCircle, Pencil, Trash2, CheckCircle2, Sparkles, Activity } from 'lucide-react';

interface ActivityLogTimelineProps {
  logs: GroupActivityLog[];
}

const EVENT_STYLES: Record<
  GroupActivityLog['type'],
  { icon: React.ElementType; className: string; label: string }
> = {
  created: { icon: Sparkles, className: 'bg-emerald-50 text-emerald-600', label: 'Created' },
  added: { icon: PlusCircle, className: 'bg-teal-50 text-teal-600', label: 'Added' },
  edited: { icon: Pencil, className: 'bg-sky-50 text-sky-600', label: 'Edited' },
  settled: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700', label: 'Settled' },
  deleted: { icon: Trash2, className: 'bg-rose-50 text-rose-500', label: 'Removed' },
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Earlier';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return formatDate(d, 'EEEE, MMM d, yyyy');
};

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-[#0b3b2e]">No activity yet</p>
        <p className="text-xs text-[#64748b] mt-0.5">
          Expenses, edits and settlements will show up here.
        </p>
      </div>
    );
  }

  // Newest first, grouped by local calendar day (keeps insertion order within a day)
  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const groups: { label: string; items: GroupActivityLog[] }[] = [];
  for (const log of sorted) {
    const label = dayLabel(log.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(log);
    else groups.push({ label, items: [log] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-3">
            {group.label}
          </h4>
          <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-emerald-100">
            {group.items.map((item) => {
              const style = EVENT_STYLES[item.type] || EVENT_STYLES.edited;
              const Icon = style.icon;
              return (
                <li key={item.id} className="relative flex items-start gap-3">
                  <span
                    className={`relative z-10 w-8 h-8 rounded-full ring-4 ring-white flex items-center justify-center flex-shrink-0 ${style.className}`}
                    aria-label={style.label}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-[#0b3b2e] leading-snug break-words">{item.message}</p>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};
