'use client';

import React, { useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCheck, Trash2, Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/format';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const titleId = useId();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } =
    useNotifications();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-start md:justify-end md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-emerald-950/30 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full md:w-[400px] bg-white rounded-t-[28px] md:rounded-3xl shadow-2xl border border-emerald-100 flex flex-col max-h-[85vh] z-10 overflow-hidden md:mt-12"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id={titleId} className="text-base font-bold text-[#0b3b2e]">
                    Notifications
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      disabled={unreadCount === 0}
                      aria-label="Mark all as read"
                      title="Mark all as read"
                      className="w-9 h-9 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAllNotifications()}
                      aria-label="Clear all notifications"
                      title="Clear all"
                      className="w-9 h-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto overscroll-contain p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {notifications.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <BellOff className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-[#0b3b2e] text-sm">No notifications yet</h4>
                  <p className="text-xs text-[#64748b] mt-1 max-w-[260px] mx-auto">
                    Budget alerts, split updates and reminders will show up here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          if (n.link) {
                            onClose();
                            router.push(n.link);
                          }
                        }}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                          n.read ? 'hover:bg-slate-50' : 'bg-emerald-50/60 hover:bg-emerald-50'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-lg flex-shrink-0 shadow-xs"
                        >
                          {n.icon || '🔔'}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={`text-sm leading-snug ${
                                n.read ? 'font-medium text-slate-700' : 'font-bold text-[#0b3b2e]'
                              }`}
                            >
                              {n.title}
                            </span>
                            <span className="text-[11px] text-[#94a3b8] whitespace-nowrap mt-0.5">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </span>
                          <span className="block text-xs text-[#64748b] mt-0.5 line-clamp-2">{n.body}</span>
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
