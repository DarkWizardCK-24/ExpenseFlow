'use client';

import { createContext, useContext } from 'react';

/**
 * Lets any page inside the app shell open the global "add" sheets
 * (wired up in app/(app)/layout.tsx) without duplicating forms.
 */
export interface QuickActions {
  openAddTransaction: () => void;
  openAddGoal: () => void;
  openAddGroup: () => void;
  openAddCategory: () => void;
}

const noop = () => {};

const QuickActionsContext = createContext<QuickActions>({
  openAddTransaction: noop,
  openAddGoal: noop,
  openAddGroup: noop,
  openAddCategory: noop,
});

export const QuickActionsProvider = QuickActionsContext.Provider;

export function useQuickActions(): QuickActions {
  return useContext(QuickActionsContext);
}
