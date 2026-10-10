'use client';

import React, { useState } from 'react';
import { Transaction, Category } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useSwipeToDelete } from '@/hooks/useSwipeToDelete';
import { Pencil, Trash2, CreditCard, Landmark, Banknote, Smartphone } from 'lucide-react';

interface ExpenseCardProps {
  transaction: Transaction;
  category?: Category;
  currency?: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void> | void;
  /** Hide the date in the meta line (e.g. when the list is already grouped by date). */
  hideDate?: boolean;
  /** Disable the swipe-left-to-delete gesture. */
  disableSwipe?: boolean;
  /** Wrapper classes. Defaults to `my-2` for backwards compatibility. */
  className?: string;
}

const PAYMENT_ICONS = {
  UPI: Smartphone,
  Card: CreditCard,
  Bank: Landmark,
  Cash: Banknote,
} as const;

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  transaction,
  category,
  currency = 'INR',
  onEdit,
  onDelete,
  hideDate = false,
  disableSwipe = false,
  className = 'my-2',
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { dragProps } = useSwipeToDelete({
    onDelete: () => setShowConfirm(true),
    threshold: 80,
  });

  const isIncome = transaction.type === 'income';
  const categoryColor = category?.color || (isIncome ? '#10b981' : '#64748b');
  const categoryEmoji = category?.emoji || (isIncome ? '💰' : '📦');
  const categoryName = category?.name || (isIncome ? 'Income' : 'Uncategorized');
  const PaymentIcon = PAYMENT_ICONS[transaction.paymentMethod] || Banknote;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(transaction.id);
      setShowConfirm(false);
    } catch {
      // Hook already surfaces a toast; keep the dialog open so the user can retry.
    } finally {
      setDeleting(false);
    }
  };

  // Don't start a swipe when the press begins on an action button.
  const swipeProps = disableSwipe
    ? {}
    : {
        ...dragProps,
        onPointerDown: (e: React.PointerEvent) => {
          if ((e.target as HTMLElement).closest('button')) return;
          dragProps.onPointerDown(e);
        },
        onPointerLeave: dragProps.onPointerCancel,
      };

  const actionBtn =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl select-none group ${className}`}>
        {/* Swipe reveal zone */}
        {!disableSwipe && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-28 bg-rose-500 rounded-r-2xl flex items-center justify-end pr-6 text-white"
          >
            <Trash2 className="w-5 h-5" />
          </div>
        )}

        {/* Card body */}
        <div
          {...swipeProps}
          className="relative z-10 bg-white rounded-2xl shadow-card border border-slate-100 p-3.5 sm:p-4 transition-shadow hover:shadow-card-hover flex items-center gap-3"
          style={disableSwipe ? undefined : dragProps.style}
        >
          {/* Category icon */}
          <div
            style={{ backgroundColor: `${categoryColor}1f` }}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            aria-hidden="true"
          >
            {categoryEmoji}
          </div>

          {/* Title + meta */}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-[#0b3b2e] truncate">{transaction.title}</h4>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#64748b] min-w-0">
              <span className="flex items-center gap-1 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: categoryColor }}
                />
                <span className="truncate">{categoryName}</span>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                •
              </span>
              <span className="flex items-center gap-1 flex-shrink-0" title={transaction.paymentMethod}>
                <PaymentIcon className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">{transaction.paymentMethod}</span>
                <span className="sr-only sm:hidden">{transaction.paymentMethod}</span>
              </span>
              {!hideDate && (
                <>
                  <span className="text-slate-300" aria-hidden="true">
                    •
                  </span>
                  <span className="flex-shrink-0 whitespace-nowrap">
                    {formatDate(transaction.date, 'MMM d')}
                  </span>
                </>
              )}
            </div>
            {transaction.note && (
              <p className="hidden sm:block text-xs text-slate-400 truncate mt-0.5">{transaction.note}</p>
            )}
          </div>

          {/* Amount + actions (stacked on mobile, inline on larger screens) */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-3 flex-shrink-0">
            <span
              className={`text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap ${
                isIncome ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isIncome ? '+' : '−'}
              {formatCurrency(transaction.amount, currency)}
            </span>

            <div className="flex items-center -mr-1.5 sm:mr-0 sm:opacity-60 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                aria-label={`Edit ${transaction.title}`}
                title="Edit"
                onClick={() => onEdit(transaction)}
                className={`${actionBtn} hover:text-emerald-700 hover:bg-emerald-50`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${transaction.title}`}
                title="Delete"
                onClick={() => setShowConfirm(true)}
                className={`${actionBtn} hover:text-rose-600 hover:bg-rose-50`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete transaction?"
        itemName={transaction.title}
        loading={deleting}
      />
    </>
  );
};
