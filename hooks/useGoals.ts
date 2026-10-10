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
  increment,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { demoSet, demoRemove, useDemoVersion } from '@/lib/demo-store';
import { Goal, GoalLog } from '@/types';
import { toast } from 'sonner';

const SAMPLE_DEMO_GOALS: Goal[] = [
  {
    id: 'goal-japan',
    name: 'Trip to Tokyo',
    category: 'Travel',
    emoji: '🗾',
    target: 250000,
    saved: 185000,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'goal-emergency',
    name: 'Emergency Fund',
    category: 'Safety',
    emoji: '🛡️',
    target: 300000,
    saved: 210000,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'goal-macbook',
    name: 'New M4 MacBook Pro',
    category: 'Gadget',
    emoji: '💻',
    target: 169900,
    saved: 169900,
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
];

const SAMPLE_DEMO_GOAL_LOGS: Record<string, GoalLog[]> = {
  'goal-japan': [
    {
      id: 'glog-1',
      type: 'deposit',
      amount: 25000,
      note: 'Monthly savings contribution',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'glog-2',
      type: 'deposit',
      amount: 1000,
      note: 'Freelance project bonus',
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    },
    {
      id: 'glog-3',
      type: 'deposit',
      amount: 1000,
      note: 'Starting budget allocation',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ],
};

export type GoalUpdate = Partial<Pick<Goal, 'name' | 'category' | 'emoji' | 'target'>>;

function readDemoGoals(): Goal[] {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('demo_goals') : null;
  return saved ? JSON.parse(saved) : SAMPLE_DEMO_GOALS;
}

function writeDemoGoals(list: Goal[]) {
  demoSet('demo_goals', list);
}

/** Firestore doesn't cascade deletes, so remove the goal's logs along with it. */
async function deleteGoalDoc(uid: string, goalId: string) {
  const batch = writeBatch(db);
  const logsSnap = await getDocs(collection(db, 'users', uid, 'goals', goalId, 'logs'));
  logsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'users', uid, 'goals', goalId));
  await batch.commit();
}

/**
 * Deposits (amount > 0) or withdraws (amount < 0) and logs it. `uid` null = demo/local mode,
 * where the demo-store sync event refreshes every mounted goals hook.
 */
async function applyGoalFunds(uid: string | null, goalId: string, amount: number, note?: string) {
  const log = {
    type: amount >= 0 ? ('deposit' as const) : ('withdrawal' as const),
    amount: Math.abs(amount),
    note: note || (amount >= 0 ? 'Contribution' : 'Withdrawal'),
    createdAt: new Date().toISOString(),
  };

  if (!uid) {
    writeDemoGoals(
      readDemoGoals().map((g) => (g.id === goalId ? { ...g, saved: Math.max(0, g.saved + amount) } : g))
    );
    const savedLogs = localStorage.getItem(`demo_goal_logs_${goalId}`);
    const existing: GoalLog[] = savedLogs ? JSON.parse(savedLogs) : SAMPLE_DEMO_GOAL_LOGS[goalId] || [];
    demoSet(`demo_goal_logs_${goalId}`, [{ ...log, id: `glog-${Date.now()}` }, ...existing]);
    return;
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid, 'goals', goalId), { saved: increment(amount) });
  batch.set(doc(collection(db, 'users', uid, 'goals', goalId, 'logs')), log);
  await batch.commit();
}

