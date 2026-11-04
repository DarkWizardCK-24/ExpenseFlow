'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { FAB } from '@/components/layout/FAB';
import { QuickActionsProvider, type QuickActions } from '@/components/layout/QuickActionsContext';
import { Sheet } from '@/components/ui/Sheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { GroupForm } from '@/components/forms/GroupForm';
import { GoalForm } from '@/components/forms/GoalForm';
import { CategoryForm } from '@/components/forms/CategoryForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useGroups } from '@/hooks/useGroups';
import { useGoals } from '@/hooks/useGoals';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isDemoMode } = useAuth();
  const router = useRouter();

  const { categories, addTransaction, addCategory } = useTransactions();
  const { createGroup } = useGroups();
  const { createGoal } = useGoals();

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Exposed to pages so they can open the global add sheets
  const quickActions = useMemo<QuickActions>(
    () => ({
      openAddTransaction: () => setExpenseModalOpen(true),
      openAddGoal: () => setGoalModalOpen(true),
      openAddGroup: () => setGroupModalOpen(true),
      openAddCategory: () => setCategoryModalOpen(true),
    }),
    []
  );

  useEffect(() => {
    if (!loading && !user && !isDemoMode) {
      router.push('/login');
    }
  }, [user, loading, isDemoMode, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#d1fae5] via-[#f0fdf4] to-[#ecfdf5] flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald-lg mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#0b3b2e]">ExpenseFlow</h2>
        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-700" role="status">
          <Spinner size="sm" />
          <span>Loading your finances...</span>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return null;
  }

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setSignOutConfirmOpen(false);
      toast.success('Signed out successfully');
      router.push('/login');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <QuickActionsProvider value={quickActions}>
      <div className="min-h-screen flex bg-gradient-to-br from-[#ecfdf5] via-[#f8fafc] to-[#f0fdf4]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-white focus:text-emerald-800 focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-card"
        >
          Skip to content
        </a>

        <Sidebar
          onSignOutRequest={() => setSignOutConfirmOpen(true)}
          onAddTransaction={() => setExpenseModalOpen(true)}
        />

        <div className="flex-1 flex flex-col min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
          <Header />

          <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <BottomNav />

        <FAB
          onAddExpense={() => setExpenseModalOpen(true)}
          onAddSplitGroup={() => setGroupModalOpen(true)}
          onAddGoal={() => setGoalModalOpen(true)}
        />

        <Sheet
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          title="Add Transaction"
          description="Record a new income or expense in your vault"
        >
          <ExpenseForm
            categories={categories}
            onSubmit={async (data) => {
              await addTransaction(data);
              setExpenseModalOpen(false);
            }}
            onCancel={() => setExpenseModalOpen(false)}
            onOpenAddCategory={() => setCategoryModalOpen(true)}
          />
        </Sheet>

        <Sheet
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          title="New Category"
          description="Create a custom category for expenses and splits"
        >
          <CategoryForm
            onSubmit={async (cat) => {
              await addCategory(cat);
              setCategoryModalOpen(false);
            }}
            onCancel={() => setCategoryModalOpen(false)}
          />
        </Sheet>

        <Sheet
          isOpen={groupModalOpen}
          onClose={() => setGroupModalOpen(false)}
          title="New Split Group"
          description="Create a group to split bills, trips, or rent with friends"
        >
          <GroupForm
            onSubmit={async (data) => {
              await createGroup(data);
              setGroupModalOpen(false);
            }}
            onCancel={() => setGroupModalOpen(false)}
          />
        </Sheet>

        <Sheet
          isOpen={goalModalOpen}
          onClose={() => setGoalModalOpen(false)}
          title="New Savings Goal"
          description="Set a target and track your progress over time"
        >
          <GoalForm
            onSubmit={async (data) => {
              await createGoal(data);
              setGoalModalOpen(false);
            }}
            onCancel={() => setGoalModalOpen(false)}
          />
        </Sheet>

        <ConfirmDialog
          isOpen={signOutConfirmOpen}
          onClose={() => setSignOutConfirmOpen(false)}
          onConfirm={handleSignOut}
          title="Sign Out"
          message="Are you sure you want to sign out of your ExpenseFlow account?"
          confirmText="Sign Out"
          confirmVariant="danger"
          loading={signingOut}
          loadingText="Signing out..."
        />
      </div>
    </QuickActionsProvider>
  );
}
