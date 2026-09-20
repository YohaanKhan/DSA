'use client';

import { clsx } from 'clsx';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExamTimer } from '@/components/ui/ExamTimer';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { formatClock } from '@/lib/format';
import { HINT_UNLOCK_MS, changedLineCount, scoreDebug } from '@/lib/scoring/debug';
import { CodeEditor } from './CodeEditor';
import { HintLadder } from './HintLadder';
import { TestResultList, type TestView } from './TestResultList';
import styles from './Debug.module.css';

export interface DebugExercise {
  id: string;
  language: 'c' | 'cpp' | 'java';
  problem: string;
  brokenSource: string;
  targetSeconds: number;
  hints: string[];
  tests: { name: string; hidden?: boolean; edgeCase?: boolean }[];
  families: string[];
}

interface SubmitResponse {
  passed: boolean;
  outcomes: TestView[];
  compileError?: string;
  score: number;
  timeScore: number;
  minimality: number;
  hintPenalty: number;
  changedLines: number;
  idealLines: number;
  bugLine: number;
  bugFamily: string;
  bugDescription: string;
  minimalDiff: string;
  hypothesisCorrect: boolean;
}

/** Ticked before submitting — the exam's fourth step is validate, not fix. */
const EDGE_CHECKS = [
  'empty input',
  'single element',
  'all values the same',
  'negative values',
  'first and last index',
];

const READ_PHASE_MS = 90_000;

type Phase = 'read' | 'hypothesise' | 'fix' | 'done';

