'use client';

import { clsx } from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { formatClock } from '@/lib/format';
import { randomSeed } from '@/lib/games/rng';
import { GAME_BY_ID, type GameId } from '@/lib/games';
import { GridLevel } from '@/components/games/GridGame';
import { SwitchLevel } from '@/components/games/SwitchGame';
import { DigitLevel } from '@/components/games/DigitGame';
import { MotionLevel } from '@/components/games/MotionGame';
import type { CheckResult } from '@/lib/games/types';
import type { LevelProps } from '@/components/games/GameShell';
import styles from './Mock.module.css';

const RENDER: Record<GameId, (p: LevelProps) => React.ReactNode> = {
  grid: (p) => <GridLevel {...p} />,
  switch: (p) => <SwitchLevel {...p} />,
  digit: (p) => <DigitLevel {...p} />,
  motion: (p) => <MotionLevel {...p} />,
};

/**
 * The cognitive section of a mock: several games back to back under one clock,
 * which is how the stage is reported to run.
 *
 * Scoring differs from the arcade deliberately. The arcade rewards depth with a
 * squared-level score, because there the goal is to find your ceiling. In a
 * mock the only question is whether this section would clear its pass mark, so
 * it is graded on levels cleared against a fixed target — a number that means
 * the same thing in every run and can be compared across mocks.
 */
const TARGET_LEVELS = 5;

export function MockGameSection({
  gameIds, minutes, onComplete,
}: {
  gameIds: GameId[];
  minutes: number;
  onComplete: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const seed = useMemo(() => randomSeed(), []);
  const perGameMs = (minutes * 60_000) / Math.max(1, gameIds.length);

  const finishGame = useCallback((cleared: number) => {
    const score = Math.min(1, cleared / TARGET_LEVELS);
    const next = [...scores, score];
    if (index + 1 >= gameIds.length) {
      onComplete(next.reduce((a, b) => a + b, 0) / next.length);
      return;
    }
    setScores(next);
    setIndex(index + 1);
  }, [scores, index, gameIds.length, onComplete]);

  const gameId = gameIds[index];
  if (!gameId) return <p className={styles.note}>No games in this section.</p>;

  return (
    <MockGameRun
      key={gameId}
      gameId={gameId}
      seed={seed}
      budgetMs={perGameMs}
      position={index + 1}
      total={gameIds.length}
      onDone={finishGame}
    />
  );
}

/**
 * The rules screen and the run are separate components so the clock MOUNTS when
 * the run begins. A timer whose autoStart flips from false to true after its
 * first render never starts — autoStart is read once, in the lazy initialiser.
 */
function MockGameRun({
  gameId, seed, budgetMs, position, total, onDone,
}: {
  gameId: GameId;
  seed: number;
  budgetMs: number;
  position: number;
  total: number;
  onDone: (cleared: number) => void;
}) {
  const meta = GAME_BY_ID[gameId];
  const [started, setStarted] = useState(false);

  // The rules screen precedes every game, in the mock as in the arcade. Reading
  // rules on the clock is the loss this stage is most often lost to.
  if (!started) {
    return (
      <div className={styles.page} data-stage="cognitive">
        <div className={styles.instructions}>
          <span className={clsx('microlabel', styles.sectionNumber)}>
            Game {position} of {total} · {formatClock(budgetMs)} each
          </span>
          <span className={styles.sectionTitle}>{meta.title}</span>
          <ol className={styles.gameRules}>
            {meta.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ol>
          <p className={styles.note}>
            Clearing {TARGET_LEVELS} levels scores full marks for this game. The clock runs until
            it expires or you fail a level, whichever comes first.
          </p>
          <div className={styles.actions}>
            <Button variant="solid" size="lg" onClick={() => setStarted(true)}>
              Start {meta.title}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RunningGame
      gameId={gameId}
      seed={seed}
      budgetMs={budgetMs}
      position={position}
      total={total}
      onDone={onDone}
    />
  );
}

function RunningGame({
  gameId, seed, budgetMs, position, total, onDone,
}: {
  gameId: GameId;
  seed: number;
  budgetMs: number;
  position: number;
  total: number;
  onDone: (cleared: number) => void;
}) {
  const meta = GAME_BY_ID[gameId];
  const [level, setLevel] = useState(1);
  const [cleared, setCleared] = useState(0);

  const timer = useExamTimer({
    totalMs: budgetMs,
    autoStart: true,
    // The expiry closure is held in a ref inside the timer and refreshed every
    // render, so it always sees the current count.
    onExpire: () => onDone(cleared),
  });

  const onResult = useCallback((result: CheckResult) => {
    if (!result.correct) { onDone(cleared); return; }
    setCleared((c) => c + 1);
    setLevel((l) => l + 1);
  }, [cleared, onDone]);

  return (
    <div className={styles.page} data-stage="cognitive">
      <div className={styles.gameHud}>
        <span className={clsx('microlabel')}>{meta.title} — game {position} of {total}</span>
        <span className={styles.spacer} />
        <span className={clsx('tabular')}>Level {level}</span>
        <span className={clsx('tabular')}>{cleared} / {TARGET_LEVELS} cleared</span>
        <span className={clsx('tabular')}>{formatClock(timer.remainingMs)}</span>
      </div>
      <div key={`${gameId}-${level}`}>
        {RENDER[gameId]({ level, seed, onResult })}
      </div>
    </div>
  );
}
