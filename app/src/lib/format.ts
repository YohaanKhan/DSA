/**
 * Pure formatters, usable from both server and client components.
 * Deliberately NOT in useExamTimer.ts: that file is 'use client', so importing
 * from it in a server component fails at runtime.
 */

/** mm:ss for timers and durations. Always two-digit seconds, never negative. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Whole percent, for scores. */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
