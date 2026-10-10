'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Users2, Target } from 'lucide-react';

interface FABProps {
  onAddExpense: () => void;
  onAddSplitGroup: () => void;
  onAddGoal: () => void;
}

export const FAB: React.FC<FABProps> = ({ onAddExpense, onAddSplitGroup, onAddGoal }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const actions = [
    {
      label: 'Add transaction',
      hint: 'Income or expense',
      icon: Receipt,
      tint: 'bg-emerald-100 text-emerald-700',
      action: onAddExpense,
    },
    {
      label: 'New split group',
      hint: 'Share bills with friends',
      icon: Users2,
      tint: 'bg-sky-100 text-sky-700',
      action: onAddSplitGroup,
    },
    {
      label: 'New savings goal',
      hint: 'Save towards a target',
      icon: Target,
      tint: 'bg-amber-100 text-amber-700',
      action: onAddGoal,
    },
  ];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-emerald-950/30 backdrop-blur-[2px] z-40"
          />
        )}
      </AnimatePresence>

      <div className="fixed right-4 sm:right-6 md:right-8 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-8 z-50 flex flex-col items-end">
        <AnimatePresence>
          {open && (
            <motion.ul
              id="fab-menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="mb-3 w-64 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-1.5"
            >
              {actions.map((act) => {
                const Icon = act.icon;
                return (
                  <li key={act.label}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        act.action();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${act.tint}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#0b3b2e]">{act.label}</span>
                        <span className="block text-[11px] text-[#64748b]">{act.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={open}
          aria-controls="fab-menu"
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10b981] text-white flex items-center justify-center shadow-emerald-lg hover:brightness-105 transition-[filter] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="flex">
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </motion.span>
        </motion.button>
      </div>
    </>
  );
};
