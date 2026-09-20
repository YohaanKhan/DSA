'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExamTimer } from '@/components/ui/ExamTimer';
import { Icon } from '@/components/ui/Icon';
import { KeyCap } from '@/components/ui/KeyCap';
import { ProgressTrack, SegmentedTrack } from '@/components/ui/ProgressTrack';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { ConfidenceToggle } from './ConfidenceToggle';
import { ExplanationPanel } from './ExplanationPanel';
import { OptionRow, type OptionState } from './OptionRow';
import { NumberedSource, QuestionStem } from './QuestionStem';
import { VariableTable, type TraceStep } from './VariableTable';
import type { RunnerItem } from './DrillRunner';
import styles from './Drill.module.css';

export interface Graded {
  correct: boolean;
  answer: string;
  explanation: string;
  distractorRationale?: Record<string, string>;
  executionTrace?: TraceStep[];
  nextReviewInDays: number;
}

/**
 * One question. Mounted with `key={item.id}` so moving to the next question
 * remounts this component — that is how per-question state resets, rather than
 * a cascade of setState calls inside an effect.
 */
export function QuestionCard({
  sessionId,
  item,
  index,
  total,
  correctSoFar,
  requireConfidence,
  onGraded,
  onAdvance,
}: {
  sessionId: string;
  item: RunnerItem;
  index: number;
  total: number;
  correctSoFar: number;
  requireConfidence: boolean;
  onGraded: (correct: boolean) => void;
  onAdvance: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [confidence, setConfidence] = useState<'high' | 'low' | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const budgetMs = item.targetSeconds * 1000;
  const budget = useExamTimer({ totalMs: budgetMs, autoStart: true, tickMs: 250 });

  // Written in an effect, never during render — reading the clock in a render
  // pass is impure and the linter is right to reject it.
  const startedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const confidenceRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startedAt.current = Date.now();
    if (item.kind === 'trace') inputRef.current?.focus();
  }, [item.kind]);

  const hasAnswer = item.kind === 'mcq' ? picked !== null : typed.trim().length > 0;
  const needsConfidence = requireConfidence && confidence === null;
  const canSubmit = hasAnswer && !needsConfidence && !graded && !submitting;

  const submit = useCallback(async () => {
    if (!hasAnswer || (requireConfidence && confidence === null) || graded || submitting) return;
    setSubmitting(true);
    budget.pause();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          response: item.kind === 'mcq' ? picked : typed,
          timeMs: Math.max(0, Date.now() - startedAt.current),
          confidence,
          flagged,
        }),
      });
      if (!res.ok) throw new Error(`grading failed (${res.status})`);
      const result: Graded = await res.json();
      setGraded(result);
      onGraded(result.correct);
    } catch (err) {
      // Surface the failure rather than silently losing the answer.
      setGraded({
        correct: false,
        answer: '',
        explanation: `Could not grade this answer: ${(err as Error).message}. It was NOT recorded — check the server and retry this question.`,
        nextReviewInDays: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }, [hasAnswer, requireConfidence, confidence, graded, submitting, sessionId, item, picked, typed, flagged, budget, onGraded]);

  // Keyboard first: at 300+ questions a day, a mouse round-trip per question is
  // real minutes, and that friction is what makes you stop early.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (event.key === 'Enter') {
        // A focused button must be allowed to activate itself.
        if (target?.tagName === 'BUTTON') return;
        event.preventDefault();
        if (graded) { onAdvance(); return; }
        // Trace items keep focus in the answer field, so S/G never arrive here.
        // Rather than dead-ending, Enter walks you to the next thing you must do.
        if (hasAnswer && requireConfidence && confidence === null) {
          confidenceRef.current?.querySelector('button')?.focus();
          return;
        }
        void submit();
        return;
      }
      if (typing) return;
      if (event.key === ' ' && graded) { event.preventDefault(); onAdvance(); return; }
      if (graded) return;

      const k = event.key.toLowerCase();
      if (k === 'f') { setFlagged((f) => !f); return; }
      if (k === 's') { setConfidence('high'); return; }
      if (k === 'g') { setConfidence('low'); return; }
      if (item.kind === 'mcq' && /^[1-4]$/.test(event.key)) {
        const option = item.options?.[Number(event.key) - 1];
        if (option) setPicked(option.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [graded, onAdvance, submit, item, hasAnswer, requireConfidence, confidence]);

  const optionState = (optionId: string): OptionState => {
    if (!graded) return picked === optionId ? 'selected' : 'idle';
    if (optionId === graded.answer) return 'correct';
    if (optionId === picked) return 'wrong';
    return 'idle';
  };

  const overBudget = budget.remainingMs === 0;

  return (
    <div className={styles.runner} data-stage={item.stage}>
      <div className={styles.bar}>
        <span className={clsx('tabular', styles.counter)}>{index + 1} / {total}</span>
        <Badge tone="stage">{item.subtopic ?? item.topic}</Badge>
        <Badge tone="neutral">{item.difficulty}</Badge>
        {index > 0 ? <Badge tone="neutral" icon="check">{correctSoFar} / {index}</Badge> : null}
        <span className={styles.barSpacer} />
        <ExamTimer
          remainingMs={budget.remainingMs}
          totalMs={budgetMs}
          size="sm"
          label={overBudget ? 'over budget' : 'for this question'}
        />
      </div>

      <SegmentedTrack total={total} done={index} current={index} />

      {item.kind === 'mcq' ? (
        <QuestionStem stem={item.stem ?? ''} code={item.code} />
      ) : (
        <>
          <QuestionStem stem={item.question ?? 'What is printed?'} />
          <NumberedSource source={item.sourceCode ?? ''} />
        </>
      )}

      {item.kind === 'mcq' ? (
        <div className={styles.options}>
          {(item.options ?? []).map((option, i) => (
            <OptionRow
              key={option.id}
              id={option.id}
              index={i}
              text={option.text}
              state={optionState(option.id)}
              disabled={Boolean(graded)}
              onSelect={setPicked}
            />
          ))}
        </div>
      ) : (
        <div>
          <label className="microlabel" htmlFor="trace-answer" style={{ color: 'var(--ink-muted)' }}>
            Your answer — the exact output
          </label>
          <input
            id="trace-answer"
            ref={inputRef}
            className={clsx('tabular', styles.answerField)}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={Boolean(graded)}
            autoComplete="off"
            spellCheck={false}
            style={{ marginTop: 'var(--s-2)', display: 'block' }}
          />
        </div>
      )}

      {!graded ? (
        <>
          {requireConfidence ? (
            <div ref={confidenceRef}>
              <ConfidenceToggle
                value={confidence}
                onChange={(v) => {
                  setConfidence(v);
                  requestAnimationFrame(() => submitRef.current?.focus());
                }}
              />
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button ref={submitRef} variant="solid" size="lg" onClick={() => void submit()} disabled={!canSubmit} loading={submitting}>
              Submit
            </Button>
            <Button variant={flagged ? 'solid' : 'ghost'} size="md" icon="flag" onClick={() => setFlagged((f) => !f)}>
              {flagged ? 'Flagged' : 'Flag'}
            </Button>
            <span className={clsx('microlabel', styles.hintRow)}>
              {item.kind === 'mcq' ? (<><KeyCap>1</KeyCap>–<KeyCap>4</KeyCap> pick · </>) : null}
              <KeyCap>S</KeyCap>/<KeyCap>G</KeyCap> confidence · <KeyCap>F</KeyCap> flag · <KeyCap>↵</KeyCap> submit
            </span>
          </div>
          {needsConfidence && hasAnswer ? (
            <span className={clsx('microlabel', styles.hintRow)}>
              Mark how sure you are first — a lucky guess must not read as knowledge.
            </span>
          ) : null}
        </>
      ) : (
        <>
          {item.kind === 'trace' && !graded.correct && graded.answer ? (
            <p className={clsx('microlabel', styles.hintRow)}>
              Expected output: <strong className="tabular">{graded.answer}</strong>
            </p>
          ) : null}

          <ExplanationPanel
            correct={graded.correct}
            explanation={graded.explanation}
            distractorRationale={graded.distractorRationale}
          />

          {graded.executionTrace ? (
            <VariableTable trace={graded.executionTrace} source={item.sourceCode ?? ''} />
          ) : null}

          <div className={styles.actions}>
            <Button variant="solid" size="lg" onClick={onAdvance} iconAfter="chevron">
              {index + 1 >= total ? 'See results' : 'Next question'}
            </Button>
            <span className={clsx('microlabel', styles.hintRow)}>
              <Icon name="review" size={14} /> back in {graded.nextReviewInDays}d · <KeyCap>↵</KeyCap> next
            </span>
          </div>
        </>
      )}

      <ProgressTrack
        value={budget.elapsedMs}
        max={budgetMs}
        tone={overBudget ? 'over' : budget.fraction > 0.75 ? 'warn' : 'stage'}
        label={overBudget ? 'over' : undefined}
      />
    </div>
  );
}
