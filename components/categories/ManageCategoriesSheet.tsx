'use client';

import React, { useState } from 'react';
import { Category } from '@/types';
import { useTransactions } from '@/hooks/useTransactions';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CategoryForm } from '../forms/CategoryForm';
import { ArrowLeft, Pencil, Plus, Tags, Trash2 } from 'lucide-react';

interface ManageCategoriesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; category: Category };

const ManageCategoriesContent: React.FC<ManageCategoriesSheetProps> = ({ isOpen, onClose }) => {
  const { categories, loading, addCategory, updateCategory, deleteCategory, getCategoryUsage } =
    useTransactions();

  const [view, setView] = useState<View>({ mode: 'list' });
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleClose = () => {
    setView({ mode: 'list' });
    onClose();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Hook shows the reason (e.g. category in use).
    } finally {
      setDeleting(false);
    }
  };

  const title =
    view.mode === 'create' ? 'New Category' : view.mode === 'edit' ? 'Edit Category' : 'Manage Categories';
  const description =
    view.mode === 'list'
      ? `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · used to organise your transactions`
      : view.mode === 'edit'
      ? `Changes apply to all transactions in "${view.category.name}"`
      : 'Pick a name, icon and color';

  return (
    <>
      <Sheet isOpen={isOpen} onClose={handleClose} title={title} description={description} maxWidth="max-w-lg">
        {view.mode === 'list' ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              className="w-full"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setView({ mode: 'create' })}
            >
              Add category
            </Button>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Tags className="w-6 h-6" />
                </div>
                <p className="text-sm text-[#64748b] mt-3">No categories yet. Create your first one.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {categories.map((cat) => {
                  const usage = getCategoryUsage(cat.id);
                  const inUse = usage > 0;
                  return (
                    <li
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-card transition-all"
                    >
                      <span
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}1f` }}
                        aria-hidden="true"
                      >
                        {cat.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                            aria-hidden="true"
                          />
                          <p className="font-semibold text-sm text-[#0b3b2e] truncate">{cat.name}</p>
                          {cat.isDefault && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          {inUse ? `${usage} transaction${usage === 1 ? '' : 's'}` : 'Not used yet'}
                        </p>
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        <button
                          type="button"
                          aria-label={`Edit ${cat.name}`}
                          title="Edit"
                          onClick={() => setView({ mode: 'edit', category: cat })}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={
                            inUse
                              ? `Can't delete ${cat.name}: used by ${usage} transaction${usage === 1 ? '' : 's'}`
                              : `Delete ${cat.name}`
                          }
                          title={
                            inUse
                              ? `Used by ${usage} transaction${usage === 1 ? '' : 's'} — reassign them before deleting`
                              : 'Delete'
                          }
                          disabled={inUse}
                          onClick={() => setPendingDelete(cat)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {categories.some((c) => getCategoryUsage(c.id) > 0) && (
              <p className="text-[11px] text-[#64748b] text-center">
                Categories with transactions can&apos;t be deleted. Move those transactions to another category first.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView({ mode: 'list' })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All categories
            </button>
            <CategoryForm
              key={view.mode === 'edit' ? view.category.id : 'new'}
              initialData={view.mode === 'edit' ? view.category : undefined}
              onSubmit={async (data) => {
                if (view.mode === 'edit') {
                  await updateCategory(view.category.id, data);
                } else {
                  await addCategory(data);
                }
                setView({ mode: 'list' });
              }}
              onCancel={() => setView({ mode: 'list' })}
            />
          </div>
        )}
      </Sheet>

      {/* Rendered outside the Sheet so its fixed positioning isn't affected by the Sheet's transform. */}
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete category?"
        itemName={pendingDelete ? `${pendingDelete.emoji} ${pendingDelete.name}` : undefined}
        loading={deleting}
      />
    </>
  );
};

/**
 * Sheet for creating, editing and deleting categories.
 * The content is remounted every time the sheet opens so data (e.g. usage counts) is fresh,
 * including in demo mode where hook instances don't share state.
 */
export const ManageCategoriesSheet: React.FC<ManageCategoriesSheetProps> = ({ isOpen, onClose }) => {
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setOpenCount((c) => c + 1);
  }

  return <ManageCategoriesContent key={openCount} isOpen={isOpen} onClose={onClose} />;
};
