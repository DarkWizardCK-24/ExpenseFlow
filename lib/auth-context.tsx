'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from './firebase';
import { UserProfile } from '@/types';
import { seedDefaultCategories } from './seed-data';

export interface SignUpParams {
  name: string;
  email: string;
  pass: string;
  phone?: string;
  currency?: string;
  monthlyBudget?: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    dataOrName: SignUpParams | string,
    emailArg?: string,
    passArg?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_PROFILE: UserProfile = {
  uid: 'demo-user-flow',
  name: 'Alex Johnson',
  email: 'alex.flow@example.com',
  phone: '+91 98765 43210',
  photoURL: '',
  currency: 'INR',
  monthlyBudget: 50000,
  plan: 'pro',
  prefs: {
    notif: true,
    alerts: true,
    weekly: true,
  },
  createdAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if demo mode was previously active
    const savedDemo = typeof window !== 'undefined' ? localStorage.getItem('expenseflow_demo_mode') : null;
    if (savedDemo === 'true') {
      setIsDemoMode(true);
      setUserProfile(DEMO_USER_PROFILE);
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Listen to realtime profile changes
        const unsubsProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // First time login - initialize profile
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || 'ExpenseFlow User',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || '',
              photoURL: '',
              currency: 'INR',
              monthlyBudget: 50000,
              plan: 'free',
              prefs: {
                notif: true,
                alerts: true,
                weekly: true,
              },
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            await seedDefaultCategories(currentUser.uid);
          }
          setLoading(false);
        });

        return () => unsubsProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const enableDemoMode = () => {
    setIsDemoMode(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('expenseflow_demo_mode', 'true');
    }
    setUserProfile(DEMO_USER_PROFILE);
    setLoading(false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!isFirebaseConfigured) {
      enableDemoMode();
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (
    dataOrName: SignUpParams | string,
    emailArg?: string,
    passArg?: string
  ) => {
    let name = '';
    let email = '';
    let pass = '';
    let phone = '';
    let currency = 'USD';
    let monthlyBudget = 2500;

    if (typeof dataOrName === 'string') {
      name = dataOrName;
      email = emailArg || '';
      pass = passArg || '';
    } else {
      name = dataOrName.name;
      email = dataOrName.email;
      pass = dataOrName.pass;
      phone = dataOrName.phone || '';
      currency = dataOrName.currency || 'INR';
      monthlyBudget = dataOrName.monthlyBudget || 50000;
    }

    if (!isFirebaseConfigured) {
      const customDemoProfile: UserProfile = {
        uid: 'demo-user-flow',
        name,
        email,
        phone,
        currency,
        monthlyBudget,
        plan: 'free',
        prefs: { notif: true, alerts: true, weekly: true },
        createdAt: new Date().toISOString(),
      };
      setIsDemoMode(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('expenseflow_demo_mode', 'true');
      }
      setUserProfile(customDemoProfile);
      setLoading(false);
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const userDocRef = doc(db, 'users', cred.user.uid);
    const initialProfile: UserProfile = {
      uid: cred.user.uid,
      name,
      email,
      phone,
      currency,
      monthlyBudget,
      plan: 'free',
      prefs: {
        notif: true,
        alerts: true,
        weekly: true,
      },
      createdAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, initialProfile);
    await seedDefaultCategories(cred.user.uid);
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      enableDemoMode();
      return;
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        const initialProfile: UserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          phone: result.user.phoneNumber || '',
          photoURL: '',
          currency: 'INR',
          monthlyBudget: 50000,
          plan: 'free',
          prefs: {
            notif: true,
            alerts: true,
            weekly: true,
          },
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, initialProfile);
        await seedDefaultCategories(result.user.uid);
      }
    }
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) {
      return;
    }
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('expenseflow_demo_mode');
      }
      setUserProfile(null);
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (isDemoMode) {
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
      return;
    }
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, data, { merge: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isDemoMode,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        logout,
        updateProfileData,
        enableDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
