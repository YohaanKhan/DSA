'use client';

import { clsx } from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { levelRng } from '@/lib/games/rng';
import { gridGame, type GridState } from '@/lib/games/grid';
import type { LevelProps } from './GameShell';
import { LevelClock } from './LevelClock';
import styles from './Games.module.css';

/**
 * Grid Challenge.
 *
 * Each phase is its own component so that each gets its own freshly-mounted
 * timer. Trying to reuse one timer across three phases means reset/start dances
 * driven from inside the expiry callback, and that is exactly the kind of code
 * that quietly loses half a second per phase.
 */
export function GridLevel({ level, seed, onResult }: LevelProps) {
  const state = useMemo(() => gridGame.generate(level, levelRng(seed, level)), [level, seed]);
  const [phase, setPhase] = useState<'memorise' | 'interference' | 'recall'>('memorise');
  const [interference, setInterference] = useState<boolean | null>(null);

  const finish = useCallback(
    (cells: number[]) => onResult(gridGame.check(state, { cells, interference })),
    [onResult, state, interference],
  );

  return (
    <div className={styles.board}>
      <div className={styles.phaseBar}>
        {(['memorise', 'interference', 'recall'] as const).map((p, i) => (
          <span
            key={p}
            className={clsx('microlabel', styles.phaseChip,
              phase === p && styles.phaseChipOn,
              ['memorise', 'interference', 'recall'].indexOf(phase) > i && styles.phaseChipDone)}
          >
            {p === 'interference' ? 'distraction' : p}
          </span>
        ))}
      </div>

      {phase === 'memorise' ? (
        <MemorisePhase state={state} onDone={() => setPhase('interference')} />
      ) : phase === 'interference' ? (
        <InterferencePhase
          state={state}
          onDone={(answer) => { setInterference(answer); setPhase('recall'); }}
        />
      ) : (
        <RecallPhase state={state} onDone={finish} />
      )}
    </div>
  );
}

function gridStyle(n: number) {
  return { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, width: `min(${n * 64}px, 90vw)` };
}

function MemorisePhase({ state, onDone }: { state: GridState; onDone: () => void }) {
  const timer = useExamTimer({ totalMs: state.memoriseMs, autoStart: true, onExpire: onDone, tickMs: 80 });

  return (
    <>
      <p className={styles.boardPrompt}>Memorise the lit cells</p>
      <LevelClock level={state.level} remainingMs={timer.remainingMs} totalMs={state.memoriseMs} />
      <div className={styles.dotGrid} style={gridStyle(state.n)}>
        {Array.from({ length: state.n * state.n }, (_, i) => (
          <span
            key={i}
            className={clsx(styles.cell, styles.cellStatic, state.dots.includes(i) && styles.cellLit)}
          />
        ))}
      </div>
      <p className={styles.boardNote}>
        Chunk them into a shape and say the rows to yourself — a verbal trace survives the
        distraction far better than a picture does.
      </p>
    </>
  );
}

function InterferencePhase({
  state, onDone,
}: {
  state: GridState; onDone: (answer: boolean | null) => void;
}) {
  const task = state.interference;
  // Running out of time answers null, which counts as wrong. That is the
  // intended pressure: dithering here costs you the pattern as well as the mark.
  const timer = useExamTimer({
    totalMs: state.interferenceMs, autoStart: true, onExpire: () => onDone(null), tickMs: 80,
  });

  return (
    <>
      <p className={styles.boardPrompt}>{task.question}</p>
      <LevelClock level={state.level} remainingMs={timer.remainingMs} totalMs={state.interferenceMs} />

      <div className={styles.shapePair}>
        <ShapeGrid cells={task.a} size={task.size} />
        {task.b ? <ShapeGrid cells={task.b} size={task.size} /> : null}
      </div>

      <div className={styles.actions}>
        <Button variant="solid" size="lg" onClick={() => onDone(true)}>Yes</Button>
        <Button variant="outline" size="lg" onClick={() => onDone(false)}>No</Button>
      </div>
      <p className={styles.boardNote}>Answer fast, even by guessing. Rehearse the dots while you do.</p>
    </>
  );
}

function ShapeGrid({ cells, size }: { cells: number[]; size: number }) {
  return (
    <div className={styles.dotGrid} style={{ ...gridStyle(size), width: `${size * 30}px` }}>
      {Array.from({ length: size * size }, (_, i) => (
        <span key={i} className={clsx(styles.cell, styles.cellStatic, cells.includes(i) && styles.cellLit)} />
      ))}
    </div>
  );
}

function RecallPhase({ state, onDone }: { state: GridState; onDone: (cells: number[]) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const timer = useExamTimer({
    totalMs: state.recallMs, autoStart: true, onExpire: () => onDone(picked), tickMs: 80,
  });

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((c) => c !== i) : [...p, i]));

  return (
    <>
      <p className={styles.boardPrompt}>
        Click the {state.dots.length} cells that were lit
      </p>
      <LevelClock level={state.level} remainingMs={timer.remainingMs} totalMs={state.recallMs} />

      <div className={styles.dotGrid} style={gridStyle(state.n)}>
        {Array.from({ length: state.n * state.n }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`row ${Math.floor(i / state.n) + 1} column ${(i % state.n) + 1}`}
            aria-pressed={picked.includes(i)}
            className={clsx(styles.cell, picked.includes(i) && styles.cellPicked)}
            onClick={() => toggle(i)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <span className={clsx('microlabel', styles.cabinetLabel)}>
          {picked.length} of {state.dots.length} placed
        </span>
        <Button
          variant="solid"
          size="lg"
          disabled={picked.length !== state.dots.length}
          onClick={() => onDone(picked)}
        >
          Submit recall
        </Button>
      </div>
      <p className={styles.boardNote}>
        All of them or nothing — the real thing gives no partial credit, so neither does this.
      </p>
    </>
  );
}
