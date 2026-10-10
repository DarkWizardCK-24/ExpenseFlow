import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', locale: 'en-US', flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', flag: '🇸🇬' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc', locale: 'de-CH', flag: '🇨🇭' },
];

export function getCurrencyMeta(code: string): CurrencyOption {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase()) || {
      code,
      symbol: code.length <= 3 ? `${code} ` : '₹',
      name: code,
      locale: code === 'INR' ? 'en-IN' : 'en-US',
      flag: '🌐',
    }
  );
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const meta = getCurrencyMeta(currency);
  const formatted = Math.abs(amount).toLocaleString(meta.locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${meta.symbol}${formatted}`;
}

export function formatDate(dateInput: string | Date | undefined, formatStr = 'MMM d, yyyy'): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(d)) {
      const fallbackDate = new Date(dateInput);
      return isValid(fallbackDate) ? format(fallbackDate, formatStr) : '';
    }
    return format(d, formatStr);
  } catch {
    return '';
  }
}

export function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(d)) {
      const fallbackDate = new Date(dateInput);
      return isValid(fallbackDate) ? formatDistanceToNow(fallbackDate, { addSuffix: true }) : '';
    }
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'EF';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)', // Teal
  'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', // Azure Sky
  'linear-gradient(135deg, #047857 0%, #34d399 100%)', // Mint Jade
  'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', // Golden Amber
  'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)', // Tangerine
  'linear-gradient(135deg, #15803d 0%, #4ade80 100%)', // Forest Green
  'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', // Ocean Cyan
  'linear-gradient(135deg, #065f46 0%, #059669 100%)', // Deep Pine
  'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)', // Honey Amber
  'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)', // Deep Coral
  'linear-gradient(135deg, #115e59 0%, #14b8a6 100%)', // Mystic Teal
  'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', // Deep Sapphire
  'linear-gradient(135deg, #3f6212 0%, #84cc16 100%)', // Lime Forest
];

export function getAvatarGradient(identifier: string): string {
  if (!identifier) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function getAvatarColor(identifier: string): string {
  return getAvatarGradient(identifier);
}
