'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { demoSet, useDemoVersion } from '@/lib/demo-store';
import { AppNotification } from '@/types';
import { toast } from 'sonner';

const SAMPLE_DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    icon: '💸',
    title: 'Expense Added',
    body: 'Whole Foods Market expense of $145.80 recorded.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'notif-2',
    icon: '🎯',
    title: 'Goal Milestone reached!',
    body: 'You reached 70% of your "Trip to Tokyo" savings goal.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-3',
    icon: '👥',
    title: 'Goa Summer Trip Split',
    body: 'Maya added expense "Seafood Shack Dinner". Your share is $60.00.',
    read: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export function useNotifications() {
  const { user, userProfile, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('demo_notifications') : null;
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications(SAMPLE_DEMO_NOTIFICATIONS);
        if (typeof window !== 'undefined') {
          demoSet('demo_notifications', SAMPLE_DEMO_NOTIFICATIONS);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, isDemoMode, demoVersion]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotifications(updated);
      demoSet('demo_notifications', updated);
      return;
    }

    try {
      const notifDoc = doc(db, 'users', user.uid, 'notifications', id);
      await updateDoc(notifDoc, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
      demoSet('demo_notifications', updated);
      toast.success('All marked as read');
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const n of notifications) {
        if (!n.read) {
          const notifDoc = doc(db, 'users', user.uid, 'notifications', n.id);
          batch.update(notifDoc, { read: true });
        }
      }
      await batch.commit();
      toast.success('All marked as read');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark all as read');
    }
  };

  const clearAllNotifications = async () => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      setNotifications([]);
      demoSet('demo_notifications', []);
      toast.success('Notifications cleared');
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const n of notifications) {
        const notifDoc = doc(db, 'users', user.uid, 'notifications', n.id);
        batch.delete(notifDoc);
      }
      await batch.commit();
      toast.success('Notifications cleared');
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear notifications');
    }
  };

  const triggerNotification = async (data: { icon: string; title: string; body: string }) => {
    if (userProfile?.prefs?.notif === false) return; // user disabled notifications

    const notifPayload = {
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newNotif: AppNotification = { ...notifPayload, id: `notif-${Date.now()}` };
      const updated = [newNotif, ...notifications];
      setNotifications(updated);
      demoSet('demo_notifications', updated);
      return;
    }

    try {
      const notifsRef = collection(db, 'users', user.uid, 'notifications');
      await addDoc(notifsRef, notifPayload);
    } catch (err) {
      console.error('Failed to trigger notification:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    triggerNotification,
  };
}
