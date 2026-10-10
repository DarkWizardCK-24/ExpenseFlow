'use client';

import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string; // e.g. max-w-lg
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-xl',
}) => {
  const titleId = useId();
  const descId = useId();

  // Close on Escape key + lock body scroll while open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm"
          />

          {/* Sheet / Dialog container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`relative w-full ${maxWidth} bg-white rounded-t-[28px] md:rounded-3xl shadow-2xl border border-emerald-100 flex flex-col max-h-[92vh] z-10 overflow-hidden`}
          >
            {/* Mobile drag handle */}
            <div className="md:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 id={titleId} className="text-lg font-bold tracking-tight text-[#0b3b2e]">
                  {title}
                </h3>
                {description && (
                  <p id={descId} className="text-xs text-[#64748b] mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="px-6 py-5 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
