'use client';

import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  message?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  /** Optional text shown on the confirm button while loading. */
  loadingText?: string;
  /** Optional custom icon for the dialog. */
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  itemName,
  message,
  confirmText = 'Delete',
  confirmVariant = 'danger',
  loading = false,
  loadingText,
  icon,
}) => {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const isDanger = confirmVariant === 'danger';
  const resolvedLoadingText =
    loadingText || (confirmText === 'Delete' ? 'Deleting...' : `${confirmText}...`);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                  isDanger
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}
              >
                {icon ||
                  (isDanger ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  ))}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 id={titleId} className="text-base sm:text-lg font-semibold tracking-tight text-[#0b3b2e]">
                  {title}
                </h3>
                <p id={descId} className="text-sm text-[#64748b] leading-relaxed break-words">
                  {message || (
                    <>
                      Are you sure you want to delete{' '}
                      {itemName ? (
                        <span className="font-semibold text-[#0b3b2e]">&quot;{itemName}&quot;</span>
                      ) : (
                        'this item'
                      )}
                      ? This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-3 mt-6">
              <Button variant="outline" size="md" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant={confirmVariant}
                size="md"
                loading={loading}
                loadingText={resolvedLoadingText}
                onClick={onConfirm}
                icon={isDanger && confirmText === 'Delete' ? <Trash2 className="w-4 h-4" /> : undefined}
                className={
                  isDanger
                    ? '!bg-rose-600 !text-white !border-rose-600 hover:!bg-rose-700 shadow-sm'
                    : ''
                }
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
