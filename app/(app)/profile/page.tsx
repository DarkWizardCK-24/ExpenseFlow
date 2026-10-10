'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTransactions } from '@/hooks/useTransactions';
import { useGroups } from '@/hooks/useGroups';
import { useGoals } from '@/hooks/useGoals';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Sheet } from '@/components/ui/Sheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { EditProfileForm } from '@/components/forms/EditProfileForm';
import { ManageCategoriesSheet } from '@/components/categories/ManageCategoriesSheet';
import { formatCurrency, SUPPORTED_CURRENCIES, getCurrencyMeta } from '@/lib/format';
import {
  User,
  Phone,
  Wallet,
  Globe,
  Tags,
  Download,
  LogOut,
  Pencil,
  ChevronRight,
  Bell,
  AlertTriangle,
  CalendarClock,
  Check,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type PrefKey = 'notif' | 'alerts' | 'weekly';

/* A settings row: icon + label/description + right-side content. */
const Row: React.FC<{
  icon: React.ReactNode;
  iconClass?: string;
  label: string;
  description?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}> = ({ icon, iconClass = 'bg-emerald-50 text-emerald-600', label, description, right, onClick, danger }) => {
  const content = (
    <>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-sm font-semibold ${danger ? 'text-rose-600' : 'text-[#0b3b2e]'}`}>{label}</span>
        {description && <span className="block text-xs text-[#64748b] mt-0.5 truncate">{description}</span>}
      </span>
      {right}
      {onClick && !right && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 transition-colors focus:outline-none focus-visible:bg-emerald-50/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40 ${
          danger ? 'hover:bg-rose-50/60' : 'hover:bg-slate-50'
        }`}
      >
        {content}
      </button>
    );
  }
  return <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5">{content}</div>;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{title}</h2>
    <Card lift={false} padding="none" className="divide-y divide-slate-100 overflow-hidden">
      {children}
    </Card>
  </section>
);

const BUDGET_PRESETS = [10000, 25000, 50000, 100000];

