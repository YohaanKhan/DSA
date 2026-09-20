'use client';

import { clsx } from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { KeyCap } from '@/components/ui/KeyCap';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { levelRng } from '@/lib/games/rng';
import {
  OP_GLYPH, digitGame, slotsOf, type DigitAnswer, type Equation, type Tile,
} from '@/lib/games/digit';
import type { LevelProps } from './GameShell';
import { LevelClock } from './LevelClock';
import styles from './Games.module.css';

/**
 * Digit Challenge.
 *
 * Filling a blank always moves to the next empty one, because at eight seconds
 * a level the interaction cost of re-aiming at the next box is a real fraction
 * of the clock. Clicking a filled blank returns its tile to the bank.
 */
export function DigitLevel({ level, seed, onResult }: LevelProps) {
  const state = useMemo(() => digitGame.generate(level, levelRng(seed, level)), [level, seed]);
  const slots = useMemo(() => slotsOf(state.equations), [state]);

  const [placed, setPlaced] = useState<DigitAnswer>({});
  const [active, setActive] = useState<number>(slots[0].id);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback((answer: DigitAnswer) => {
    if (submitted) return;
    setSubmitted(true);
    onResult(digitGame.check(state, answer));
  }, [onResult, state, submitted]);

  const timer = useExamTimer({
    totalMs: state.seconds * 1000,
    autoStart: true,
    onExpire: () => submit(placed),
  });

  const spent = new Set(Object.values(placed));
  const complete = slots.every((s) => placed[s.id] !== undefined);

  const place = useCallback((tile: Tile) => {
    setPlaced((current) => {
      const slot = slots.find((s) => s.id === active);
      if (!slot || slot.accepts !== tile.kind) return current;
      if (Object.values(current).includes(tile.id)) return current;
      const next = { ...current, [slot.id]: tile.id };
      // Jump to the next blank that is still empty, wrapping round.
      const order = [...slots.slice(slots.indexOf(slot) + 1), ...slots.slice(0, slots.indexOf(slot))];
      setActive((order.find((s) => next[s.id] === undefined) ?? slot).id);
      return next;
    });
  }, [active, slots]);

  const clear = useCallback((slotId: number) => {
    setPlaced((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setActive(slotId);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Enter' && complete) { submit(placed); return; }
      if (event.key === 'Backspace') { clear(active); return; }
      // Typing a digit places the first unspent tile bearing it.
      const tile = state.tiles.find(
        (t) => !spent.has(t.id) && t.kind === 'digit' && String(t.digit) === event.key,
      );
      if (tile) place(tile);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={styles.board}>
      <LevelClock level={level} remainingMs={timer.remainingMs} totalMs={state.seconds * 1000} />

      <div className={styles.equations}>
        {state.equations.map((equation, i) => (
          <EquationRow
            key={i}
            equation={equation}
            placed={placed}
            tiles={state.tiles}
            active={active}
            onSelect={setActive}
            onClear={clear}
          />
        ))}
      </div>

      <span className={clsx('microlabel', styles.cabinetLabel)}>
        Bank — each tile once{state.equations.length > 1 ? ', across both equations' : ''}
      </span>
      <div className={styles.bank}>
        {state.tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={clsx('press', styles.tile, spent.has(tile.id) && styles.tileSpent)}
            disabled={spent.has(tile.id)}
            onClick={() => place(tile)}
          >
            {tile.kind === 'digit' ? tile.digit : OP_GLYPH[tile.op!]}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          disabled={Object.keys(placed).length === 0}
          onClick={() => { setPlaced({}); setActive(slots[0].id); }}
        >
          Clear all
        </Button>
        <Button variant="solid" size="lg" disabled={!complete} onClick={() => submit(placed)}>
          Submit
        </Button>
      </div>

      <p className={styles.boardNote}>
        Type a digit to place it · <KeyCap>Backspace</KeyCap> to lift one · <KeyCap>Enter</KeyCap> to
        submit. Scan for the complement first; do not try tiles in order.
      </p>
    </div>
  );
}

function EquationRow({
  equation, placed, tiles, active, onSelect, onClear,
}: {
  equation: Equation;
  placed: DigitAnswer;
  tiles: Tile[];
  active: number;
  onSelect: (id: number) => void;
  onClear: (id: number) => void;
}) {
  const byId = new Map(tiles.map((t) => [t.id, t]));

  return (
    <div className={styles.equation}>
      {equation.lhs.map((token, i) => {
        if (token.kind === 'num') return <span key={i} className={styles.token}>{token.value}</span>;
        if (token.kind === 'op') {
          return <span key={i} className={clsx(styles.token, styles.tokenMuted)}>{OP_GLYPH[token.value]}</span>;
        }
        const tile = placed[token.id] !== undefined ? byId.get(placed[token.id]) : undefined;
        return (
          <button
            key={i}
            type="button"
            aria-label={`blank ${token.id + 1}`}
            className={clsx(styles.blank, tile && styles.blankFilled, active === token.id && !tile && styles.blankActive)}
            onClick={() => (tile ? onClear(token.id) : onSelect(token.id))}
          >
            {tile ? (tile.kind === 'digit' ? tile.digit : OP_GLYPH[tile.op!]) : ' '}
          </button>
        );
      })}
      <span className={clsx(styles.token, styles.tokenMuted)}>=</span>
      <span className={styles.token}>{equation.target}</span>
    </div>
  );
}
