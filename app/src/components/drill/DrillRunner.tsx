'use client';

import { useCallback, useState } from 'react';
import { QuestionCard } from './QuestionCard';

/** The answer-free shape the runner receives; the key never reaches the client. */
export interface RunnerItem {
  id: string;
  kind: 'mcq' | 'trace';
  stage: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  targetSeconds: number;
  stem?: string;
  code?: { language: string; source: string };
  options?: { id: string; text: string }[];
  language?: string;
  sourceCode?: string;
  question?: string;
  answerMode?: 'exact' | 'mcq';
}

export function DrillRunner({
  sessionId,
  items,
  requireConfidence = true,
  onFinish,
}: {
  sessionId: string;
  items: RunnerItem[];
  requireConfidence?: boolean;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);

  const advance = useCallback(() => {
    if (index + 1 >= items.length) onFinish();
    else setIndex((i) => i + 1);
  }, [index, items.length, onFinish]);

  const item = items[index];
  if (!item) return null;

  return (
    <QuestionCard
      // Remounting per question is what resets its state — no effect cascade.
      key={item.id}
      sessionId={sessionId}
      item={item}
      index={index}
      total={items.length}
      correctSoFar={correct}
      requireConfidence={requireConfidence}
      onGraded={(wasCorrect) => { if (wasCorrect) setCorrect((n) => n + 1); }}
      onAdvance={advance}
    />
  );
}
