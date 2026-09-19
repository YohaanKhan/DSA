'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The one timer, shared by every module (ADR-005).
 *
 * The time source is `performance.now()` deltas, NEVER a counter decremented on
 * an interval. setInterval drifts, is throttled to once-per-second (or worse) in
 * background tabs, and stalls under heavy render. So we read the clock; we do
 * not count ticks. The interval only decides *when* to publish a new snapshot.
 *
 * Every value the UI renders lives in state, so render stays pure — the clock is
 * read in the tick, in event handlers and on visibility change, never inline in
 * a render pass.
 *
 * Guarantees (covered by useExamTimer.test.ts):
 *  - onExpire fires exactly once, across any number of pause/resume cycles
 *  - pause/resume preserve elapsed precisely
 *  - a backgrounded tab returning after minutes shows the correct remaining time
 *  - unmounting stops all callbacks
 */

export interface ExamTimerOptions {
  totalMs: number;
  onExpire?: () => void;
  autoStart?: boolean;
  /** Repaint cadence. Display only — not the time source. */
  tickMs?: number;
}

export interface ExamTimer {
  remainingMs: number;
  elapsedMs: number;
  isRunning: boolean;
  isExpired: boolean;
  /** Fraction of the budget consumed, 0..1. */
  fraction: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: (newTotalMs?: number) => void;
  /** Grant or remove time (negative shortens). Used by mock section transitions. */
  addMs: (ms: number) => void;
}

interface TimerState {
  /** Time accumulated from completed run segments. */
  banked: number;
  /** performance.now() when the current segment began, or null when not running. */
  startedAt: number | null;
  total: number;
  expired: boolean;
  /** Published display value. Always derived from the clock, never from tick counts. */
  elapsed: number;
}

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const elapsedOf = (s: TimerState) =>
  Math.min(s.banked + (s.startedAt === null ? 0 : now() - s.startedAt), s.total);

export function useExamTimer({
  totalMs,
  onExpire,
  autoStart = false,
  tickMs = 200,
}: ExamTimerOptions): ExamTimer {
  const [state, setState] = useState<TimerState>(() => ({
    banked: 0,
    startedAt: autoStart ? now() : null,
    total: totalMs,
    expired: false,
    elapsed: 0,
  }));

  // Expiry guard. A ref because two ticks can queue before a state update lands,
  // and onExpire must fire exactly once. Only ever read inside callbacks.
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  /** Recompute the published snapshot from the clock. */
  const publish = useCallback(() => {
    setState((s) => ({ ...s, elapsed: elapsedOf(s) }));
  }, []);

  const start = useCallback(() => {
    setState((s) => {
      if (s.startedAt !== null || s.expired) return s;
      return { ...s, startedAt: now() };
    });
  }, []);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.startedAt === null) return s;
      const banked = Math.min(s.banked + (now() - s.startedAt), s.total);
      return { ...s, banked, startedAt: null, elapsed: banked };
    });
  }, []);

  const reset = useCallback((newTotalMs?: number) => {
    firedRef.current = false;
    setState((s) => ({
      banked: 0,
      startedAt: null,
      total: typeof newTotalMs === 'number' ? newTotalMs : s.total,
      expired: false,
      elapsed: 0,
    }));
  }, []);

  const addMs = useCallback((ms: number) => {
    setState((s) => {
      const total = Math.max(0, s.total + ms);
      const elapsed = Math.min(elapsedOf(s), total);
      const stillExpired = elapsed >= total;
      if (!stillExpired) firedRef.current = false;
      return { ...s, total, elapsed, expired: stillExpired };
    });
  }, []);

  // Publish loop. Expiry is detected from the clock, not from a tick count.
  useEffect(() => {
    if (state.startedAt === null) return;
    const id = setInterval(() => {
      setState((s) => {
        if (s.startedAt === null) return s;
        const elapsed = elapsedOf(s);
        if (elapsed >= s.total) {
          if (!firedRef.current) {
            firedRef.current = true;
            // Deferred so the listener never runs during React's update phase.
            queueMicrotask(() => onExpireRef.current?.());
          }
          return { ...s, banked: s.total, startedAt: null, elapsed: s.total, expired: true };
        }
        return { ...s, elapsed };
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [state.startedAt, tickMs]);

  // A backgrounded tab gets few ticks; recompute the moment it returns so the
  // display is never briefly stale.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) publish(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [publish]);

  const remainingMs = Math.max(0, state.total - state.elapsed);

  return {
    remainingMs,
    elapsedMs: state.elapsed,
    isRunning: state.startedAt !== null,
    isExpired: state.expired,
    fraction: state.total > 0 ? Math.min(1, state.elapsed / state.total) : 1,
    start,
    pause,
    resume: start,
    stop: pause,
    reset,
    addMs,
  };
}

// formatClock lives in lib/format.ts so server components can use it too.
export { formatClock } from '@/lib/format';
