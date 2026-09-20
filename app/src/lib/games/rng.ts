/**
 * Seeded randomness for the arcade.
 *
 * Every puzzle is a pure function of (seed, level), which buys three things:
 * the post-run screen can print a seed you replay to see the exact level that
 * beat you; generator tests are deterministic; and a level that turns out to be
 * unsolvable is reproducible rather than folklore.
 *
 * mulberry32: 32 bits of state, one multiply-xorshift round. Not cryptographic
 * — that is the point. It is small, fast, and identical on every machine.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh run seed. Shown on the post-run screen so a run can be replayed. */
export const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;

/**
 * Each level draws from its own stream. Mixing the level in with a large odd
 * constant means level 2 is not merely the next few numbers after level 1 —
 * consecutive levels should not correlate.
 */
export const levelRng = (seed: number, level: number): Rng =>
  mulberry32((seed ^ Math.imul(level + 1, 0x9e3779b1)) >>> 0);

export const rngInt = (rng: Rng, minInclusive: number, maxExclusive: number): number =>
  minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));

export const rngPick = <T>(rng: Rng, xs: readonly T[]): T => xs[rngInt(rng, 0, xs.length)];

/** Fisher-Yates on a copy — the caller's array is never touched. */
export function rngShuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rngInt(rng, 0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** k distinct elements, in random order. */
export const rngSample = <T>(rng: Rng, xs: readonly T[], k: number): T[] =>
  rngShuffle(rng, xs).slice(0, k);
