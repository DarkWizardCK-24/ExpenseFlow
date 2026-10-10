'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Plus, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '../ui/Avatar';
import { NAV_ITEMS, isNavActive } from './navItems';

interface SidebarProps {
  onSignOutRequest: () => void;
  /** Optional: shows a primary "New transaction" button at the top of the nav. */
  onAddTransaction?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSignOutRequest, onAddTransaction }) => {
  const pathname = usePathname();
  const { userProfile, isDemoMode } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 flex-shrink-0 bg-white/90 backdrop-blur-md border-r border-emerald-100/80 p-4 sticky top-0 h-screen z-30">
      {/* Brand */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-2 py-3 mb-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-base tracking-tight text-[#0b3b2e] leading-none">ExpenseFlow</p>
          <p className="text-[11px] font-medium text-emerald-600 mt-1">
            {isDemoMode ? 'Demo workspace' : 'Smart money, simply'}
          </p>
        </div>
      </Link>

      {onAddTransaction && (
        <button
          type="button"
          onClick={onAddTransaction}
          className="mb-5 w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#047857] to-[#10b981] text-white text-sm font-medium shadow-emerald hover:brightness-105 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New transaction
        </button>
      )}

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">Menu</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                    isActive
                      ? 'bg-emerald-50 text-[#047857] font-semibold'
                      : 'text-[#64748b] hover:text-[#0b3b2e] hover:bg-slate-50'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"
                    />
                  )}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white text-emerald-600 shadow-xs border border-emerald-100'
                        : 'text-[#94a3b8] group-hover:text-emerald-600'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="pt-4 mt-4 border-t border-emerald-100/80 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <Avatar name={userProfile?.name || 'User'} photoURL={userProfile?.photoURL} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0b3b2e] truncate">{userProfile?.name || 'ExpenseFlow User'}</p>
            <p className="text-xs text-[#64748b] truncate">{userProfile?.email || 'Signed in'}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onSignOutRequest}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748b] hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