const BudgetForm: React.FC<{
  initial: number;
  currency: string;
  onSave: (value: number) => Promise<void>;
  onCancel: () => void;
}> = ({ initial, currency, onSave, onCancel }) => {
  const [value, setValue] = useState(initial ? String(initial) : '');
  const [saving, setSaving] = useState(false);
  const num = Number(value);
  const invalid = !value || Number.isNaN(num) || num <= 0;
  const symbol = getCurrencyMeta(currency).symbol.trim();

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (invalid) return;
        setSaving(true);
        try {
          await onSave(num);
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-5"
    >
      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-5 text-center">
        <label htmlFor="budget-amount" className="text-xs font-semibold text-emerald-800">
          How much do you want to spend per month?
        </label>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-emerald-600">{symbol}</span>
          <input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            className="w-full max-w-[220px] !bg-transparent !border-0 !shadow-none text-center text-4xl font-black tracking-tight text-[#0b3b2e] tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {value && invalid && <p className="text-xs font-medium text-red-500 mt-1">Enter an amount greater than 0</p>}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {BUDGET_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={num === p}
            onClick={() => setValue(String(p))}
            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold tabular-nums transition-colors ${
              num === p
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
            }`}
          >
            {formatCurrency(p, currency)}
          </button>
        ))}
      </div>

      <div className="sticky -bottom-5 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-emerald-100/80 grid grid-cols-[auto_1fr] gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} loadingText="Saving..." disabled={invalid} icon={<Check className="w-4 h-4" />}>
          Save budget
        </Button>
      </div>
    </form>
  );
};

export default function ProfilePage() {
  const router = useRouter();
  const { userProfile, updateProfileData, logout, isDemoMode } = useAuth();
  const { transactions, categories } = useTransactions();
  const { groups } = useGroups();
  const { goals } = useGoals();

  const currency = userProfile?.currency || 'INR';
  const currencyMeta = getCurrencyMeta(currency);
  const name = userProfile?.name || 'ExpenseFlow User';

  const [editOpen, setEditOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);

  // Preference switches mirror the profile once it loads
  const [prefs, setPrefs] = useState({ notif: true, alerts: true, weekly: true });
  useEffect(() => {
    if (userProfile?.prefs) {
      setPrefs({
        notif: userProfile.prefs.notif ?? true,
        alerts: userProfile.prefs.alerts ?? true,
        weekly: userProfile.prefs.weekly ?? true,
      });
    }
  }, [userProfile?.prefs]);

  const handleCurrencyChange = async (code: string) => {
    if (code === currency) return;
    setUpdatingCurrency(true);
    try {
      await updateProfileData({ currency: code });
      const meta = getCurrencyMeta(code);
      toast.success(`Currency set to ${meta.name} (${meta.symbol.trim()})`);
    } catch {
      toast.error('Could not update currency');
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const handleTogglePref = async (key: PrefKey, val: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      await updateProfileData({ prefs: next });
    } catch {
      setPrefs(previous);
      toast.error('Could not update preference');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setSignOutOpen(false);
      toast.success('Signed out');
      router.push('/login');
    } finally {
      setSigningOut(false);
    }
  };

  const handleExportAllData = () => {
    const exportObject = {
      profile: userProfile,
      transactions,
      categories,
      groups,
      goals,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExpenseFlow-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Your data was exported');
  };

  const stats = [
    { label: 'Transactions', value: transactions.length },
    { label: 'Goals', value: goals.length },
    { label: 'Groups', value: groups.length },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      <PageHeader title="Profile" subtitle="Manage your account, money settings and preferences." />

      {/* Profile card */}
      <Card lift={false} padding="none" className="overflow-hidden">
        <div className="h-20 sm:h-24 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#10b981]" aria-hidden="true" />
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <Avatar name={name} photoURL={userProfile?.photoURL} size="xl" className="border-4 border-white shadow-md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold tracking-tight text-[#0b3b2e] truncate">{name}</h2>
                <Badge variant={userProfile?.plan === 'pro' ? 'emerald' : 'gray'} size="sm" icon={userProfile?.plan === 'pro' ? <Sparkles className="w-3 h-3" /> : undefined}>
                  {userProfile?.plan === 'pro' ? 'Pro' : 'Free'}
                </Badge>
                {isDemoMode && (
                  <Badge variant="amber" size="sm">
                    Demo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#64748b] truncate">{userProfile?.email || 'No email'}</p>
            </div>
            <Button variant="outline" size="md" icon={<Pencil className="w-4 h-4" />} onClick={() => setEditOpen(true)} className="sm:self-end">
              Edit profile
            </Button>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                <dt className="text-[11px] font-medium text-[#64748b]">{s.label}</dt>
                <dd className="text-lg font-extrabold text-[#0b3b2e] tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Section title="Account">
        <Row icon={<User className="w-[18px] h-[18px]" />} label="Name" description={name} onClick={() => setEditOpen(true)} />
        <Row
          icon={<Phone className="w-[18px] h-[18px]" />}
          label="Phone"
          description={userProfile?.phone || 'Not added'}
          onClick={() => setEditOpen(true)}
        />
      </Section>

      <Section title="Money">
        <Row
          icon={<Globe className="w-[18px] h-[18px]" />}
          iconClass="bg-sky-50 text-sky-600"
          label="Currency"
          description={`${currencyMeta.flag} ${currencyMeta.name}`}
          right={
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={updatingCurrency}
              className="h-10 max-w-[130px] sm:max-w-none pl-3 pr-8 bg-white text-[#0b3b2e] rounded-xl border border-slate-200 font-semibold text-sm cursor-pointer disabled:opacity-60 focus:ring-4 focus:ring-emerald-400/25"
              style={{ colorScheme: 'light' }}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol.trim()})
                </option>
              ))}
            </select>
          }
        />
        <Row
          icon={<Wallet className="w-[18px] h-[18px]" />}
          label="Monthly budget"
          description={
            userProfile?.monthlyBudget
              ? `${formatCurrency(userProfile.monthlyBudget, currency)} per month`
              : 'Not set'
          }
          onClick={() => setBudgetOpen(true)}
        />
        <Row
          icon={<Tags className="w-[18px] h-[18px]" />}
          iconClass="bg-violet-50 text-violet-600"
          label="Manage categories"
          description={`${categories.length} categories · add, edit or remove`}
          onClick={() => setCategoriesOpen(true)}
        />
      </Section>

      <Section title="Notifications">
        <div className="flex items-start gap-3 px-4 sm:px-5 py-2">
          <span className="w-10 h-10 mt-2 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-[18px] h-[18px]" />
          </span>
          <div className="flex-1 min-w-0">
            <Switch
              label="In-app notifications"
              description="Updates on expenses, split bills and settlements"
              checked={prefs.notif}
              onChange={(v) => handleTogglePref('notif', v)}
            />
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 sm:px-5 py-2">
          <span className="w-10 h-10 mt-2 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-[18px] h-[18px]" />
          </span>
          <div className="flex-1 min-w-0">
            <Switch
              label="Budget alerts"
              description="Warn me at 80% and 100% of my monthly budget"
              checked={prefs.alerts}
              onChange={(v) => handleTogglePref('alerts', v)}
            />
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 sm:px-5 py-2">
          <span className="w-10 h-10 mt-2 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-[18px] h-[18px]" />
          </span>
          <div className="flex-1 min-w-0">
            <Switch
              label="Weekly summary"
              description="A short recap of spending and savings each week"
              checked={prefs.weekly}
              onChange={(v) => handleTogglePref('weekly', v)}
            />
          </div>
        </div>
      </Section>

      <Section title="Data & session">
        <Row
          icon={<Download className="w-[18px] h-[18px]" />}
          iconClass="bg-slate-100 text-slate-600"
          label="Export my data"
          description="Download transactions, goals and groups as JSON"
          onClick={handleExportAllData}
        />
        <Row
          icon={<LogOut className="w-[18px] h-[18px]" />}
          iconClass="bg-rose-50 text-rose-600"
          label="Sign out"
          description="Sign out of ExpenseFlow on this device"
          onClick={() => setSignOutOpen(true)}
          danger
        />
      </Section>

      {/* Edit profile */}
      <Sheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" description="Update your personal details and money settings">
        {editOpen && (
          <EditProfileForm
            userProfile={userProfile}
            onSubmit={async (data) => {
              await updateProfileData(data);
              setEditOpen(false);
              toast.success('Profile updated');
            }}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Sheet>

      {/* Monthly budget */}
      <Sheet
        isOpen={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Monthly budget"
        description="Your spending limit for each month"
        maxWidth="max-w-md"
      >
        {budgetOpen && (
          <BudgetForm
            initial={userProfile?.monthlyBudget || 0}
            currency={currency}
            onSave={async (value) => {
              await updateProfileData({ monthlyBudget: value });
              setBudgetOpen(false);
              toast.success('Monthly budget updated');
            }}
            onCancel={() => setBudgetOpen(false)}
          />
        )}
      </Sheet>

      <ManageCategoriesSheet isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

      <ConfirmDialog
        isOpen={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleSignOut}
        title="Sign out?"
        message="You'll need to sign in again to access your finances."
        confirmText="Sign out"
        confirmVariant="danger"
        loading={signingOut}
        loadingText="Signing out..."
        icon={<LogOut className="w-6 h-6" />}
      />
    </div>
  );
}
