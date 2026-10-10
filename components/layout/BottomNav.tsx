'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isNavActive } from './navItems';

// Profile is reachable from the header avatar on mobile.
const TABS = NAV_ITEMS.filter((item) => item.href !== '/profile');

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-emerald-100/80 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(5,150,105,0.06)]"
    >
      <ul className="flex items-stretch justify-around h-16 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = isNavActive(pathname, tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center h-full gap-1 select-none transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 rounded-xl ${
                  isActive ? 'text-[#047857]' : 'text-[#64748b] hover:text-[#0b3b2e]'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                    isActive ? 'bg-emerald-100/80' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {tab.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
