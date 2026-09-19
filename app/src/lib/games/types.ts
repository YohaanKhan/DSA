import type { PlateauVerdict } from '@/lib/scoring/games';
import type { Rng } from './rng';

export type GameId = 'grid' | 'switch' | 'digit' | 'motion';

export interface CheckResult {
  /** Did the level clear? A cleared level advances the run; a failed one ends it. */
  correct: boolean;
  /**
   * Multiplier on the level's reward, 0..1. Three of the four games are binary
   * — you recalled the grid or you did not. Motion is graded on minimality,
   * because its whole point is that the score is the *fewest* moves, not any
   * solution, so it returns partial credit.
   */
  credit: number;
  /** Shown when the level ends. Always explains the answer, never just "wrong". */
  note: string;
}

export interface GameMeta {
  id: GameId;
  title: string;
  /** One line, on the arcade index. */
  blurb: string;
  /**
   * The rules screen, shown before EVERY run without exception. Reading rules
   * on the clock is the most-cited avoidable loss in this stage, so the app
   * never auto-starts anything.
   */
  rules: string[];
  /** Coaching. On the rules screen, and again on the post-run screen. */
  strategy: string[];
  /** What the game actually measures, stated honestly. */
  measures: string;
}

export interface GameEngine<S, A> extends GameMeta {
  /** Pure in (level, rng). Same seed, same puzzle, on any machine. */
  generate(level: number, rng: Rng): S;
  check(state: S, answer: A): CheckResult;
  /** The answering budget for this level, in seconds. */
  secondsFor(level: number): number;
}

/**
 * Per-game history. Declared here rather than beside the queries so client
 * components can name the shape without pulling a `server-only` module into
 * their bundle.
 */
export interface GameStats {
  game: GameId;
  runs: number;
  best: number;
  bestLevel: number;
  lastScore: number | null;
  /** Last ten scores, OLDEST FIRST — the order the plateau fit expects. */
  recent: number[];
  plateau: PlateauVerdict;
  lastPlayedAt: string | null;
}