export function useGoals() {
  const { user, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('demo_goals') : null;
      if (saved) {
        setGoals(JSON.parse(saved));
      } else {
        setGoals(SAMPLE_DEMO_GOALS);
        if (typeof window !== 'undefined') {
          demoSet('demo_goals', SAMPLE_DEMO_GOALS);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const goalsRef = collection(db, 'users', user.uid, 'goals');
    const unsub = onSnapshot(
      goalsRef,
      (snapshot) => {
        const list: Goal[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Goal, 'id'>) }));
        setGoals(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching goals:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, isDemoMode, demoVersion]);

  const createGoal = async (data: {
    name: string;
    category: Goal['category'];
    emoji: string;
    target: number;
    startingAmount: number;
  }) => {
    const goalData: Omit<Goal, 'id'> = {
      name: data.name,
      category: data.category,
      emoji: data.emoji,
      target: data.target,
      saved: data.startingAmount,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newGoal: Goal = { ...goalData, id: `goal-${Date.now()}` };
      const updated = [newGoal, ...goals];
      setGoals(updated);
      demoSet('demo_goals', updated);

      if (data.startingAmount > 0) {
        const initialLog: GoalLog = {
          id: `glog-${Date.now()}`,
          type: 'deposit',
          amount: data.startingAmount,
          note: 'Starting balance',
          createdAt: new Date().toISOString(),
        };
        demoSet(`demo_goal_logs_${newGoal.id}`, [initialLog]);
      }

      toast.success('Savings goal created!');
      return newGoal.id;
    }

    try {
      const batch = writeBatch(db);
      const goalsRef = collection(db, 'users', user.uid, 'goals');
      const newGoalDoc = doc(goalsRef);
      batch.set(newGoalDoc, goalData);

      if (data.startingAmount > 0) {
        const logsRef = collection(db, 'users', user.uid, 'goals', newGoalDoc.id, 'logs');
        const newLogDoc = doc(logsRef);
        batch.set(newLogDoc, {
          type: 'deposit',
          amount: data.startingAmount,
          note: 'Starting balance',
          createdAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      toast.success('Savings goal created!');
      return newGoalDoc.id;
    } catch (err) {
      console.error(err);
      toast.error('Failed to create goal');
      throw err;
    }
  };

  const updateGoal = async (goalId: string, data: GoalUpdate) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = goals.map((g) => (g.id === goalId ? { ...g, ...data } : g));
      setGoals(updated);
      writeDemoGoals(updated);
      toast.success('Goal updated');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid, 'goals', goalId), data);
      toast.success('Goal updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update goal');
      throw err;
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = goals.filter((g) => g.id !== goalId);
      setGoals(updated);
      writeDemoGoals(updated);
      demoRemove(`demo_goal_logs_${goalId}`);
      toast.success('Goal deleted');
      return;
    }

    try {
      await deleteGoalDoc(user.uid, goalId);
      toast.success('Goal deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete goal');
      throw err;
    }
  };

  const addFunds = async (goalId: string, amount: number, note?: string) => {
    const demo = isDemoMode || !isFirebaseConfigured || !user;
    try {
      await applyGoalFunds(demo ? null : user.uid, goalId, amount, note);
      toast.success(amount >= 0 ? 'Funds added!' : 'Funds withdrawn');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update funds');
      throw err;
    }
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addFunds,
  };
}

export function useGoalDetail(goalId: string) {
  const { user, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [logs, setLogs] = useState<GoalLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!goalId) return;

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const found = readDemoGoals().find((g) => g.id === goalId) || null;
      setGoal(found);

      const savedLogs = typeof window !== 'undefined' ? localStorage.getItem(`demo_goal_logs_${goalId}`) : null;
      setLogs(savedLogs ? JSON.parse(savedLogs) : SAMPLE_DEMO_GOAL_LOGS[goalId] || []);

      setLoading(false);
      return;
    }

    setLoading(true);

    const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
    let goalLoaded = false;
    let logsLoaded = false;
    const markLoaded = () => {
      if (goalLoaded && logsLoaded) setLoading(false);
    };

    const unsubGoal = onSnapshot(goalRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoal({ id: docSnap.id, ...(docSnap.data() as Omit<Goal, 'id'>) });
      } else {
        setGoal(null);
      }
      goalLoaded = true;
      markLoaded();
    });

    const logsRef = collection(db, 'users', user.uid, 'goals', goalId, 'logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'));
    const unsubLogs = onSnapshot(q, (snap) => {
      const list: GoalLog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<GoalLog, 'id'>) }));
      setLogs(list);
      logsLoaded = true;
      markLoaded();
    });

    return () => {
      unsubGoal();
      unsubLogs();
    };
  }, [goalId, user, isDemoMode, demoVersion]);

  const addFunds = async (amount: number, note?: string) => {
    const demo = isDemoMode || !isFirebaseConfigured || !user;
    try {
      await applyGoalFunds(demo ? null : user.uid, goalId, amount, note);
      toast.success(amount >= 0 ? 'Funds added!' : 'Funds withdrawn');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update funds');
      throw err;
    }
  };

  const updateGoal = async (data: GoalUpdate) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      if (!goal) return;
      const updatedGoal: Goal = { ...goal, ...data };
      setGoal(updatedGoal);
      writeDemoGoals(readDemoGoals().map((g) => (g.id === goalId ? updatedGoal : g)));
      toast.success('Goal updated');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid, 'goals', goalId), data);
      toast.success('Goal updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update goal');
      throw err;
    }
  };

  const deleteGoal = async () => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      writeDemoGoals(readDemoGoals().filter((g) => g.id !== goalId));
      demoRemove(`demo_goal_logs_${goalId}`);
      toast.success('Goal deleted');
      return;
    }

    try {
      await deleteGoalDoc(user.uid, goalId);
      toast.success('Goal deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete goal');
      throw err;
    }
  };

  return {
    goal,
    logs,
    loading,
    addFunds,
    updateGoal,
    deleteGoal,
  };
}
