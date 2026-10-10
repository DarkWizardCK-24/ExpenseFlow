'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { demoSet, demoRemove, useDemoVersion } from '@/lib/demo-store';
import {
  SplitGroup,
  GroupExpense,
  GroupSettlement,
  GroupActivityLog,
  GroupMember,
} from '@/types';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export type GroupUpdate = Partial<Pick<SplitGroup, 'name' | 'category' | 'emoji' | 'members'>>;
export type GroupExpenseInput = Omit<GroupExpense, 'id' | 'createdAt' | 'createdBy'>;

const GROUP_SUBCOLLECTIONS = ['expenses', 'settlements', 'logs'] as const;

function readDemoGroups(): SplitGroup[] {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('demo_groups') : null;
  return saved ? JSON.parse(saved) : SAMPLE_DEMO_GROUPS;
}

function writeDemoGroups(list: SplitGroup[]) {
  demoSet('demo_groups', list);
}

const SAMPLE_DEMO_GROUPS: SplitGroup[] = [
  {
    id: 'grp-roadtrip',
    name: 'Goa Summer Trip',
    category: 'Trip',
    emoji: '🏖️',
    ownerUid: 'demo-user-flow',
    memberUids: ['demo-user-flow'],
    members: [
      { id: 'mem-1', name: 'Alex Johnson (You)', uid: 'demo-user-flow' },
      { id: 'mem-2', name: 'Maya Patel', email: 'maya@example.com' },
      { id: 'mem-3', name: 'Liam Chen', email: 'liam@example.com' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'grp-apartment',
    name: 'Apartment 402 Utilities',
    category: 'Home',
    emoji: '🏡',
    ownerUid: 'demo-user-flow',
    memberUids: ['demo-user-flow'],
    members: [
      { id: 'mem-1', name: 'Alex Johnson (You)', uid: 'demo-user-flow' },
      { id: 'mem-4', name: 'Sophia Miller', email: 'sophia@example.com' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

const SAMPLE_DEMO_EXPENSES: Record<string, GroupExpense[]> = {
  'grp-roadtrip': [
    {
      id: 'gexp-1',
      title: 'Beach Resort Booking',
      amount: 18000,
      categoryId: 'travel',
      paidBy: 'mem-1',
      splitType: 'equal',
      splits: { 'mem-1': 6000, 'mem-2': 6000, 'mem-3': 6000 },
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      createdBy: 'demo-user-flow',
    },
    {
      id: 'gexp-2',
      title: 'Seafood Shack Dinner',
      amount: 4500,
      categoryId: 'food',
      paidBy: 'mem-2',
      splitType: 'equal',
      splits: { 'mem-1': 1500, 'mem-2': 1500, 'mem-3': 1500 },
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdBy: 'demo-user-flow',
    },
  ],
  'grp-apartment': [
    {
      id: 'gexp-3',
      title: 'High-speed Fiber Internet',
      amount: 1800,
      categoryId: 'bills',
      paidBy: 'mem-1',
      splitType: 'equal',
      splits: { 'mem-1': 900, 'mem-4': 900 },
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      createdBy: 'demo-user-flow',
    },
  ],
};

const SAMPLE_DEMO_LOGS: Record<string, GroupActivityLog[]> = {
  'grp-roadtrip': [
    {
      id: 'log-1',
      type: 'created',
      message: 'Alex created group "Goa Summer Trip"',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'log-2',
      type: 'added',
      message: 'Alex added expense "Beach Resort Booking" (₹18,000)',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'log-3',
      type: 'added',
      message: 'Maya added expense "Seafood Shack Dinner" (₹4,500)',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  'grp-apartment': [
    {
      id: 'log-4',
      type: 'created',
      message: 'Alex created group "Apartment 402 Utilities"',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: 'log-5',
      type: 'added',
      message: 'Alex added expense "High-speed Fiber Internet" (₹1,800)',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
};

export function useGroups() {
  const { user, userProfile, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('demo_groups') : null;
      if (saved) {
        setGroups(JSON.parse(saved));
      } else {
        setGroups(SAMPLE_DEMO_GROUPS);
        if (typeof window !== 'undefined') {
          demoSet('demo_groups', SAMPLE_DEMO_GROUPS);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('memberUids', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SplitGroup[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SplitGroup, 'id'>) });
        });
        setGroups(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching groups:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isDemoMode, demoVersion]);

  const createGroup = async (data: {
    name: string;
    category: SplitGroup['category'];
    emoji: string;
    members: string[]; // member names
  }) => {
    const currentUserName = userProfile?.name || 'You';
    const currentUid = user?.uid || 'demo-user-flow';

    const memberObjects: GroupMember[] = [
      { id: `mem-user-${Date.now()}`, name: `${currentUserName} (You)`, uid: currentUid },
      ...data.members
        .filter((n) => n.trim() && n.trim().toLowerCase() !== currentUserName.toLowerCase())
        .map((n, i) => ({
          id: `mem-${Date.now()}-${i}`,
          name: n.trim(),
        })),
    ];

    const groupPayload: Omit<SplitGroup, 'id'> = {
      name: data.name,
      category: data.category,
      emoji: data.emoji,
      ownerUid: currentUid,
      memberUids: [currentUid],
      members: memberObjects,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newGroup: SplitGroup = { ...groupPayload, id: `grp-${Date.now()}` };
      const updated = [newGroup, ...groups];
      setGroups(updated);
      demoSet('demo_groups', updated);
      toast.success('Group created!');
      return newGroup.id;
    }

    try {
      const groupsRef = collection(db, 'groups');
      const docRef = await addDoc(groupsRef, groupPayload);

      // Create initial log
      const logsRef = collection(db, 'groups', docRef.id, 'logs');
      await addDoc(logsRef, {
        type: 'created',
        message: `${currentUserName} created group "${data.name}"`,
        createdAt: new Date().toISOString(),
        actorUid: currentUid,
      });

      toast.success('Group created!');
      return docRef.id;
    } catch (err) {
      console.error(err);
      toast.error('Failed to create group');
      throw err;
    }
  };

  const deleteGroup = async (gid: string) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = groups.filter((g) => g.id !== gid);
      setGroups(updated);
      writeDemoGroups(updated);
      ['demo_exp_', 'demo_set_', 'demo_logs_'].forEach((k) => demoRemove(`${k}${gid}`));
      toast.success('Group deleted');
      return;
    }

    try {
      // Firestore doesn't cascade deletes, so clear subcollections first, while the
      // group doc (which the security rules read) still exists.
      for (const sub of GROUP_SUBCOLLECTIONS) {
        const snap = await getDocs(collection(db, 'groups', gid, sub));
        if (snap.empty) continue;
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'groups', gid));
      toast.success('Group deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete group');
      throw err;
    }
  };

  return {
    groups,
    loading,
    createGroup,
    deleteGroup,
  };
}

export function useGroupDetail(gid: string) {
  const { user, userProfile, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [group, setGroup] = useState<SplitGroup | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [logs, setLogs] = useState<GroupActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gid) return;

    if (isDemoMode || !isFirebaseConfigured || !user) {
      // Demo detail
      const found = readDemoGroups().find((g) => g.id === gid) || null;
      setGroup(found);

      const savedExp = typeof window !== 'undefined' ? localStorage.getItem(`demo_exp_${gid}`) : null;
      setExpenses(savedExp ? JSON.parse(savedExp) : SAMPLE_DEMO_EXPENSES[gid] || []);

      const savedSet = typeof window !== 'undefined' ? localStorage.getItem(`demo_set_${gid}`) : null;
      setSettlements(savedSet ? JSON.parse(savedSet) : []);

      const savedLogs = typeof window !== 'undefined' ? localStorage.getItem(`demo_logs_${gid}`) : null;
      setLogs(savedLogs ? JSON.parse(savedLogs) : SAMPLE_DEMO_LOGS[gid] || []);

      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Group info
    const groupRef = doc(db, 'groups', gid);
    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...(docSnap.data() as Omit<SplitGroup, 'id'>) });
      } else {
        setGroup(null);
      }
    });

    // 2. Expenses
    const expRef = collection(db, 'groups', gid, 'expenses');
    const unsubExp = onSnapshot(expRef, (snap) => {
      const list: GroupExpense[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<GroupExpense, 'id'>) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExpenses(list);
    });

    // 3. Settlements
    const setRef = collection(db, 'groups', gid, 'settlements');
    const unsubSet = onSnapshot(setRef, (snap) => {
      const list: GroupSettlement[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<GroupSettlement, 'id'>) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSettlements(list);
    });

    // 4. Logs
    const logRef = collection(db, 'groups', gid, 'logs');
    const unsubLog = onSnapshot(logRef, (snap) => {
      const list: GroupActivityLog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<GroupActivityLog, 'id'>) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLogs(list);
      setLoading(false);
    });

    return () => {
      unsubGroup();
      unsubExp();
      unsubSet();
      unsubLog();
    };
  }, [gid, user, isDemoMode, demoVersion]);

  const money = (n: number) => formatCurrency(n, userProfile?.currency || 'INR');

  const pushDemoLog = (type: GroupActivityLog['type'], message: string) => {
    const newLog: GroupActivityLog = {
      id: `log-${Date.now()}`,
      type,
      message,
      createdAt: new Date().toISOString(),
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    demoSet(`demo_logs_${gid}`, updatedLogs);
  };

  const addLogToBatch = (
    batch: ReturnType<typeof writeBatch>,
    type: GroupActivityLog['type'],
    message: string
  ) => {
    batch.set(doc(collection(db, 'groups', gid, 'logs')), {
      type,
      message,
      createdAt: new Date().toISOString(),
      actorUid: user?.uid,
    });
  };

  const addExpense = async (data: GroupExpenseInput) => {
    const actor = userProfile?.name || 'A member';
    const expenseData: Omit<GroupExpense, 'id'> = {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || 'demo-user-flow',
    };

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newExp: GroupExpense = { ...expenseData, id: `gexp-${Date.now()}` };
      const updatedExp = [newExp, ...expenses];
      setExpenses(updatedExp);
      demoSet(`demo_exp_${gid}`, updatedExp);

      const newLog: GroupActivityLog = {
        id: `log-${Date.now()}`,
        type: 'added',
        message: `${actor} added expense "${data.title}" (${money(data.amount)})`,
        createdAt: new Date().toISOString(),
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      demoSet(`demo_logs_${gid}`, updatedLogs);

      toast.success('Expense added to group!');
      return newExp.id;
    }

    try {
      const batch = writeBatch(db);
      const expCol = collection(db, 'groups', gid, 'expenses');
      const newExpDoc = doc(expCol);
      batch.set(newExpDoc, expenseData);

      const logCol = collection(db, 'groups', gid, 'logs');
      const newLogDoc = doc(logCol);
      batch.set(newLogDoc, {
        type: 'added',
        message: `${actor} added expense "${data.title}" (${money(data.amount)})`,
        createdAt: new Date().toISOString(),
        actorUid: user.uid,
      });

      await batch.commit();
      toast.success('Expense added to group!');
      return newExpDoc.id;
    } catch (err) {
      console.error(err);
      toast.error('Failed to add expense');
      throw err;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    const actor = userProfile?.name || 'A member';
    const targetExp = expenses.find((e) => e.id === expenseId);

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updatedExp = expenses.filter((e) => e.id !== expenseId);
      setExpenses(updatedExp);
      demoSet(`demo_exp_${gid}`, updatedExp);

      const newLog: GroupActivityLog = {
        id: `log-${Date.now()}`,
        type: 'deleted',
        message: `${actor} deleted expense "${targetExp?.title || 'an item'}"`,
        createdAt: new Date().toISOString(),
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      demoSet(`demo_logs_${gid}`, updatedLogs);

      toast.success('Expense deleted');
      return;
    }

    try {
      const batch = writeBatch(db);
      const expDoc = doc(db, 'groups', gid, 'expenses', expenseId);
      batch.delete(expDoc);

      const logCol = collection(db, 'groups', gid, 'logs');
      const newLogDoc = doc(logCol);
      batch.set(newLogDoc, {
        type: 'deleted',
        message: `${actor} deleted expense "${targetExp?.title || 'an item'}"`,
        createdAt: new Date().toISOString(),
        actorUid: user.uid,
      });

      await batch.commit();
      toast.success('Expense deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete expense');
      throw err;
    }
  };

  const settleUp = async (fromId: string, toId: string, amount: number) => {
    const fromMember = group?.members.find((m) => m.id === fromId)?.name || 'Member';
    const toMember = group?.members.find((m) => m.id === toId)?.name || 'Member';
    const logMsg = `${fromMember} paid ${toMember} ${money(amount)}`;

    const settlementData: Omit<GroupSettlement, 'id'> = {
      from: fromId,
      to: toId,
      amount,
      createdAt: new Date().toISOString(),
    };

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newSet: GroupSettlement = { ...settlementData, id: `set-${Date.now()}` };
      const updatedSet = [newSet, ...settlements];
      setSettlements(updatedSet);
      demoSet(`demo_set_${gid}`, updatedSet);

      const newLog: GroupActivityLog = {
        id: `log-${Date.now()}`,
        type: 'settled',
        message: logMsg,
        createdAt: new Date().toISOString(),
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      demoSet(`demo_logs_${gid}`, updatedLogs);

      toast.success('Settlement recorded!');
      return;
    }

    try {
      const batch = writeBatch(db);
      const setCol = collection(db, 'groups', gid, 'settlements');
      const newSetDoc = doc(setCol);
      batch.set(newSetDoc, settlementData);

      const logCol = collection(db, 'groups', gid, 'logs');
      const newLogDoc = doc(logCol);
      batch.set(newLogDoc, {
        type: 'settled',
        message: logMsg,
        createdAt: new Date().toISOString(),
        actorUid: user.uid,
      });

      await batch.commit();
      toast.success('Settlement recorded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to record settlement');
      throw err;
    }
  };

  const updateGroup = async (data: GroupUpdate) => {
    if (!group) return;
    const actor = userProfile?.name || 'A member';
    const message = `${actor} updated group details`;

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updatedGroup: SplitGroup = { ...group, ...data };
      setGroup(updatedGroup);
      writeDemoGroups(readDemoGroups().map((g) => (g.id === gid ? updatedGroup : g)));
      pushDemoLog('edited', message);
      toast.success('Group updated');
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'groups', gid), data);
      addLogToBatch(batch, 'edited', message);
      await batch.commit();
      toast.success('Group updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update group');
      throw err;
    }
  };

  const updateExpense = async (expenseId: string, data: GroupExpenseInput) => {
    const actor = userProfile?.name || 'A member';
    const message = `${actor} edited expense "${data.title}" (${money(data.amount)})`;

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updatedExp = expenses.map((e) => (e.id === expenseId ? { ...e, ...data } : e));
      setExpenses(updatedExp);
      demoSet(`demo_exp_${gid}`, updatedExp);
      pushDemoLog('edited', message);
      toast.success('Expense updated');
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'groups', gid, 'expenses', expenseId), data);
      addLogToBatch(batch, 'edited', message);
      await batch.commit();
      toast.success('Expense updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update expense');
      throw err;
    }
  };

  const deleteSettlement = async (settlementId: string) => {
    const target = settlements.find((st) => st.id === settlementId);
    const name = (id?: string) => group?.members.find((m) => m.id === id)?.name || 'Member';
    const message = target
      ? `Settlement ${name(target.from)} → ${name(target.to)} (${money(target.amount)}) was undone`
      : 'A settlement was undone';

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updatedSet = settlements.filter((st) => st.id !== settlementId);
      setSettlements(updatedSet);
      demoSet(`demo_set_${gid}`, updatedSet);
      pushDemoLog('deleted', message);
      toast.success('Settlement undone');
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'groups', gid, 'settlements', settlementId));
      addLogToBatch(batch, 'deleted', message);
      await batch.commit();
      toast.success('Settlement undone');
    } catch (err) {
      console.error(err);
      toast.error('Failed to undo settlement');
      throw err;
    }
  };

  /** True if a member appears in any expense or settlement (and so can't be removed). */
  const isMemberInvolved = (memberId: string) =>
    expenses.some((e) => e.paidBy === memberId || (e.splits[memberId] ?? 0) > 0) ||
    settlements.some((st) => st.from === memberId || st.to === memberId);

  return {
    group,
    expenses,
    settlements,
    logs,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    settleUp,
    deleteSettlement,
    updateGroup,
    isMemberInvolved,
  };
}
