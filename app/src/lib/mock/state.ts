import type { MockSection } from '@/lib/config/exam-profiles';

/**
 * Mock state lives in the session row, and remaining time is always recomputed
 * from wall-clock timestamps — never from a stored countdown. That is what makes
 * a mock crash-safe: killing the browser and reopening cannot buy you time.
 */

export interface SectionState {
  id: string;
  /** Item ids chosen up front, so a resume serves the same questions. */
  itemIds: string[];
  /** Epoch ms when this section was first opened, or null if not started. */
  startedAt: number | null;
  finishedAt: number | null;
  /** 0..1, set when the section completes. */
  score: number | null;
  skipped: boolean;
  skipReason?: string;
}

export interface MockState {
  profileId: string;
  sections: MockSection[];
  sectionState: SectionState[];
  currentIndex: number;
  createdAt: number;
}

/** Remaining milliseconds, derived from the clock. Zero once the budget is spent. */
export function remainingMs(section: MockSection, state: SectionState, now = Date.now()): number {
  if (section.minutes === 0) return Number.POSITIVE_INFINITY;
  if (state.startedAt === null) return section.minutes * 60_000;
  if (state.finishedAt !== null) return 0;
  return Math.max(0, section.minutes * 60_000 - (now - state.startedAt));
}

export function isExpired(section: MockSection, state: SectionState, now = Date.now()): boolean {
  return state.startedAt !== null && remainingMs(section, state, now) === 0;
}

export interface GateVerdict {
  /** The first eliminatory section that was failed, if any. */
  failedAt: string | null;
  failedLabel: string | null;
  failedScore: number | null;
  passMark: number | null;
  /** True when every eliminatory section that ran was cleared. */
  wouldProgress: boolean;
}

/**
 * Evaluates the elimination rules. The mock never actually stops — you need the
 * data from every stage far more than you need the drama — but you must SEE the
 * verdict, because the whole point of a gated exam is that adequate-everywhere
 * beats brilliant-somewhere.
 */
export function evaluateGates(sections: MockSection[], states: SectionState[]): GateVerdict {
  for (const section of sections) {
    const state = states.find((s) => s.id === section.id);
    if (!state || state.skipped || state.score === null) continue;
    if (!section.eliminatory) continue;
    if (state.score < section.passMark) {
      return {
        failedAt: section.id,
        failedLabel: section.label,
        failedScore: state.score,
        passMark: section.passMark,
        wouldProgress: false,
      };
    }
  }
  return { failedAt: null, failedLabel: null, failedScore: null, passMark: null, wouldProgress: true };
}
