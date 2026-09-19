'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DrillRunner, type RunnerItem } from '@/components/drill/DrillRunner';
import { DebugLab, type DebugExercise } from '@/components/debug/DebugLab';
import { AicWizard, type AicProblem } from '@/components/aic/AicWizard';
import { formatClock } from '@/lib/format';
import styles from './Mock.module.css';

interface MockSectionView {
  id: string; label: string; stage: string; kind: string;
  count: number; minutes: number; passMark: number; eliminatory: boolean;
  instructions: string;
  itemIds: string[]; startedAt: number | null; finishedAt: number | null;
  score: number | null; skipped: boolean; skipReason?: string;
  remainingMs: number; short: boolean;
}

type Phase = 'instructions' | 'running' | 'between';

export function MockRunner({ mockId, onFinish }: { mockId: string; onFinish: () => void }) {
  const [sections, setSections] = useState<MockSectionView[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('instructions');
  const [items, setItems] = useState<RunnerItem[] | null>(null);
  const [debugEx, setDebugEx] = useState<DebugExercise | null>(null);
  const [aicProblem, setAicProblem] = useState<AicProblem | null>(null);
  const [lastResult, setLastResult] = useState<{ passed: boolean; eliminatory: boolean; score: number; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Refetch after a section completes. Called from handlers, never an effect. */
  const load = useCallback(async () => {
    const res = await fetch(`/api/mock/${mockId}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSections(data.sections);
    setIndex(Math.min(data.currentIndex, data.sections.length));
  }, [mockId]);

  // Initial fetch. The cancelled flag stops a state update after unmount, which
  // is the real hazard here — and keeps setState out of the effect body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/mock/${mockId}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) { setError(data.error); return; }
      setSections(data.sections);
      setIndex(Math.min(data.currentIndex, data.sections.length));
    })();
    return () => { cancelled = true; };
  }, [mockId]);

  // Sections whose module is unbuilt, or whose bank is empty, are stepped over
  // by DERIVING the next runnable index — no effect, no cascading render. The
  // skip reason is still recorded and shown in the report.
  const effectiveIndex = useMemo(() => {
    let i = index;
    while (i < sections.length && sections[i]?.skipped) i++;
    return i;
  }, [index, sections]);

  const section = sections[effectiveIndex];

  const openSection = useCallback(async () => {
    if (!section) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mock/${mockId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionId: section.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (section.kind === 'mcq' || section.kind === 'trace') {
        setItems(data.items as RunnerItem[]);
      } else if (section.kind === 'debug') {
        const ex = await (await fetch(`/api/debug/${section.itemIds[0]}`)).json();
        setDebugEx(ex);
      } else if (section.kind === 'aic') {
        const p = await (await fetch(`/api/aic/${section.itemIds[0]}`)).json();
        setAicProblem(p);
      }
      setPhase('running');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [mockId, section]);

  const completeSection = useCallback(async (score: number) => {
    if (!section) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/mock/${mockId}/section`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionId: section.id, score }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLastResult({ passed: data.passed, eliminatory: data.eliminatory, score, label: section.label });
      setItems(null); setDebugEx(null); setAicProblem(null);
      await load();

      if (data.done) { onFinish(); return; }
      setIndex(data.nextIndex);
      setPhase('between');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [mockId, section, load, onFinish]);

  if (error) {
    return (
      <div className={styles.page}>
        <p role="alert" className={styles.error}>{error}</p>
        <Button variant="outline" onClick={() => { setError(null); void load(); }}>Retry</Button>
      </div>
    );
  }

  if (!section && sections.length > 0) {
    // Ran off the end without the API saying done — finish defensively.
    return (
      <div className={styles.page}>
        <Button variant="solid" size="lg" onClick={onFinish}>See the report</Button>
      </div>
    );
  }

  if (!section) return <p className={styles.note}>Loading…</p>;

  const progress = (
    <div className={styles.progressRow}>
      {sections.map((s, i) => (
        <span
          key={s.id}
          className={clsx('microlabel', styles.pill,
            s.skipped && styles.pillSkipped,
            !s.skipped && i < effectiveIndex && styles.pillDone,
            !s.skipped && i === effectiveIndex && styles.pillCurrent)}
        >
          {i < effectiveIndex && !s.skipped ? <Icon name="check" size={12} /> : null}
          {s.label}
        </span>
      ))}
    </div>
  );

  // ---- Running a section ---------------------------------------------------
  if (phase === 'running') {
    if (items) {
      return (
        <MockDrillSection
          key={section.id}
          mockId={mockId}
          items={items}
          onComplete={completeSection}
        />
      );
    }
    if (debugEx) {
      return <DebugLab exercise={debugEx} onNext={(score) => void completeSection(score)} />;
    }
    if (aicProblem) {
      return <AicWizard problem={aicProblem} onExit={(score) => void completeSection(score)} />;
    }
    return <p className={styles.note}>Loading section…</p>;
  }

  // ---- Between sections ----------------------------------------------------
  const showVerdict = phase === 'between' && lastResult;

  return (
    <div className={styles.page} data-stage={section.stage}>
      {progress}

      {showVerdict ? (
        <div className={clsx(styles.verdictBanner, lastResult.passed && styles.verdictPass)}>
          <Icon name={lastResult.passed ? 'check' : 'cross'} size={22} style={{ flex: '0 0 auto' }} />
          <div>
            <div className="microlabel">
              {lastResult.label}: {Math.round(lastResult.score * 100)}%
              {lastResult.eliminatory ? (lastResult.passed ? ' — gate cleared' : ' — GATE FAILED') : ''}
            </div>
            <p className={styles.verdictBody} style={{ marginTop: 'var(--s-2)' }}>
              {lastResult.eliminatory && !lastResult.passed
                ? 'In the real assessment your process would end here. The mock continues, because the data from the remaining stages is worth more to you than stopping would be.'
                : 'Next section below. You cannot return to the one you just finished.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.instructions}>
        <span className={clsx('microlabel', styles.sectionNumber)}>
          Section {effectiveIndex + 1} of {sections.length}
        </span>
        <span className={styles.sectionTitle}>{section.label}</span>

        <div className={styles.facts}>
          <span className={styles.fact}>
            <span className={clsx('tabular', styles.factValue)}>{section.itemIds.length}</span>
            <span className={clsx('microlabel', styles.factLabel)}>
              {section.kind === 'debug' || section.kind === 'aic' ? 'task' : 'questions'}
            </span>
          </span>
          <span className={styles.fact}>
            <span className={clsx('tabular', styles.factValue)}>{formatClock(section.minutes * 60_000)}</span>
            <span className={clsx('microlabel', styles.factLabel)}>time limit</span>
          </span>
          <span className={styles.fact}>
            <span className={clsx('tabular', styles.factValue)}>{Math.round(section.passMark * 100)}%</span>
            <span className={clsx('microlabel', styles.factLabel)}>
              {section.eliminatory ? 'to clear the gate' : 'target'}
            </span>
          </span>
        </div>

        <p className={styles.note}>{section.instructions}</p>

        {section.short ? (
          <p className={styles.note}>
            <Badge tone="warn">Thin bank</Badge>{' '}
            Only {section.itemIds.length} of {section.count} questions are seeded for this
            section, so the mock is shorter than the real thing here.
          </p>
        ) : null}

        <div className={styles.warn}>
          <Icon name="lock" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            Once you start, the clock runs and <strong>you cannot return to this section</strong>.
            Running out of time submits what you have.
          </span>
        </div>

        <div className={styles.actions}>
          <Button variant="solid" size="lg" onClick={() => void openSection()} loading={busy}>
            Start {section.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Wraps the drill runner so a mock section reports its own score. */
function MockDrillSection({
  mockId, items, onComplete,
}: {
  mockId: string;
  items: RunnerItem[];
  onComplete: (score: number) => void;
}) {
  return (
    <DrillRunner
      sessionId={mockId}
      items={items}
      // Realism beats telemetry inside a mock: the real exam does not ask how
      // sure you are.
      requireConfidence={false}
      onFinish={({ correct, total }) => onComplete(total > 0 ? correct / total : 0)}
    />
  );
}
