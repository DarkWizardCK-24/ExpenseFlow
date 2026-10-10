import {
  LayoutDashboard,
  Receipt,
  Users2,
  PieChart,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Home', href: '/dashboard', icon: LayoutDashboard, description: 'Your money at a glance' },
  { label: 'Transactions', shortLabel: 'Activity', href: '/transactions', icon: Receipt, description: 'Every income and expense' },
  { label: 'Split Bills', shortLabel: 'Split', href: '/split', icon: Users2, description: 'Shared expenses with friends' },
  { label: 'Reports', shortLabel: 'Reports', href: '/reports', icon: PieChart, description: 'Trends and insights' },
  { label: 'Budgets & Goals', shortLabel: 'Budget', href: '/budget', icon: Target, description: 'Limits and savings targets' },
  { label: 'Profile', shortLabel: 'Profile', href: '/profile', icon: User, description: 'Account and preferences' },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/budget') return pathname.startsWith('/budget') || pathname.startsWith('/goals');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
}
