'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Hydration-safe client state without setState-in-effect.
 *
 * Reading localStorage or the DOM in an effect and calling setState triggers a
 * cascading render and is flagged by react-hooks/refs. useSyncExternalStore is
 * the idiomatic answer: it renders the server snapshot first, then swaps to the
 * live one after hydration, in a single pass.
 */

const noopSubscribe = () => () => {};

/** false during SSR and the hydrating render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export type Theme = 'light' | 'dark';

/**
 * The `data-theme` attribute on <html> IS the source of truth — it is set before
 * first paint by the inline script in the root layout, so there is nothing to
 * synchronise and no flash. A MutationObserver reports changes back.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'),
    () => 'dark' as Theme,
  );

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('exceller.theme', next); } catch { /* private mode */ }
  }, []);

  return [theme, setTheme];
}

const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/**
 * A boolean backed by localStorage, shared across components and tabs.
 * Every read is guarded: storage throws in private mode and returns empty after
 * a data clear, and neither may break the page.
 */
export function usePersistentFlag(key: string, fallback: boolean): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(onChange);
      window.addEventListener('storage', onChange);
      return () => {
        listeners.get(key)?.delete(onChange);
        window.removeEventListener('storage', onChange);
      };
    },
    () => {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw === '1';
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );

  const set = useCallback((next: boolean) => {
    try { localStorage.setItem(key, next ? '1' : '0'); } catch { /* private mode */ }
    notify(key);
  }, [key]);

  return [value, set];
}
