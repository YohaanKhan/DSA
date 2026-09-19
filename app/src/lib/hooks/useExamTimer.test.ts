import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatClock, useExamTimer } from './useExamTimer';

/**
 * These are the acceptance tests from PHASE-00. The timer is shared by every
 * module, so a drift or double-expire bug here corrupts every score in the app.
 *
 * performance.now() is stubbed so we control the clock exactly; advancing fake
 * timers alone would not move the time SOURCE, only the repaint cadence — which
 * is precisely the property being verified.
 */
let clock = 0;
const advance = async (ms: number) => {
  clock += ms;
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
};

beforeEach(() => {
  clock = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useExamTimer', () => {
  it('counts down from the total', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 60_000 }));
    act(() => result.current.start());
    await advance(10_000);
    expect(result.current.remainingMs).toBeCloseTo(50_000, -2);
    expect(result.current.elapsedMs).toBeCloseTo(10_000, -2);
  });

  it('preserves elapsed exactly across a long pause', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 60_000 }));
    act(() => result.current.start());
    await advance(10_000);
    act(() => result.current.pause());

    // Five minutes pass while paused — the clock moves, the timer must not.
    await advance(300_000);
    expect(result.current.remainingMs).toBeCloseTo(50_000, -2);

    act(() => result.current.resume());
    await advance(5_000);
    expect(result.current.remainingMs).toBeCloseTo(45_000, -2);
  });

  it('fires onExpire exactly once across three pause/resume cycles', async () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer({ totalMs: 3_000, onExpire }));

    for (let i = 0; i < 3; i++) {
      act(() => result.current.start());
      await advance(500);
      act(() => result.current.pause());
      await advance(1_000);
    }
    expect(onExpire).not.toHaveBeenCalled();

    act(() => result.current.resume());
    await advance(5_000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.isExpired).toBe(true);
    expect(result.current.remainingMs).toBe(0);

    // Keep running well past expiry: still exactly one call.
    await advance(30_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('shows the correct remaining time when a backgrounded tab returns', async () => {
    // The interval is throttled while hidden, so few ticks fire — but elapsed is
    // read from the clock, not counted from ticks.
    const { result } = renderHook(() => useExamTimer({ totalMs: 600_000 }));
    act(() => result.current.start());

    clock += 300_000; // 5 minutes with no timer callbacks at all
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });

    expect(result.current.remainingMs).toBeCloseTo(300_000, -3);
  });

  it('does not call back after unmount', async () => {
    const onExpire = vi.fn();
    const { result, unmount } = renderHook(() => useExamTimer({ totalMs: 1_000, onExpire }));
    act(() => result.current.start());
    unmount();
    await advance(5_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('clamps elapsed to the total and never reports negative remaining', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 1_000 }));
    act(() => result.current.start());
    await advance(60_000);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.elapsedMs).toBe(1_000);
    expect(result.current.fraction).toBe(1);
  });

  it('reset restores a fresh budget and clears expiry', async () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer({ totalMs: 1_000, onExpire }));
    act(() => result.current.start());
    await advance(2_000);
    expect(result.current.isExpired).toBe(true);

    act(() => result.current.reset(5_000));
    expect(result.current.isExpired).toBe(false);
    expect(result.current.remainingMs).toBe(5_000);

    act(() => result.current.start());
    await advance(1_000);
    expect(result.current.remainingMs).toBeCloseTo(4_000, -2);
  });

  it('addMs extends the budget and can revive an expired timer', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 1_000 }));
    act(() => result.current.start());
    await advance(2_000);
    expect(result.current.isExpired).toBe(true);

    act(() => result.current.addMs(10_000));
    expect(result.current.isExpired).toBe(false);
    expect(result.current.remainingMs).toBeGreaterThan(9_000);
  });

  it('autoStart begins exactly one run', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 10_000, autoStart: true }));
    await advance(1_000);
    expect(result.current.isRunning).toBe(true);
    expect(result.current.remainingMs).toBeCloseTo(9_000, -2);
  });

  it('double start does not double-count time', async () => {
    const { result } = renderHook(() => useExamTimer({ totalMs: 10_000 }));
    act(() => { result.current.start(); result.current.start(); });
    await advance(2_000);
    expect(result.current.remainingMs).toBeCloseTo(8_000, -2);
  });
});

describe('formatClock', () => {
  it('formats mm:ss with two-digit seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9_000)).toBe('0:09');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(600_000)).toBe('10:00');
  });

  it('never formats a negative duration', () => {
    expect(formatClock(-5_000)).toBe('0:00');
  });
});
