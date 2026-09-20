import registry from '../../../content/topics.json';

export interface TopicDef {
  priority: 'P0' | 'P1' | 'P2';
  subtopics: string[];
}
export type TopicRegistry = Record<string, Record<string, TopicDef>>;

export const TOPICS = registry as TopicRegistry;

export function topicExists(stage: string, topic: string): boolean {
  return Boolean(TOPICS[stage]?.[topic]);
}

export function subtopicExists(stage: string, topic: string, subtopic: string): boolean {
  return Boolean(TOPICS[stage]?.[topic]?.subtopics.includes(subtopic));
}

export function priorityOf(stage: string, topic: string): 'P0' | 'P1' | 'P2' | null {
  return TOPICS[stage]?.[topic]?.priority ?? null;
}

/** All P0 topics for a stage — used by the readiness coverage term. */
export function p0Topics(stage: string): string[] {
  return Object.entries(TOPICS[stage] ?? {})
    .filter(([, def]) => def.priority === 'P0')
    .map(([topic]) => topic);
}
