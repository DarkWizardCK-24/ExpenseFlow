'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/Spinner';

export default function RootPage() {
  const router = useRouter();
  const { user, isDemoMode, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace(user || isDemoMode ? '/dashboard' : '/login');
    }
  }, [user, isDemoMode, loading, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#d1fae5] via-[#f0fdf4] to-[#ecfdf5]">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald-lg">
        <Wallet className="w-8 h-8" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0b3b2e]">ExpenseFlow</h1>
      <p className="mt-1 text-sm text-[#64748b] text-center">
        Track spending, split bills and reach your goals.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-700" role="status">
        <Spinner size="sm" />
        <span>Getting things ready...</span>
      </div>
    </main>
  );
}
