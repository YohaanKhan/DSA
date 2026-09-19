'use client';

import { clsx } from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExamTimer } from '@/components/ui/ExamTimer';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { STEP_ORDER, STEP_WEIGHTS, type StepId } from '@/lib/scoring/aic';
import { RubricChecklist, type Requirement } from './RubricChecklist';
import { StepRail } from './StepRail';
import styles from './Aic.module.css';

export interface AicProblem {
  id: string;
  title: string;
  language: string;
  problem: string;
  targetSeconds: number;
  rubricSizes: Record<string, number>;
  liveAssistant: boolean;
}

interface StepResult {
  outOfFive: number;
  covered: string[];
  missed: string[];
  requirements: Requirement[];
  falsePositives?: string[];
  decoysNamed?: Requirement[];
  assistantOutput?: string;
  liveAssistant?: boolean;
  complexityNote?: string | null;
  restart?: boolean;
  message?: string | null;
  rejected?: boolean;
  overlap?: number;
}

interface FinalResult {
  total: number;
  weakestStep: StepId | null;
  codePasses: boolean;
  compileError?: string;
  failingTests: string[];
  modelPromptExample: string;
  expectedComplexity: string;
  referenceSolution: string;
  perStep: { step: StepId; outOfFive: number }[];
}

const ASK: Record<StepId, { title: string; submitLabel: string; ask: string; why: string; placeholder: string }> = {
  frame: {
    title: 'Frame the problem',
    submitLabel: 'Submit framing',
    ask: 'Restate the problem in your own words. What are the inputs, the outputs, the constraints, and the edge cases?',
    why: 'A clear problem statement is what makes every later prompt land. Missing an edge case here is the single most common failure in this round — and you will not discover it until the code is already wrong.',
    placeholder: 'Input: …\nOutput: …\nConstraints: …\nEdge cases: …',
  },
  plan: {
    title: 'Plan the approach',
    submitLabel: 'Submit plan',
    ask: 'What is your approach, and what time and space complexity are you targeting?',
    why: 'Deciding the shape before you ask for code is what stops you accepting whatever the assistant happens to produce.',
    placeholder: 'Approach: …\nComplexity: O(…) time, O(…) space',
  },
  prompt: {
    title: 'Write the prompt',
    submitLabel: 'Send prompt',
    ask: 'Write the prompt you would give an AI assistant to produce this solution.',
    why: 'Worth 30% — the most of any step. You cannot paste the problem statement: the box rejects it. Name the language, state the exact behaviour, list the constraints and edge cases, and say what you want back.',
    placeholder: 'Write a <language> function that …',
  },
  review: {
    title: 'Review the output',
    submitLabel: 'Submit review',
    ask: 'What is wrong, risky, or missing in this code?',
    why: 'Worth 25%, and the step most candidates skip entirely. Be specific: an invented flaw costs you 0.5, so listing everything does not work.',
    placeholder: 'It does not handle …\nThe complexity claim is …',
  },
  refine: {
    title: 'Refine',
    submitLabel: 'Send refinement',
    ask: 'Write one targeted follow-up that fixes the specific defect you found.',
    why: 'A targeted follow-up scores; restating the whole problem does not. Name what is wrong and ask for that one thing.',
    placeholder: 'Your version returns … when …. Change it so that …',
  },
};

