'use client';

import { useCallback, useRef, useState } from 'react';
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
  /** Receives this run's own tally, which a mock section needs per-section. */
  onFinish: (tally: { correct: number; total: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const lastCorrect = useRef(false);

  const advance = useCallback((wasCorrect?: boolean) => {
    // `correct` state has not flushed yet when the last answer is graded, so the
    // final tally takes the in-flight result into account.
    const total = items.length;
    if (index + 1 >= total) {
      onFinish({ correct: correct + (wasCorrect ? 1 : 0), total });
      return;
    }
    setIndex((i) => i + 1);
  }, [index, items.length, onFinish, correct]);

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
      onGraded={(wasCorrect) => {
        if (wasCorrect) setCorrect((n) => n + 1);
        lastCorrect.current = wasCorrect;
      }}
      onAdvance={() => advance(lastCorrect.current)}
    />
  );
}
