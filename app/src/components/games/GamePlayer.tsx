'use client';

import { gridGame } from '@/lib/games/grid';
import { switchGame } from '@/lib/games/switch';
import { digitGame } from '@/lib/games/digit';
import { motionGame } from '@/lib/games/motion';
import type { GameId, GameStats } from '@/lib/games/types';
import { GameShell, type LevelProps } from './GameShell';
import { GridLevel } from './GridGame';
import { SwitchLevel } from './SwitchGame';
import { DigitLevel } from './DigitGame';
import { MotionLevel } from './MotionGame';

/**
 * The one place that knows which component belongs to which engine. Keeping it
 * here rather than in a registry means every engine stays concretely typed —
 * a `GameEngine<unknown, unknown>` map would only typecheck by lying.
 */
const PLAYERS: Record<GameId, { meta: Parameters<typeof GameShell>[0]['meta']; render: (p: LevelProps) => React.ReactNode }> = {
  grid: { meta: gridGame, render: (p) => <GridLevel {...p} /> },
  switch: { meta: switchGame, render: (p) => <SwitchLevel {...p} /> },
  digit: { meta: digitGame, render: (p) => <DigitLevel {...p} /> },
  motion: { meta: motionGame, render: (p) => <MotionLevel {...p} /> },
};

export function GamePlayer({
  game, stats, startSeed,
}: {
  game: GameId;
  stats: GameStats;
  startSeed?: number;
}) {
  const player = PLAYERS[game];
  return (
    <GameShell
      meta={player.meta}
      initialStats={stats}
      renderLevel={player.render}
      startSeed={startSeed}
    />
  );
}
