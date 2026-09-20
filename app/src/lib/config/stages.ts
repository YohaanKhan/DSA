import type { Route } from 'next';
import type { IconName } from '@/components/ui/Icon';

/**
 * The six assessment stages. `weight` is elimination risk, used by the
 * dashboard to rank what to study next (see plan/07-SCORING-AND-ANALYTICS.md §9).
 */
export type StageId =
  | 'english' | 'ai-literacy' | 'technical' | 'debugging' | 'aic' | 'cognitive' | 'behavioural';

export interface Stage {
  id: StageId;
  label: string;
  short: string;
  blurb: string;
  icon: IconName;
  /** Elimination-risk weight. Higher = the dashboard pushes you here harder. */
  weight: number;
  eliminatory: boolean;
  /** Base route. typedRoutes validates this against the real app routes. */
  href: Route;
  /** Query appended when linking, e.g. pre-filtering the drill builder. */
  query?: Record<string, string>;
}

export const STAGES: Stage[] = [
  {
    id: 'english',
    label: 'Communication',
    short: 'English',
    blurb: 'Listening, speaking, reading, writing — AI-scored.',
    icon: 'comm',
    weight: 1.0,
    eliminatory: true,
    href: '/comm',
  },
  {
    id: 'ai-literacy',
    label: 'AI Literacy',
    short: 'AI Lit',
    blurb: 'GenAI foundations, LLM limits, prompting, RAG, responsible AI.',
    icon: 'drill',
    weight: 1.15,
    eliminatory: true,
    href: '/drill',
    query: { stage: 'ai-literacy' },
  },
  {
    id: 'technical',
    label: 'Technical',
    short: 'Technical',
    blurb: 'Pseudocode tracing, DSA, OOP, DBMS, OS, networks, git.',
    icon: 'trace',
    weight: 1.2,
    eliminatory: true,
    href: '/drill',
    query: { stage: 'technical' },
  },
  {
    id: 'debugging',
    label: 'Debugging',
    short: 'Debug',
    blurb: 'Find and fix defects in C, C++ and Java under 20 minutes.',
    icon: 'debug',
    weight: 1.2,
    eliminatory: true,
    href: '/debug',
  },
  {
    id: 'aic',
    label: 'AI-Assisted Coding',
    short: 'AI Coding',
    blurb: 'Frame, plan, prompt, review, refine. This sets your package tier.',
    icon: 'aic',
    weight: 1.15,
    eliminatory: false,
    href: '/aic',
  },
  {
    id: 'cognitive',
    label: 'Cognitive',
    short: 'Games',
    blurb: 'Grid, Switch, Digit and Motion challenges against the clock.',
    icon: 'games',
    weight: 0.8,
    eliminatory: false,
    href: '/games',
  },
];

/** Builds the href for a stage link, preserving typedRoutes safety. */
export function stageHref(stage: Stage): Route | { pathname: Route; query: Record<string, string> } {
  return stage.query ? { pathname: stage.href, query: stage.query } : stage.href;
}

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, Stage>;

export const NAV_ITEMS: { href: Route; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/drill', label: 'Drill', icon: 'drill' },
  { href: '/trace', label: 'Trace', icon: 'trace' },
  { href: '/debug', label: 'Debug', icon: 'debug' },
  { href: '/aic', label: 'AI Coding', icon: 'aic' },
  { href: '/games', label: 'Games', icon: 'games' },
  { href: '/comm', label: 'Speak', icon: 'comm' },
  { href: '/mock', label: 'Mock', icon: 'mock' },
  { href: '/review', label: 'Review', icon: 'review' },
  { href: '/log', label: 'Log', icon: 'log' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

/** Whole days between now and the exam. Negative once it has passed. */
export function daysUntil(dateIso: string): number {
  const exam = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - today.getTime()) / 86_400_000);
}
