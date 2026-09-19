import type { StageId } from './stages';

/**
 * Drive profiles — the architectural answer to the conflicting reports in the
 * research dossier (ADR: configuration is data, not code).
 *
 * Capgemini configures the pattern PER CAMPUS DRIVE and publishes no universal
 * spec, so publishers disagree on section counts and timings and both can be
 * right. **This is the one file you edit the moment you learn your own drive's
 * pattern.** Nothing else in the app hardcodes a section list.
 */

export type SectionKind = 'mcq' | 'trace' | 'debug' | 'aic' | 'game' | 'comm';

export interface MockSection {
  id: string;
  label: string;
  stage: StageId;
  kind: SectionKind;
  /** Questions, or 1 for a single-task section like debugging. */
  count: number;
  /** 0 means untimed. */
  minutes: number;
  /** Fraction of the section needed to clear it, when eliminatory. */
  passMark: number;
  eliminatory: boolean;
  /** Restricts item selection; omit to use the whole stage. */
  topics?: string[];
  instructions: string;
}

export interface ExamProfile {
  id: string;
  label: string;
  note: string;
  sections: MockSection[];
}

const INSTRUCTIONS = {
  mcq: 'Multiple choice. No negative marking, so never leave a blank. You cannot return to this section.',
  trace: 'Read the code and type the exact output. Whitespace is normalised; everything else must match.',
  debug: 'You get a working program with one defect. Read it, diagnose the family, fix it minimally.',
  aic: 'Direct an assistant through five steps. You cannot go back, and you cannot paste the problem statement into your prompt.',
  game: 'Read the rules BEFORE starting the timer. Reaching a higher level is worth more than being fast at a low one.',
  comm: 'Plan for three minutes, write for eighteen, and leave time to proofread.',
} as const;

export const PROFILES: ExamProfile[] = [
  {
    id: 'reported-2026-default',
    label: 'Reported 2026 pattern',
    note: 'The shape most publishers describe. Section counts vary by drive — edit this file once you know yours.',
    sections: [
      { id: 'english-mcq', label: 'English Communication', stage: 'english', kind: 'mcq', count: 30, minutes: 30, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'ai-literacy', label: 'AI Literacy', stage: 'ai-literacy', kind: 'mcq', count: 20, minutes: 20, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'technical-mcq', label: 'Technical', stage: 'technical', kind: 'mcq', count: 20, minutes: 20, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'pseudocode', label: 'Pseudocode Tracing', stage: 'technical', kind: 'trace', count: 10, minutes: 15, passMark: 0.6, eliminatory: true, topics: ['pseudocode'], instructions: INSTRUCTIONS.trace },
      { id: 'debugging', label: 'Debugging', stage: 'debugging', kind: 'debug', count: 1, minutes: 20, passMark: 1, eliminatory: true, instructions: INSTRUCTIONS.debug },
      { id: 'aic', label: 'AI-Assisted Coding', stage: 'aic', kind: 'aic', count: 1, minutes: 30, passMark: 0.5, eliminatory: false, instructions: INSTRUCTIONS.aic },
      { id: 'games', label: 'Cognitive Games', stage: 'cognitive', kind: 'game', count: 4, minutes: 27, passMark: 0.5, eliminatory: false, instructions: INSTRUCTIONS.game },
    ],
  },
  {
    id: 'combined-40',
    label: 'Combined 40-question technical',
    note: 'The variant where AI Literacy and technical are one 40-question, 40-minute block.',
    sections: [
      { id: 'english-mcq', label: 'English Communication', stage: 'english', kind: 'mcq', count: 30, minutes: 30, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'technical-combined', label: 'Technical (AI Literacy + CS)', stage: 'technical', kind: 'mcq', count: 40, minutes: 40, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'debugging', label: 'Debugging', stage: 'debugging', kind: 'debug', count: 1, minutes: 20, passMark: 1, eliminatory: true, instructions: INSTRUCTIONS.debug },
      { id: 'aic', label: 'AI-Assisted Coding', stage: 'aic', kind: 'aic', count: 1, minutes: 30, passMark: 0.5, eliminatory: false, instructions: INSTRUCTIONS.aic },
    ],
  },
  {
    id: 'short-diagnostic',
    label: 'Short diagnostic (35 min)',
    note: 'Not an exam shape — a quick baseline across every built stage. Use this for your first mock.',
    sections: [
      { id: 'ai-literacy', label: 'AI Literacy', stage: 'ai-literacy', kind: 'mcq', count: 6, minutes: 6, passMark: 0.6, eliminatory: true, instructions: INSTRUCTIONS.mcq },
      { id: 'technical-mcq', label: 'Technical', stage: 'debugging', kind: 'mcq', count: 8, minutes: 8, passMark: 0.6, eliminatory: true, topics: ['language-traps', 'python-bridge'], instructions: INSTRUCTIONS.mcq },
      { id: 'pseudocode', label: 'Pseudocode Tracing', stage: 'technical', kind: 'trace', count: 3, minutes: 5, passMark: 0.6, eliminatory: true, topics: ['pseudocode'], instructions: INSTRUCTIONS.trace },
      { id: 'debugging', label: 'Debugging', stage: 'debugging', kind: 'debug', count: 1, minutes: 12, passMark: 1, eliminatory: true, instructions: INSTRUCTIONS.debug },
      { id: 'aic', label: 'AI-Assisted Coding', stage: 'aic', kind: 'aic', count: 1, minutes: 20, passMark: 0.5, eliminatory: false, instructions: INSTRUCTIONS.aic },
    ],
  },
];

export const DEFAULT_PROFILE_ID = 'short-diagnostic';

export function getProfile(id: string): ExamProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}

/** Modules that exist today. A section for anything else is reported as skipped. */
export const BUILT_KINDS: SectionKind[] = ['mcq', 'trace', 'debug', 'aic'];

export function isBuilt(kind: SectionKind): boolean {
  return BUILT_KINDS.includes(kind);
}
