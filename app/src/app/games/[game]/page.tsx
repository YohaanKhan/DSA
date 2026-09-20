import { notFound } from 'next/navigation';
import { isGameId } from '@/lib/games';
import { gameStats } from '@/lib/games/stats';
import { GamePlayer } from '@/components/games/GamePlayer';

export const dynamic = 'force-dynamic';

export default async function PlayPage({
  params, searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ seed?: string }>;
}) {
  const { game } = await params;
  if (!isGameId(game)) notFound();

  // ?seed=… replays a run exactly. Every level is a pure function of (seed,
  // level), so the puzzle that beat you is reproducible rather than folklore.
  const { seed } = await searchParams;
  const parsed = seed === undefined ? Number.NaN : Number(seed);
  const startSeed = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;

  return <GamePlayer game={game} stats={gameStats(game)} startSeed={startSeed} />;
}
