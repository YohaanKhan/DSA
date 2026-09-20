import { gridGame } from './grid';
import { switchGame } from './switch';
import { digitGame } from './digit';
import { motionGame } from './motion';
import type { GameId, GameMeta } from './types';

/**
 * The arcade index. Concrete engines are imported directly by their own
 * components — a registry of heterogeneous `GameEngine<S, A>` would only be
 * typeable by casting through `any`, and the page needs the metadata anyway.
 */
export const GAMES: GameMeta[] = [gridGame, switchGame, digitGame, motionGame];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameMeta>;

export const isGameId = (value: string): value is GameId =>
  GAMES.some((g) => g.id === value);

export type { GameId, GameMeta, CheckResult, GameEngine } from './types';
