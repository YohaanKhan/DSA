'use client';

import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { KeyCap } from '@/components/ui/KeyCap';
import { NumberedSource } from './QuestionStem';
import styles from './VariableTable.module.css';

export interface TraceStep {
  step: number;
  line: number;
  vars: Record<string, unknown>;
  output?: string;
  note?: string;
}

const render = (v: unknown): string => {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  return String(v);
};

/**
 * The reason Trace Lab exists as its own module rather than folding into the
 * MCQ engine.
 *
 * Tracing is a PROCEDURE, not a fact. Being told "the answer was 3" teaches
 * nothing. Watching x go 13 → 12 → 8 → 0 while the highlighted line sits on
 * `x = x & (x-1)` teaches the procedure.
 */
export function VariableTable({ trace, source }: { trace: TraceStep[]; source: string }) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  const columns = useMemo(() => {
    const seen: string[] = [];
    for (const step of trace) {
      for (const key of Object.keys(step.vars)) if (!seen.includes(key)) seen.push(key);
    }
    return seen;
  }, [trace]);

  const step = trace[cursor];

  // Derived, not stored: autoplay simply has nothing left to schedule at the
  // end, so no effect needs to switch it off.
  const atEnd = cursor >= trace.length - 1;
  const running = playing && !atEnd;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setCursor((c) => Math.min(c + 1, trace.length - 1)), 1000);
    return () => clearTimeout(id);
  }, [running, cursor, trace.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); setCursor((c) => Math.min(c + 1, trace.length - 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === 'Home') { setPlaying(false); setCursor(0); }
      if (e.key === 'End') { setPlaying(false); setCursor(trace.length - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trace.length]);

  const changedIn = (i: number, key: string): boolean => {
    if (i === 0) return key in trace[0].vars;
    const prev = trace[i - 1].vars[key];
    const now = trace[i].vars[key];
    return render(prev) !== render(now);
  };

  return (
    <Panel title="Step through the execution" headerTone="stage">
      <div className={styles.wrap}>
        <div className={styles.controls}>
          <Button
            size="sm"
            onClick={() => { setPlaying(false); setCursor((c) => Math.max(c - 1, 0)); }}
            disabled={cursor === 0}
            aria-label="Previous step"
          >
            <Icon name="chevron" size={16} rotate={180} />
          </Button>
          <Button
            size="sm"
            variant={running ? 'solid' : 'outline'}
            onClick={() => { if (atEnd) setCursor(0); setPlaying((p) => !p || atEnd); }}
          >
            {running ? 'Pause' : 'Play'}
          </Button>
          <Button
            size="sm"
            iconAfter="chevron"
            onClick={() => { setPlaying(false); setCursor((c) => Math.min(c + 1, trace.length - 1)); }}
            disabled={cursor >= trace.length - 1}
            aria-label="Next step"
          />
          <span className={clsx('microlabel', styles.stepLabel)}>
            Step {step.step} of {trace[trace.length - 1].step} · line {step.line}
          </span>
          <span className={clsx('microlabel', styles.legend)}>
            <KeyCap>←</KeyCap> <KeyCap>→</KeyCap> to step
          </span>
        </div>

        <div className={styles.split}>
          <NumberedSource source={source} highlightLine={step.line} />

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col">Line</th>
                  {columns.map((c) => <th key={c} scope="col">{c}</th>)}
                  <th scope="col">Output</th>
                </tr>
              </thead>
              <tbody>
                {trace.map((s, i) => (
                  <tr
                    key={s.step}
                    className={clsx(styles.row, i === cursor && styles.current)}
                    onClick={() => { setPlaying(false); setCursor(i); }}
                    aria-current={i === cursor ? 'step' : undefined}
                  >
                    <td>{s.step}</td>
                    <td>{s.line}</td>
                    {columns.map((c) => (
                      <td key={c} className={clsx(changedIn(i, c) && styles.changed)}>
                        {c in s.vars ? render(s.vars[c]) : '—'}
                      </td>
                    ))}
                    <td className={clsx(s.output !== undefined && i !== cursor && styles.output)}>
                      {s.output ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {step.note ? <p className={styles.note}>{step.note}</p> : null}
      </div>
    </Panel>
  );
}
