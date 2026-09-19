'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { useIsHydrated } from '@/lib/hooks/useClientState';
import { formatClock } from '@/lib/format';
import type { EssayResult } from '@/lib/comm/grade';
import styles from './Comm.module.css';

export interface EssayItem {
  id: string;
  prompt: string;
  minutes: number;
  targetWords: [number, number];
  rubric: Record<string, string>;
  subtopic?: string;
  difficulty: string;
}

export interface EssayDraft {
  itemId: string;
  text: string;
  elapsedMs: number;
  savedAt: number;
}

type Phase = 'brief' | 'writing' | 'graded';

const AUTOSAVE_MS = 10_000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Both nudges scale with the budget rather than being fixed at three and
 * twenty-one minutes, so a shorter or longer prompt still gets them in the
 * right places. At the standard twenty-five minutes they land exactly where the
 * phase plan asks: stop planning at three, start proofreading with four left.
 */
const planNudgeAt = (totalMs: number) => clamp(totalMs * 0.12, 20_000, 3 * 60_000);
const planNudgeWindow = (totalMs: number) => planNudgeAt(totalMs);
const proofTail = (totalMs: number) => clamp(totalMs * 0.16, 15_000, 5 * 60_000);

const localKey = (sessionId: string) => `exceller.essay.${sessionId}`;
/**
 * Beyond this, the text was pasted rather than composed. Nobody writes prose at
 * two words a second, and saying so is more useful than capping the number and
 * pretending the timing figures mean something.
 */
