import Link from 'next/link';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { GAMES } from '@/lib/games';
import { allGameStats } from '@/lib/games/stats';
import { PLATEAU_MIN_RUNS } from '@/lib/scoring/games';
import shell from '@/components/shell/Shell.module.css';
import styles from '@/components/games/Games.module.css';

export const dynamic = 'force-dynamic';

/**
 * The arcade index.
 *
 * It is deliberately blunt about what this stage is worth. Cognitive games
 * measure a trait more than a skill; three hours here removes every surprise
 * and teaches four strategies, and then it stops paying. The page says so, and
 * the plateau verdicts make it concrete rather than a slogan.
 */
export default function GamesPage() {
  const stats = allGameStats();
  const byId = new Map(stats.map((s) => [s.game, s]));
  const played = stats.filter((s) => s.runs > 0);
  const spent = stats.filter((s) => s.plateau.plateaued);

  return (
    <div className={clsx(shell.stack, styles.page)} data-stage="cognitive">
      <h1>Cognitive Arcade</h1>

      <p className="reading">
        Four procedurally generated re-creations of the games most often reported in this stage.
        The point of practising them is <strong>not</strong> to raise your working memory — you
        cannot move a trait far in a week. It is to walk in having never seen a rule for the first
        time on the clock, and to know each game&rsquo;s strategy cold. Both of those are worth
        real marks, and both are done in about three hours.
      </p>

      <div className={styles.cabinets}>
        {GAMES.map((game) => {
          const s = byId.get(game.id)!;
          return (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className={clsx('press', styles.cabinet)}
            >
              <div className={styles.cabinetHead}>
                <span className={styles.cabinetTitle}>{game.title}</span>
                {s.plateau.plateaued ? <Badge tone="warn">Plateaued</Badge> : null}
              </div>
              <p className={styles.cabinetBlurb}>{game.blurb}</p>
              <div className={styles.cabinetStats}>
                <span className={styles.cabinetStat}>
                  <span className={clsx('tabular', styles.cabinetValue)}>
                    {s.runs > 0 ? s.best.toFixed(1) : '—'}
                  </span>
                  <span className={clsx('microlabel', styles.cabinetLabel)}>Best</span>
                </span>
                <span className={styles.cabinetStat}>
                  <span className={clsx('tabular', styles.cabinetValue)}>
                    {s.runs > 0 ? s.bestLevel : '—'}
                  </span>
                  <span className={clsx('microlabel', styles.cabinetLabel)}>Deepest</span>
                </span>
                <span className={styles.cabinetStat}>
                  <span className={clsx('tabular', styles.cabinetValue)}>{s.runs}</span>
                  <span className={clsx('microlabel', styles.cabinetLabel)}>Runs</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {played.length > 0 ? (
        <div className={styles.card}>
          <span className={clsx('microlabel', styles.sectionLabel)}>Where each one stands</span>
          {played.map((s) => (
            <div
              key={s.game}
              className={clsx(styles.verdict, s.plateau.plateaued ? styles.verdictStop : styles.verdictGo)}
            >
              <Icon name={s.plateau.plateaued ? 'flag' : 'spark'} size={18} style={{ flex: '0 0 auto' }} />
              <span>
                <strong>{GAMES.find((g) => g.id === s.game)?.title}:</strong> {s.plateau.message}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.card}>
        <span className={clsx('microlabel', styles.sectionLabel)}>How to use this stage</span>
        <p className={styles.cardNote}>
          Cap it at <strong>twenty minutes a day</strong>. Play each game until it plateaus — a
          flat slope over {PLATEAU_MIN_RUNS} or more runs — and then stop and believe it. When a
          game plateaus, the dashboard stops recommending the arcade and sends you back to whichever
          elimination gate is weakest, because that is where the marks actually are.
        </p>
        {spent.length === GAMES.length ? (
          <p className={styles.cardNote}>
            <strong>All four have plateaued.</strong> You have taken everything this stage has to
            give. <Link href="/">Go back to the dashboard</Link> and spend the time on a gate.
          </p>
        ) : null}
      </div>
    </div>
  );
}