export function DebugLab({
  exercise,
  onNext,
}: {
  exercise: DebugExercise;
  /** Receives the achieved score (0..1) so a mock section can record the real one. */
  onNext?: (score: number) => void;
}) {
  // The read phase ends on the clock, so it is DERIVED rather than flipped by an
  // effect; `manualPhase` only holds once you have moved on deliberately.
  const [manualPhase, setManualPhase] = useState<Phase | null>(null);
  const [source, setSource] = useState(exercise.brokenSource);
  const [hypothesis, setHypothesis] = useState<string | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [visibleOutcomes, setVisibleOutcomes] = useState<TestView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limitMs = exercise.targetSeconds * 1000;
  const timer = useExamTimer({ totalMs: limitMs, autoStart: true, tickMs: 500 });

  // The read phase is the highest-value UI decision here: the most common
  // failure in this round is editing before understanding.
  const readRemaining = Math.max(0, READ_PHASE_MS - timer.elapsedMs);
  const phase: Phase = manualPhase ?? (readRemaining === 0 ? 'hypothesise' : 'read');

  const hintsUnlocked = timer.elapsedMs >= HINT_UNLOCK_MS;

  const call = useCallback(
    async (mode: 'run' | 'submit') => {
      setRunning(true);
      setError(null);
      try {
        const res = await fetch(`/api/debug/${exercise.id}/${mode}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source,
            elapsedMs: Math.round(timer.elapsedMs),
            hintsUsed: hintsRevealed,
            hypothesis,
            edgeCasesChecked: checked,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);

        if (mode === 'run') {
          setVisibleOutcomes(data.outcomes);
          if (data.compileError) setError(data.compileError.split('\n').slice(0, 4).join('\n'));
        } else {
          setResult(data);
          setVisibleOutcomes(data.outcomes);
          setManualPhase('done');
          timer.pause();
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setRunning(false);
      }
    },
    [exercise.id, source, timer, hintsRevealed, hypothesis, checked],
  );

  const localChanged = changedLineCount(exercise.brokenSource, source);
  const previewScore = scoreDebug({
    passed: true,
    elapsedMs: timer.elapsedMs,
    limitMs,
    hintsUsed: hintsRevealed,
    changedLines: localChanged,
    idealLines: 1,
    hypothesisCorrect: true,
  });

  return (
    <div className={styles.lab} data-stage="debugging">
      <div className={styles.bar}>
        <Badge tone="stage">{exercise.language.toUpperCase()}</Badge>
        <Badge tone="neutral">
          {localChanged === 0 ? 'unedited' : `${localChanged} line${localChanged === 1 ? '' : 's'} changed`}
        </Badge>
        {hintsRevealed > 0 ? <Badge tone="warn">−{(hintsRevealed * 0.1).toFixed(2)} from hints</Badge> : null}
        <span className={styles.barSpacer} />
        <ExamTimer remainingMs={timer.remainingMs} totalMs={limitMs} size="sm" label="for this exercise" />
      </div>

      <div className={styles.split}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <Panel title="The program should" headerTone="stage">
            <p className={styles.problem}>{exercise.problem}</p>
          </Panel>

          {phase === 'read' ? (
            <div className={styles.readBanner}>
              <Icon name="lock" size={20} />
              <div>
                <div className="microlabel">
                  Read first — editing unlocks in {formatClock(readRemaining)}
                </div>
                <p className={styles.readWhy}>
                  Write down what the correct output should be for two inputs before you look for
                  the defect. The most common way to lose this round is editing before understanding.
                </p>
              </div>
              <span className={styles.barSpacer} />
              <Button size="sm" variant="outline" onClick={() => setManualPhase('hypothesise')}>
                Skip
              </Button>
            </div>
          ) : null}

          {phase === 'hypothesise' ? (
            <Panel title="Before you edit: name the bug family" headerTone="stage">
              <p className={styles.note} style={{ marginBottom: 'var(--s-4)' }}>
                Diagnosing before editing is the habit that transfers to the exam. Your accuracy
                here is tracked separately from whether you eventually fix it.
              </p>
              <div className={styles.chips}>
                {exercise.families.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={clsx('microlabel', styles.chip, hypothesis === f && styles.chipOn)}
                    onClick={() => setHypothesis(f)}
                  >
                    {f.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
              <div className={styles.actions} style={{ marginTop: 'var(--s-4)' }}>
                <Button variant="solid" onClick={() => setManualPhase('fix')} disabled={!hypothesis}>
                  Unlock the editor
                </Button>
                <Button variant="ghost" onClick={() => { setHypothesis(null); setManualPhase('fix'); }}>
                  I don&apos;t know yet
                </Button>
              </div>
            </Panel>
          ) : null}

          {phase === 'fix' || phase === 'done' ? (
            <Panel title="Edge cases you checked" headerTone="plain">
              <div className={styles.checklist}>
                {EDGE_CHECKS.map((c) => (
                  <label key={c} className={clsx('microlabel', styles.check)}>
                    <input
                      type="checkbox"
                      checked={checked.includes(c)}
                      disabled={phase === 'done'}
                      onChange={() =>
                        setChecked((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </Panel>
          ) : null}

          {phase !== 'read' ? (
            <Panel title="Hints" headerTone="plain">
              <HintLadder
                hints={exercise.hints}
                revealed={hintsRevealed}
                unlocked={hintsUnlocked}
                finished={phase === 'done'}
                onReveal={(i) => setHintsRevealed(i + 1)}
              />
            </Panel>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <CodeEditor
            value={source}
            onChange={phase === 'fix' ? setSource : undefined}
            readOnly={phase !== 'fix'}
            markedLines={result ? [result.bugLine] : []}
            ariaLabel={`${exercise.language} source to debug`}
          />

          {phase !== 'done' ? (
            <div className={styles.actions}>
              <Button
                variant="outline"
                onClick={() => void call('run')}
                loading={running}
                disabled={phase !== 'fix'}
              >
                Run visible tests
              </Button>
              <Button
                variant="solid"
                size="lg"
                onClick={() => void call('submit')}
                loading={running}
                disabled={phase !== 'fix'}
              >
                Submit
              </Button>
              <span className={clsx('microlabel', styles.hiddenNote)}>
                best possible now: {(previewScore.score * 100).toFixed(0)}%
              </span>
            </div>
          ) : null}

          {error ? <pre className={clsx(styles.diff, styles.error)}>{error}</pre> : null}

          <Panel title="Tests" headerTone="plain">
            <TestResultList
              tests={visibleOutcomes ?? exercise.tests}
              revealHidden={phase === 'done'}
            />
          </Panel>
        </div>
      </div>

      {result ? (
        <Panel title={result.passed ? 'Fixed' : 'Not fixed'} headerTone="stage">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
            <div className={styles.verdict}>
              <span className={clsx('tabular', styles.score)}>{Math.round(result.score * 100)}</span>
              <span className={clsx('tabular', styles.scoreOut)}>/ 100</span>
              <Badge tone={result.hypothesisCorrect ? 'ok' : 'bad'}>
                {result.hypothesisCorrect ? 'Diagnosed correctly before editing' : 'Hypothesis was wrong'}
              </Badge>
            </div>

            <div className={styles.breakdown}>
              <div className={styles.metric}>
                <span className={clsx('tabular', styles.metricValue)}>{formatClock(timer.elapsedMs)}</span>
                <span className={clsx('microlabel', styles.metricLabel)}>Time used</span>
              </div>
              <div className={styles.metric}>
                <span className={clsx('tabular', styles.metricValue)}>
                  {result.changedLines} / {result.idealLines}
                </span>
                <span className={clsx('microlabel', styles.metricLabel)}>Lines changed / minimal</span>
              </div>
              <div className={styles.metric}>
                <span className={clsx('tabular', styles.metricValue)}>−{result.hintPenalty.toFixed(2)}</span>
                <span className={clsx('microlabel', styles.metricLabel)}>Hint penalty</span>
              </div>
              <div className={styles.metric}>
                <span className={clsx('microlabel', styles.metricValue)} style={{ fontSize: 'var(--t-base)' }}>
                  {result.bugFamily.replace(/-/g, ' ')}
                </span>
                <span className={clsx('microlabel', styles.metricLabel)}>Actual bug family</span>
              </div>
            </div>

            <div>
              <span className={clsx('microlabel', styles.sectionLabel)}>
                The minimal fix, on line {result.bugLine}
              </span>
              <pre className={styles.diff} style={{ marginTop: 'var(--s-2)' }}>
                {result.minimalDiff.split('\n').map((l, i) => (
                  <div key={i} className={l.startsWith('-') ? styles.diffRemove : l.startsWith('+') ? styles.diffAdd : undefined}>
                    {l}
                  </div>
                ))}
              </pre>
              <p className={styles.note} style={{ marginTop: 'var(--s-3)' }}>
                {result.bugDescription}. Minimality is scored because the exam hands you working
                code with one defect: rewriting the function may pass the tests, but it is the
                wrong reflex under a 20-minute clock — and in the interview you will be asked
                what you changed.
              </p>
            </div>

            {onNext ? (
              <div className={styles.actions}>
                <Button variant="solid" size="lg" onClick={() => onNext(result.score)} iconAfter="chevron">
                  Next exercise
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
