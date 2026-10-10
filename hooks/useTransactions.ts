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
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { demoSet, useDemoVersion } from '@/lib/demo-store';
import { Transaction, Category } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/seed-data';
import { toast } from 'sonner';

const SAMPLE_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Monthly Salary Credit',
    amount: 85000,
    type: 'income',
    categoryId: 'others',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank',
    note: 'Monthly paycheck',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    title: 'Blinkit & Fresh Groceries',
    amount: 3450,
    type: 'expense',
    categoryId: 'food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    note: 'Weekly essentials and fruits',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    title: 'Electricity & Broadband Bill',
    amount: 2850,
    type: 'expense',
    categoryId: 'bills',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    paymentMethod: 'UPI',
    note: 'Home utilities',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx-4',
    title: 'Ola / Uber City Ride',
    amount: 480,
    type: 'expense',
    categoryId: 'travel',
    date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    paymentMethod: 'UPI',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'tx-5',
    title: 'Weekend Dining & Cinema',
    amount: 2400,
    type: 'expense',
    categoryId: 'fun',
    date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    paymentMethod: 'Card',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'tx-6',
    title: 'Freelance Design Consulting',
    amount: 35000,
    type: 'income',
    categoryId: 'others',
    date: new Date(Date.now() - 86400000 * 9).toISOString().split('T')[0],
    paymentMethod: 'Bank',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
];

export function useTransactions() {
  const { user, isDemoMode } = useAuth();
  const demoVersion = useDemoVersion(isDemoMode || !isFirebaseConfigured || !user);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // False while Firestore has no category docs and we're showing in-memory defaults
  const [categoriesPersisted, setCategoriesPersisted] = useState(true);

  // Load Categories & Transactions
  useEffect(() => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      // Demo mode fallback
      const savedTx = typeof window !== 'undefined' ? localStorage.getItem('demo_transactions') : null;
      if (savedTx) {
        setTransactions(JSON.parse(savedTx));
      } else {
        setTransactions(SAMPLE_DEMO_TRANSACTIONS);
        if (typeof window !== 'undefined') {
          demoSet('demo_transactions', SAMPLE_DEMO_TRANSACTIONS);
        }
      }

      const savedCats = typeof window !== 'undefined' ? localStorage.getItem('demo_categories') : null;
      if (savedCats) {
        setCategories(JSON.parse(savedCats));
      } else {
        const initialCats: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          id: c.id || `cat-${i}`,
        }));
        setCategories(initialCats);
        if (typeof window !== 'undefined') {
          demoSet('demo_categories', initialCats);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Categories listener
    const catsRef = collection(db, 'users', user.uid, 'categories');
    const unsubCats = onSnapshot(catsRef, (snapshot) => {
      const catsList: Category[] = [];
      snapshot.forEach((docSnap) => {
        catsList.push({ id: docSnap.id, ...(docSnap.data() as Omit<Category, 'id'>) });
      });
      if (catsList.length === 0) {
        setCategories(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: c.id || `cat-${i}` })));
        setCategoriesPersisted(false);
      } else {
        setCategories(catsList);
        setCategoriesPersisted(true);
      }
    });

    // 2. Transactions listener
    const txRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(txRef, orderBy('date', 'desc'));
    const unsubTx = onSnapshot(
      q,
      (snapshot) => {
        const txList: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          txList.push({ id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) });
        });
        setTransactions(txList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to sync transactions');
        setLoading(false);
      }
    );

    return () => {
      unsubCats();
      unsubTx();
    };
  }, [user, isDemoMode, demoVersion]);

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      demoSet('demo_transactions', updated);
      toast.success('Transaction added');
      return newTx.id;
    }

    try {
      const txRef = collection(db, 'users', user.uid, 'transactions');
      const docRef = await addDoc(txRef, {
        ...data,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp(),
      });
      toast.success('Transaction added');
      return docRef.id;
    } catch (err) {
      console.error(err);
      toast.error('Failed to add transaction');
      throw err;
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
      setTransactions(updated);
      demoSet('demo_transactions', updated);
      toast.success('Transaction updated');
      return;
    }

    try {
      const txDoc = doc(db, 'users', user.uid, 'transactions', id);
      await updateDoc(txDoc, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Transaction updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update transaction');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      demoSet('demo_transactions', updated);
      toast.success('Transaction deleted');
      return;
    }

    try {
      const txDoc = doc(db, 'users', user.uid, 'transactions', id);
      await deleteDoc(txDoc);
      toast.success('Transaction deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete transaction');
      throw err;
    }
  };

  // Writing the first custom category to an empty collection would hide the in-memory
  // defaults, so save them to Firestore before any category write.
  const persistDefaultCategories = async (uid: string) => {
    if (categoriesPersisted) return;
    const batch = writeBatch(db);
    categories.forEach(({ id, ...rest }) => {
      batch.set(doc(db, 'users', uid, 'categories', id), rest);
    });
    await batch.commit();
    setCategoriesPersisted(true);
  };

  const addCategory = async (cat: Omit<Category, 'id'>) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const newCat: Category = {
        ...cat,
        id: `cat-${Date.now()}`,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      demoSet('demo_categories', updated);
      toast.success('Category created');
      return newCat;
    }

    try {
      await persistDefaultCategories(user.uid);
      const catsRef = collection(db, 'users', user.uid, 'categories');
      const docRef = await addDoc(catsRef, cat);
      toast.success('Category created');
      return { id: docRef.id, ...cat };
    } catch (err) {
      console.error(err);
      toast.error('Failed to create category');
      throw err;
    }
  };

  const updateCategory = async (id: string, data: Partial<Omit<Category, 'id'>>) => {
    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = categories.map((c) => (c.id === id ? { ...c, ...data } : c));
      setCategories(updated);
      demoSet('demo_categories', updated);
      toast.success('Category updated');
      return;
    }

    try {
      await persistDefaultCategories(user.uid);
      const existing = categories.find((c) => c.id === id);
      const { id: _id, ...rest } = { ...existing, ...data } as Category;
      await setDoc(doc(db, 'users', user.uid, 'categories', id), rest, { merge: true });
      toast.success('Category updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category');
      throw err;
    }
  };

  /** Number of transactions that reference a category — such categories can't be deleted. */
  const getCategoryUsage = (id: string) => transactions.filter((t) => t.categoryId === id).length;

  const deleteCategory = async (id: string) => {
    const usage = getCategoryUsage(id);
    if (usage > 0) {
      toast.error(`This category is used by ${usage} transaction${usage > 1 ? 's' : ''}. Reassign them first.`);
      throw new Error('Category in use');
    }

    if (isDemoMode || !isFirebaseConfigured || !user) {
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      demoSet('demo_categories', updated);
      toast.success('Category deleted');
      return;
    }

    try {
      await persistDefaultCategories(user.uid);
      await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
      toast.success('Category deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete category');
      throw err;
    }
  };

  return {
    transactions,
    categories,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryUsage,
  };
}
