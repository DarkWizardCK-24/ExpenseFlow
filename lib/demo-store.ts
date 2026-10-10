'use client';

import { useEffect, useState } from 'react';

// In demo/local mode every hook instance keeps its own React state, backed by localStorage.
// Writes go through these helpers so that other mounted instances (e.g. the global
// "Add" sheet in the layout vs. the page underneath) re-read storage and stay in sync.

const DEMO_SYNC_EVENT = 'expenseflow:demo-sync';

export function demoSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(DEMO_SYNC_EVENT, { detail: key }));
}

export function demoRemove(key: string) {
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(DEMO_SYNC_EVENT, { detail: key }));
}

/**
 * Returns a counter that bumps whenever demo storage changes (in this tab or another).
 * Add it to a hook's load-effect deps so the demo branch re-reads localStorage.
 */
export function useDemoVersion(enabled: boolean) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const bump = () => setVersion((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('demo_')) bump();
    };
    window.addEventListener(DEMO_SYNC_EVENT, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(DEMO_SYNC_EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);

  return version;
}