const IMPLAUSIBLE_WPM = 120;
const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export function EssayComposer({
  item, resumeSessionId, resumeDraft,
}: {
  item: EssayItem;
  resumeSessionId: string | null;
  resumeDraft: EssayDraft | null;
}) {
  const hydrated = useIsHydrated();
  const [phase, setPhase] = useState<Phase>(resumeSessionId ? 'writing' : 'brief');
  const [sessionId, setSessionId] = useState<string | null>(resumeSessionId);
  const [text, setText] = useState(resumeDraft?.text ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(resumeDraft?.savedAt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EssayResult | null>(null);
  const [dismissed, setDismissed] = useState<{ plan: boolean; proof: boolean }>({ plan: false, proof: false });

  const totalMs = item.minutes * 60_000;
  const words = countWords(text);

  const save = useCallback(async (payload: { text: string; elapsedMs: number }) => {
    if (!sessionId) return;
    try { localStorage.setItem(localKey(sessionId), JSON.stringify({ ...payload, savedAt: Date.now() })); }
    catch { /* private mode: the server copy still stands */ }
    try {
      const res = await fetch('/api/comm/essay', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      if (res.ok) setSavedAt((await res.json()).savedAt as number);
    } catch { /* offline: localStorage has it */ }
  }, [sessionId]);

  const submit = useCallback(async (finalText: string, elapsedMs: number) => {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comm/essay/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, text: finalText, elapsedMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Grading failed');
      setResult(data.result as EssayResult);
      setPhase('graded');
      try { localStorage.removeItem(localKey(sessionId)); } catch { /* ignore */ }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [sessionId, busy]);

  // The latest text and clock, for callbacks that must not re-subscribe on every
  // keystroke. Written in an effect, read only from timers — never during render.
  const latest = useRef({ text, elapsedMs: 0 });

  const timer = useExamTimer({
    totalMs,
    autoStart: phase === 'writing',
    onExpire: () => { void submit(latest.current.text, totalMs); },
  });

  useEffect(() => { latest.current = { text, elapsedMs: timer.elapsedMs }; });

  useEffect(() => {
    if (phase !== 'writing' || !sessionId) return;
    const id = setInterval(() => { void save(latest.current); }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [phase, sessionId, save]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comm/essay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start');
      setSessionId(data.sessionId as string);
      // replaceState rather than router.replace: the URL must carry the session
      // so a refresh recovers the draft, but a re-render here would reset the
      // clock that has just started.
      window.history.replaceState(null, '', `/comm/essay?session=${data.sessionId}`);
      setPhase('writing');
      // autoStart only applies on the timer's first render, which happens while
      // this component is still showing the brief. Starting the clock explicitly
      // is what makes the countdown, both nudges and the auto-submit work when
      // you begin from the brief rather than resuming into it.
      timer.start();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [item.id, timer]);

  // A local draft newer than the server's is offered, never forced. Silently
  // swapping text under someone mid-essay is worse than the problem it solves.
  const localDraft = useMemo(() => {
    if (!hydrated || !sessionId || phase !== 'writing') return null;
    try {
      const raw = localStorage.getItem(localKey(sessionId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { text: string; savedAt: number };
      if (!parsed.text || parsed.text === text) return null;
      if (parsed.savedAt <= (savedAt ?? 0)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [hydrated, sessionId, phase, text, savedAt]);

  if (phase === 'brief') {
    return <Brief item={item} busy={busy} error={error} onStart={start} />;
  }

  if (phase === 'graded' && result) {
    return <EssayReport item={item} result={result} elapsedMs={timer.elapsedMs} text={text} />;
  }

  const elapsed = timer.elapsedMs;
  const remaining = timer.remainingMs;
  const planAt = planNudgeAt(totalMs);
  const showPlan = !dismissed.plan && elapsed >= planAt && elapsed < planAt + planNudgeWindow(totalMs);
  const showProof = !dismissed.proof && remaining <= proofTail(totalMs) && remaining > 0;
  const band = words < item.targetWords[0] ? styles.wordsLow
    : words > item.targetWords[1] ? styles.wordsOver : styles.wordsOk;

  return (
    <div className={styles.page} data-stage="english">
      <div className={styles.composerBar}>
        <span className={styles.barCell}>
          <span className={clsx('tabular', styles.barValue, remaining <= 60_000 && styles.wordsOver)}>
            {formatClock(remaining)}
          </span>
          <span className={clsx('microlabel', styles.barLabel)}>Left</span>
        </span>
        <span className={styles.barCell}>
          <span className={clsx('tabular', styles.barValue, band)}>{words}</span>
          <span className={clsx('microlabel', styles.barLabel)}>
            Words · target {item.targetWords[0]}–{item.targetWords[1]}
          </span>
        </span>
        <span className={styles.barSpacer} />
        <span className={clsx('microlabel', styles.saved)}>
          {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}
        </span>
        <Button variant="solid" loading={busy} onClick={() => void submit(text, elapsed)}>
          Submit for grading
        </Button>
      </div>

      {error ? <p role="alert" className={styles.error}>{error}</p> : null}

      {localDraft ? (
        <div className={styles.nudge}>
          <Icon name="unlock" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            A newer local draft exists on this machine ({countWords(localDraft.text)} words, saved{' '}
            {new Date(localDraft.savedAt).toLocaleTimeString()}).
          </span>
          <Button
            className={styles.nudgeDismiss}
            variant="outline"
            size="sm"
            onClick={() => { setText(localDraft.text); setSavedAt(localDraft.savedAt); }}
          >
            Restore it
          </Button>
        </div>
      ) : null}

      {showProof ? (
        <div className={clsx(styles.nudge, styles.nudgeProof)}>
          <Icon name="flag" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            <strong>Stop writing. Start proofreading.</strong> Read it once for agreement and tense,
            once for sentence boundaries. Leaving no proofing time is the most common avoidable mark
            loss in this stage, and it is entirely within your control.
          </span>
          <Button className={styles.nudgeDismiss} variant="ghost" size="sm"
            onClick={() => setDismissed((d) => ({ ...d, proof: true }))}>
            Dismiss
          </Button>
        </div>
      ) : showPlan ? (
        <div className={styles.nudge}>
          <Icon name="timer" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            {Math.round(planAt / 60_000) || 1} minute{planAt >= 90_000 ? 's' : ''} gone. If you are
            still planning, stop — you have enough of a shape.
            A written plan you do not finish scores nothing.
          </span>
          <Button className={styles.nudgeDismiss} variant="ghost" size="sm"
            onClick={() => setDismissed((d) => ({ ...d, plan: true }))}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className={styles.promptStrip}>{item.prompt}</div>

      <textarea
        className={styles.editor}
        value={text}
        spellCheck={false}
        placeholder="Write here. Separate paragraphs with a blank line — the structure score counts them."
        aria-label="Essay text"
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (sessionId) {
            try { localStorage.setItem(localKey(sessionId), JSON.stringify({ text: next, elapsedMs: elapsed, savedAt: Date.now() })); }
            catch { /* private mode */ }
          }
        }}
        onBlur={() => void save({ text, elapsedMs: elapsed })}
      />

      <p className={styles.note}>
        Autosaves every ten seconds to this machine and to the database, so a refresh cannot cost
        you the essay. Spell-check is off deliberately — the exam has none.
      </p>
    </div>
  );
}

function Brief({
  item, busy, error, onStart,
}: {
  item: EssayItem; busy: boolean; error: string | null; onStart: () => void;
}) {
  return (
    <div className={styles.brief} data-stage="english">
      <Link href="/comm" className="microlabel" style={{ color: 'var(--ink-faint)' }}>← Communication</Link>
      <h1>Timed Essay</h1>
      <div className={styles.promptBox}>{item.prompt}</div>

      <div className={styles.facts}>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>{item.minutes}</span>
          <span className={clsx('microlabel', styles.factLabel)}>minutes</span>
        </span>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>{item.targetWords[0]}–{item.targetWords[1]}</span>
          <span className={clsx('microlabel', styles.factLabel)}>words</span>
        </span>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>5</span>
          <span className={clsx('microlabel', styles.factLabel)}>bands, each out of 5</span>
        </span>
      </div>

      <div>
        <span className={clsx('microlabel', styles.sectionLabel)}>How it is marked</span>
        <ul className={styles.rubricList} style={{ marginTop: 'var(--s-3)' }}>
          {Object.entries(item.rubric).map(([key, descriptor]) => (
            <li key={key} className={styles.rubricRow}>
              <span className={styles.rubricName}>{LABEL[key] ?? key}</span>
              <span>{descriptor}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.note}>
        The clock starts when you press the button and does not pause. Two nudges will appear —
        one to stop planning, one to stop writing and proofread with the last sixth of the time.
        Neither blocks typing.
      </p>

      {error ? <p role="alert" className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <Button variant="solid" size="lg" icon="comm" loading={busy} onClick={onStart}>
          Start the 25 minutes
        </Button>
      </div>
    </div>
  );
}

const LABEL: Record<string, string> = {
  taskResponse: 'Task response',
  structure: 'Structure',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  mechanics: 'Mechanics',
};

function EssayReport({
  item, result, elapsedMs, text,
}: {
  item: EssayItem; result: EssayResult; elapsedMs: number; text: string;
}) {
  const m = result.mechanical.metrics;
  const minutes = elapsedMs / 60_000;
  const wpm = minutes > 0 ? m.words / minutes : 0;

  const bands = result.model
    ? (['taskResponse', 'structure', 'grammar', 'vocabulary', 'mechanics'] as const).map((id) => ({
        id, label: LABEL[id], score: result.model![id].score as number | null, why: result.model![id].why,
      }))
    : result.mechanical.criteria.map((c) => ({ id: c.id, label: c.label, score: c.score, why: c.why }));

  const scored = bands.filter((b) => b.score !== null).map((b) => b.score!);
  const overall = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

  return (
    <div className={styles.page} data-stage="english">
      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>
          Essay graded — {result.gradedBy === 'model' ? 'model critique plus local measurements' : 'local measurements only'}
        </span>
        <span className={styles.cardTitle}>
          {overall === null ? 'Measured' : `${overall.toFixed(1)} out of 5`}
        </span>

        <div className={styles.metricGrid}>
          <span className={styles.metric}>
            <span className={clsx('tabular', styles.metricValue, m.inBand ? styles.metricOk : styles.metricBad)}>{m.words}</span>
            <span className={clsx('microlabel', styles.metricLabel)}>words ({item.targetWords[0]}–{item.targetWords[1]})</span>
          </span>
          <span className={styles.metric}>
            <span className={clsx('tabular', styles.metricValue)}>{formatClock(elapsedMs)}</span>
            <span className={clsx('microlabel', styles.metricLabel)}>time used</span>
          </span>
          <span className={styles.metric}>
            <span className={clsx('tabular', styles.metricValue)}>{Math.round(wpm)}</span>
            <span className={clsx('microlabel', styles.metricLabel)}>words per minute</span>
          </span>
          <span className={styles.metric}>
            <span className={clsx('tabular', styles.metricValue)}>{m.paragraphs}</span>
            <span className={clsx('microlabel', styles.metricLabel)}>paragraphs</span>
          </span>
        </div>

        {wpm > IMPLAUSIBLE_WPM ? (
          <p className={styles.cardNote}>
            {Math.round(wpm)} words a minute is faster than anyone composes, so this text was
            pasted rather than written here. The language measurements still hold; the timing ones
            — words per minute, time used, whether you left any proofing time — do not.
          </p>
        ) : null}
        {result.note ? <p className={styles.cardNote}>{result.note}</p> : null}
      </div>

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Bands</span>
        <div className={styles.bands}>
          {bands.map((b) => (
            <div key={b.id} className={styles.band}>
              <span className={styles.bandName}>{b.label}</span>
              <span
                className={clsx(
                  styles.bandScore,
                  b.score === null && styles.bandUnscored,
                  b.score !== null && b.score >= 4 && styles.bandStrong,
                  b.score !== null && b.score < 2.5 && styles.bandWeak,
                )}
              >
                {b.score === null ? '—' : b.score.toFixed(1)}
              </span>
              <span className={styles.bandWhy}>{b.why}</span>
            </div>
          ))}
        </div>
      </div>

      {result.mechanical.fixes.length > 0 ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Fix these three first</span>
          <ol className={styles.fixes}>
            {result.mechanical.fixes.map((fix, i) => (
              <li key={fix} className={styles.fix}>
                <span className={styles.fixNum}>{i + 1}</span>
                <span>{fix}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {result.model && result.model.rewrites.length > 0 ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Your sentences, rewritten</span>
          {result.model.rewrites.map((r) => (
            <div key={r.original} className={styles.rewrite}>
              <span className={styles.rewriteOld}>{r.original}</span>
              <span className={styles.rewriteNew}>{r.rewritten}</span>
              <span className={clsx('microlabel', styles.metricLabel)}>{r.why}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>What was measured</span>
        <div className={styles.metricGrid}>
          <Measure label="sentences" value={String(m.sentences)} />
          <Measure label="mean sentence" value={`${m.meanSentenceWords.toFixed(0)} ± ${m.sentenceStdev.toFixed(0)}`} />
          <Measure label="run-ons" value={String(m.runOns.length)} ok={m.runOns.length === 0} />
          <Measure label="lexical variety" value={(m.mattr * 100).toFixed(0)} />
          <Measure label="connectors / 100w" value={m.connectorDensity.toFixed(1)} />
          <Measure label="passive" value={`${Math.round(m.passiveRatio * 100)}%`} ok={m.passiveRatio <= 0.25} />
          <Measure label="prompt terms used" value={`${Math.round(m.promptCoverage * 100)}%`} ok={m.promptCoverage >= 0.6} />
          <Measure label="intro / conclusion" value={`${m.hasIntro ? 'yes' : 'no'} / ${m.hasConclusion ? 'yes' : 'no'}`} />
        </div>
        {m.repeatedWords.length > 0 ? (
          <p className={styles.cardNote}>
            Repeated: {m.repeatedWords.map((r) => `${r.word} ×${r.count}`).join(', ')}
          </p>
        ) : null}
      </div>

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>What you wrote</span>
        <p className={styles.cardNote} style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>

      <div className={styles.actions}>
        <Link href="/comm/essay" className="press">
          <Badge tone="stage" filled icon="comm">Another prompt</Badge>
        </Link>
        <Link href="/comm" className="microlabel">Back to Communication</Link>
      </div>
    </div>
  );
}

function Measure({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <span className={styles.metric}>
      <span className={clsx('tabular', styles.metricValue, ok === true && styles.metricOk, ok === false && styles.metricBad)}>
        {value}
      </span>
      <span className={clsx('microlabel', styles.metricLabel)}>{label}</span>
    </span>
  );
}
