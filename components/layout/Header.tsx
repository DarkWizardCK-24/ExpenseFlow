'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { getCurrencyMeta } from '@/lib/format';
import { Avatar } from '../ui/Avatar';
import { NotificationPanel } from './NotificationPanel';
import { getActiveNavItem } from './navItems';

interface HeaderProps {
  currentMonth?: string;
  onMonthChange?: (month: string) => void;
  showMonthSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentMonth, showMonthSelector = true }) => {
  const pathname = usePathname();
  const { userProfile, isDemoMode } = useAuth();
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  const fullName = userProfile?.name || 'User';
  const currency = getCurrencyMeta(userProfile?.currency || 'INR');
  const activeItem = getActiveNavItem(pathname);
  const monthLabel =
    currentMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-emerald-100/70">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
          {/* Left: brand on mobile, section on desktop */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              aria-label="ExpenseFlow home"
              className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald flex-shrink-0"
            >
              <Wallet className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <p className="md:hidden text-base font-extrabold tracking-tight text-[#0b3b2e] leading-tight">
                ExpenseFlow
              </p>
              <p className="hidden md:block text-sm font-bold text-[#0b3b2e] leading-tight truncate">
                {activeItem?.label || 'ExpenseFlow'}
              </p>
              <p className="hidden md:block text-xs text-[#64748b] truncate">
                {activeItem?.description || 'Smart money, simply'}
              </p>
            </div>
            {isDemoMode && (
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Demo
              </span>
            )}
          </div>

          {/* Right tools */}
          <div className="flex items-center gap-2">
            {showMonthSelector && (
              <span className="hidden lg:inline-flex items-center h-9 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-[#0b3b2e]">
                {monthLabel}
              </span>
            )}

            <Link
              href="/profile"
              title="Change currency in profile"
              className="hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold hover:bg-emerald-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <span aria-hidden="true">{currency.symbol.trim()}</span>
              <span>{currency.code}</span>
            </Link>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              aria-haspopup="dialog"
              className="relative w-10 h-10 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50 text-[#0b3b2e] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <Bell className="w-[18px] h-[18px] text-emerald-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <Link
              href="/profile"
              aria-label="Open profile"
              className="md:hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <Avatar name={fullName} photoURL={userProfile?.photoURL} size="md" />
            </Link>
          </div>
        </div>
      </header>

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
};
