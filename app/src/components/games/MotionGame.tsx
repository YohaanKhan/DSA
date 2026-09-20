'use client';

import { clsx } from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { levelRng } from '@/lib/games/rng';
import {
  applyMove, carsAt, isGoal, legalMoves, motionGame,
  type MotionMove, type Pos,
} from '@/lib/games/motion';
import type { LevelProps } from './GameShell';
import { LevelClock } from './LevelClock';
import styles from './Games.module.css';

/**
 * Motion Challenge.
 *
 * Generation runs an exhaustive search of the board's reachable component, so
 * it costs a few hundred milliseconds at the deepest levels. It happens in a
 * useMemo on mount, right after the between-levels screen, which is the one
 * moment in the run where a short pause reads as the game thinking rather than
 * as the app hanging.
 */
export function MotionLevel({ level, seed, onResult }: LevelProps) {
  const state = useMemo(() => motionGame.generate(level, levelRng(seed, level)), [level, seed]);
  const [moves, setMoves] = useState<MotionMove[]>([]);
  const [pos, setPos] = useState<Pos>(state.start);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback((list: MotionMove[]) => {
    if (submitted) return;
    setSubmitted(true);
    onResult(motionGame.check(state, { moves: list }));
  }, [onResult, state, submitted]);

  const timer = useExamTimer({
    totalMs: state.seconds * 1000,
    autoStart: true,
    onExpire: () => submit(moves),
  });

  const legal = useMemo(() => legalMoves(state.specs, pos, state.size), [state, pos]);
  const cars = carsAt(state.specs, pos);

  /**
   * Clicking a cell means "put the selected car here". Several slides can cover
   * one cell for a length-three car, so the one whose head lands nearest the
   * click wins — that is what a player means when they aim at a square.
   */
  const clickCell = useCallback((row: number, col: number) => {
    if (selected === null) return;
    const spec = state.specs[selected];
    const onAxis = spec.horiz ? row === spec.fixed : col === spec.fixed;
    if (!onAxis) return;
    const target = spec.horiz ? col : row;

    const candidates = legal
      .filter((m) => m.carId === selected && target >= m.to && target < m.to + spec.len)
      .sort((a, b) => Math.abs(a.to - target) - Math.abs(b.to - target));
    const move = candidates[0];
    if (!move) return;

    const next = applyMove(pos, move);
    const list = [...moves, move];
    setPos(next);
    setMoves(list);
    setSelected(null);
    // Reaching the exit ends the level immediately — there is nothing left to do,
    // and making you press Submit would only cost you seconds you already earned.
    if (isGoal(state.specs, next, state.size)) submit(list);
  }, [selected, state, legal, pos, moves, submit]);

  const undo = useCallback(() => {
    if (moves.length === 0) return;
    const remaining = moves.slice(0, -1);
    setMoves(remaining);
    setPos(remaining.reduce((p, m) => applyMove(p, m), state.start));
    setSelected(null);
  }, [moves, state.start]);

  const overOptimal = moves.length - state.optimal;

  return (
    <div className={styles.board}>
      <LevelClock level={level} remainingMs={timer.remainingMs} totalMs={state.seconds * 1000} />

      <p className={styles.boardPrompt}>
        Get the highlighted block out of the gap on the right. It can be done in {state.optimal} moves.
      </p>

      <div className={styles.motionWrap}>
        <div
          className={styles.motionBoard}
          style={{ ['--cols' as string]: state.size }}
        >
          {Array.from({ length: state.size * state.size }, (_, i) => {
            const row = Math.floor(i / state.size);
            const col = i % state.size;
            return (
              <button
                key={i}
                type="button"
                aria-label={`row ${row + 1} column ${col + 1}`}
                disabled={selected === null}
                className={clsx(styles.motionCell, row === state.exitRow && styles.motionExitRow)}
                onClick={() => clickCell(row, col)}
              />
            );
          })}

          {cars.map((car) => (
            <button
              key={car.id}
              type="button"
              aria-label={
                car.id === 0
                  ? 'target block'
                  : `block ${car.id}, ${car.horiz ? 'horizontal' : 'vertical'}, length ${car.len}`
              }
              aria-pressed={selected === car.id}
              className={clsx(
                styles.motionCar,
                car.id === 0 && styles.motionCarTarget,
                selected === car.id && styles.motionCarSelected,
              )}
              style={{
                left: `calc(var(--cellpad) + ${car.col} * (var(--cell) + var(--cellgap)))`,
                top: `calc(var(--cellpad) + ${car.row} * (var(--cell) + var(--cellgap)))`,
                width: `calc(${car.horiz ? car.len : 1} * var(--cell) + ${(car.horiz ? car.len : 1) - 1} * var(--cellgap))`,
                height: `calc(${car.horiz ? 1 : car.len} * var(--cell) + ${(car.horiz ? 1 : car.len) - 1} * var(--cellgap))`,
              }}
              onClick={() => setSelected((s) => (s === car.id ? null : car.id))}
            />
          ))}

          <span
            className={styles.motionExit}
            style={{
              left: 'calc(100% - 2px)',
              top: `calc(var(--cellpad) + ${state.exitRow} * (var(--cell) + var(--cellgap)))`,
              height: 'var(--cell)',
            }}
            aria-hidden="true"
          >
            <Icon name="chevron" size={16} />
          </span>
        </div>

        <div className={styles.motionSide}>
          <div className={styles.moveCount}>
            <span className={clsx('tabular', styles.moveCountValue, overOptimal > 0 && styles.moveCountOver)}>
              {moves.length}
            </span>
            <span className={clsx('microlabel', styles.cabinetLabel)}>
              / {state.optimal} moves
            </span>
          </div>
          <p className={styles.cardNote}>
            {overOptimal > 0
              ? `${overOptimal} past the optimum — that is ${overOptimal * 10}% of this level gone.`
              : selected === null
                ? 'Click a block to select it, then click where it should go.'
                : 'Now click the square it should slide to.'}
          </p>
          <Button variant="outline" onClick={undo} disabled={moves.length === 0}>
            Undo — free, and not counted
          </Button>
          <Button variant="ghost" size="sm" onClick={() => submit(moves)}>Give up on this level</Button>
        </div>
      </div>

      <p className={styles.boardNote}>
        Find the chain of blockers to the exit and work backwards from it. Plan the whole route
        before you touch anything — the score is the minimum, not the first thing that works.
      </p>
    </div>
  );
}