export function AicWizard({
  problem,
  onExit,
}: {
  problem: AicProblem;
  /** Receives the final score (0..1) so a mock section can record the real one. */
  onExit?: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StepResult | null>(null);
  const [history, setHistory] = useState<{ step: StepId; outOfFive: number; text: string; covered: string[]; missed: string[] }[]>([]);
  const [assistantCode, setAssistantCode] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [final, setFinal] = useState<FinalResult | null>(null);

  const timer = useExamTimer({ totalMs: problem.targetSeconds * 1000, autoStart: true, tickMs: 500 });
  const step = STEP_ORDER[index];
  const done = index >= STEP_ORDER.length;

  const scores = useMemo(
    () => Object.fromEntries(history.map((h) => [h.step, h.outOfFive])) as Partial<Record<StepId, number>>,
    [history],
  );

  const submitStep = useCallback(async () => {
    if (!text.trim() || busy || done) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/aic/${problem.id}/step`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step, text, previousPrompt: step === 'refine' ? promptText : undefined }),
      });
      const data: StepResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? `Request failed (${res.status})`);

      // The anti-paste rejection is not a failed step — you simply try again.
      if (data.rejected) { setResult(data); return; }

      setResult(data);
      if (data.assistantOutput) setAssistantCode(data.assistantOutput);
      if (step === 'prompt') setPromptText(text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [text, busy, done, problem.id, step, promptText]);

  const advance = useCallback(async () => {
    if (!result || result.rejected) return;
    const entry = { step, outOfFive: result.outOfFive, text, covered: result.covered, missed: result.missed };
    const nextHistory = [...history, entry];
    setHistory(nextHistory);
    setResult(null);
    setText('');

    if (index + 1 < STEP_ORDER.length) { setIndex(index + 1); return; }

    // Last step: score the whole run.
    setBusy(true);
    timer.pause();
    try {
      const res = await fetch(`/api/aic/${problem.id}/finish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          elapsedMs: Math.round(timer.elapsedMs),
          steps: nextHistory,
          finalCode: assistantCode ?? '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setFinal(data);
      setIndex(STEP_ORDER.length);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [result, step, text, history, index, problem.id, timer, assistantCode]);

  if (final) return <AicResult problem={problem} final={final} history={history} onExit={onExit} />;

  const copy = ASK[step];

  return (
    <div className={styles.wizard} data-stage="aic">
      <div className={styles.bar}>
        <Badge tone="stage">{problem.language.toUpperCase()}</Badge>
        <Badge tone={problem.liveAssistant ? 'ok' : 'warn'}>
          {problem.liveAssistant ? 'live assistant' : 'offline — scripted assistant'}
        </Badge>
        <span className={styles.barSpacer} />
        <ExamTimer remainingMs={timer.remainingMs} totalMs={problem.targetSeconds * 1000} size="sm" label="for this problem" />
      </div>

      <StepRail current={step} scores={scores} />

      <Panel title={problem.title} headerTone="stage">
        <p className="reading">{problem.problem}</p>
      </Panel>

      <div>
        <h2>{index + 1}. {copy.title}</h2>
        <p className={styles.ask} style={{ marginTop: 'var(--s-3)' }}>{copy.ask}</p>
        <p className={styles.why} style={{ marginTop: 'var(--s-2)' }}>{copy.why}</p>
      </div>

      {step === 'review' && assistantCode ? (
        <Panel title="What the assistant produced" headerTone="plain">
          <pre className={styles.code}>{assistantCode}</pre>
        </Panel>
      ) : null}

      {!result || result.rejected ? (
        <>
          {result?.rejected ? (
            <div className={styles.rejected} role="alert">
              <Icon name="cross" size={20} style={{ flex: '0 0 auto', color: 'var(--bad)' }} />
              <div>
                <div className="microlabel">Rejected — {result.overlap}% of this is the problem statement</div>
                <p className={styles.rejectedText} style={{ marginTop: 'var(--s-2)' }}>{result.message}</p>
              </div>
            </div>
          ) : null}

          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.ask}
            disabled={busy}
          />

          <div className={styles.actions}>
            <Button variant="solid" size="lg" onClick={() => void submitStep()} loading={busy} disabled={!text.trim()}>
              {copy.submitLabel}
            </Button>
            <span className={clsx('microlabel', styles.note)}>
              Worth {Math.round(STEP_WEIGHTS[step] * 100)}% · you cannot go back
            </span>
          </div>
        </>
      ) : (
        <>
          <Panel title={`Scored ${result.outOfFive} / 5`} headerTone="stage">
            <RubricChecklist
              requirements={result.requirements}
              covered={result.covered}
              falsePositives={result.falsePositives}
              decoysNamed={result.decoysNamed}
            />
            {result.complexityNote ? (
              <p className={styles.note} style={{ marginTop: 'var(--s-4)' }}>{result.complexityNote}</p>
            ) : null}
            {result.message ? (
              <p className={styles.note} style={{ marginTop: 'var(--s-4)' }}>{result.message}</p>
            ) : null}
          </Panel>

          {result.assistantOutput && step !== 'review' ? (
            <Panel title={result.liveAssistant ? 'The assistant replied' : 'The assistant replied (scripted, offline)'} headerTone="plain">
              <pre className={styles.code}>{result.assistantOutput}</pre>
            </Panel>
          ) : null}

          <div className={styles.actions}>
            <Button variant="solid" size="lg" onClick={() => void advance()} loading={busy} iconAfter="chevron">
              {index + 1 < STEP_ORDER.length ? `Next: ${ASK[STEP_ORDER[index + 1]].title}` : 'See results'}
            </Button>
          </div>
        </>
      )}

      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}

function AicResult({
  problem, final, history, onExit,
}: {
  problem: AicProblem;
  final: FinalResult;
  history: { step: StepId; text: string }[];
  onExit?: (score: number) => void;
}) {
  const yourPrompt = history.find((h) => h.step === 'prompt')?.text ?? '';

  return (
    <div className={styles.wizard} data-stage="aic">
      <StepRail current="done" scores={Object.fromEntries(final.perStep.map((s) => [s.step, s.outOfFive])) as Partial<Record<StepId, number>>} />

      <Panel title="Result" headerTone="stage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <div className={styles.verdict}>
            <span className={clsx('tabular', styles.total)}>{Math.round(final.total)}</span>
            <span className={clsx('tabular', styles.totalOut)}>/ 100</span>
            <Badge tone={final.codePasses ? 'ok' : 'bad'} icon={final.codePasses ? 'check' : 'cross'}>
              {final.codePasses ? 'Final code passes the tests' : 'Final code fails the tests'}
            </Badge>
            {final.weakestStep ? <Badge tone="warn">Weakest: {final.weakestStep}</Badge> : null}
          </div>

          {!final.codePasses && final.failingTests.length > 0 ? (
            <p className={styles.note}>
              Failing: {final.failingTests.join(', ')}. The round scores the collaboration, but
              code that does not work still shows up here.
            </p>
          ) : null}

          <div>
            <span className={clsx('microlabel', styles.label)}>Your prompt vs. the exemplar</span>
            <div className={styles.compare} style={{ marginTop: 'var(--s-3)' }}>
              <div className={clsx(styles.compareBox, styles.compareYours)}>
                <span className="microlabel">Yours</span>
                {'\n\n'}{yourPrompt || '(none)'}
              </div>
              <div className={clsx(styles.compareBox, styles.compareModel)}>
                <span className="microlabel">Exemplar</span>
                {'\n\n'}{final.modelPromptExample}
              </div>
            </div>
            <p className={styles.note} style={{ marginTop: 'var(--s-3)' }}>
              This is the most instructive screen in the app. The exemplar is not better writing —
              it is the same information, stated explicitly: language, exact behaviour, the
              input/output contract, the edge cases, and the complexity target.
            </p>
          </div>

          <div>
            <span className={clsx('microlabel', styles.label)}>Reference solution ({problem.language})</span>
            <pre className={styles.code} style={{ marginTop: 'var(--s-2)' }}>{final.referenceSolution}</pre>
          </div>

          {onExit ? (
            <div className={styles.actions}>
              <Button variant="solid" size="lg" onClick={() => onExit(final.total / 100)} iconAfter="chevron">Another problem</Button>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
