'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { KeyCap } from '@/components/ui/KeyCap';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { levelRng } from '@/lib/games/rng';
import { OPS, switchGame, type OpCode, type Shape } from '@/lib/games/switch';
import type { LevelProps } from './GameShell';
import { LevelClock } from './LevelClock';
import { ShapeGlyph } from './ShapeGlyph';
import styles from './Games.module.css';

/**
 * Switch Challenge.
 *
 * The operator table stays on screen the whole time. Hiding it would test
 * memory, and this game is supposed to test deduction — the real version shows
 * its rules too, and the skill is reading them fast enough to reason with.
 */
export function SwitchLevel({ level, seed, onResult }: LevelProps) {
  const state = useMemo(() => switchGame.generate(level, levelRng(seed, level)), [level, seed]);
  const [answer, setAnswer] = useState<OpCode[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback((codes: OpCode[]) => {
    if (submitted) return;
    setSubmitted(true);
    onResult(switchGame.check(state, codes));
  }, [onResult, state, submitted]);

  const timer = useExamTimer({
    totalMs: state.seconds * 1000,
    autoStart: true,
    onExpire: () => submit(answer),
  });

  const full = answer.length === state.applied.length;

  const push = useCallback((code: OpCode) => {
    setAnswer((a) => (a.length >= state.applied.length ? a : [...a, code]));
  }, [state.applied.length]);

  // Number keys pick operators, backspace undoes, Enter submits. Reaching for a
  // mouse at fifteen seconds is a tax the keyboard-fluent should not pay.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Backspace') { setAnswer((a) => a.slice(0, -1)); return; }
      if (event.key === 'Enter' && answer.length === state.applied.length) { submit(answer); return; }
      const code = Number(event.key) as OpCode;
      if (state.pool.includes(code)) push(code);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, push, state.applied.length, state.pool, submit]);

  return (
    <div className={styles.board}>
      <LevelClock level={level} remainingMs={timer.remainingMs} totalMs={state.seconds * 1000} />

      <Row shapes={state.before} label="before" />
      <Icon name="chevron" size={28} className={styles.arrowDown} style={{ transform: 'rotate(90deg)' }} />
      <Row shapes={state.after} label="after" />

      <p className={styles.boardPrompt}>
        {state.applied.length === 1
          ? 'One operator was applied. Which?'
          : `${state.applied.length} operators were applied, in order. Which?`}
      </p>

      <div className={styles.answerStrip}>
        {Array.from({ length: state.applied.length }, (_, i) =>
          answer[i] === undefined ? (
            <span key={i} className={clsx('microlabel', styles.answerEmpty)}>slot {i + 1}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={styles.answerChip}
              onClick={() => setAnswer((a) => a.filter((_, j) => j !== i))}
              aria-label={`remove operator ${answer[i]}`}
            >
              {answer[i]} <Icon name="cross" size={12} />
            </button>
          ),
        )}
      </div>

      <div className={styles.opTable}>
        {OPS.filter((op) => state.pool.includes(op.code)).map((op) => (
          <button
            key={op.code}
            type="button"
            className={clsx('press', styles.opRow)}
            disabled={full}
            onClick={() => push(op.code)}
          >
            <span className={styles.opCode}>{op.code}</span>
            <span className={styles.opLabel}>{op.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={() => setAnswer([])} disabled={answer.length === 0}>
          Clear
        </Button>
        <Button variant="solid" size="lg" disabled={!full} onClick={() => submit(answer)}>
          Submit
        </Button>
      </div>

      <p className={styles.boardNote}>
        <KeyCap>1</KeyCap>–<KeyCap>{String(state.pool.length)}</KeyCap> to pick ·{' '}
        <KeyCap>Backspace</KeyCap> to undo · <KeyCap>Enter</KeyCap> to submit. Work backwards from
        the result: find a position that did not move, and eliminate everything that would have
        moved it.
      </p>
    </div>
  );
}

function Row({ shapes, label }: { shapes: Shape[]; label: string }) {
  return (
    <div>
      <span className={clsx('microlabel', styles.slotIndex)} style={{ display: 'block', marginBottom: 'var(--s-2)' }}>
        {label}
      </span>
      <div className={styles.sequence}>
        {shapes.map((shape, i) => (
          <span key={i}>
            <span className={styles.slotBox}>
              <ShapeGlyph shape={shape} />
            </span>
            <span className={clsx('microlabel', styles.slotIndex)} style={{ display: 'block' }}>{i + 1}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
