import Link from 'next/link';
import { clsx } from 'clsx';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StageCard } from '@/components/dashboard/StageCard';
import { STAGES, stageHref, type Stage } from '@/lib/config/stages';
import { computeReadiness, type StageReadiness } from '@/lib/scoring/readiness';
import { allGameStats, cognitiveIsSpent } from '@/lib/games/stats';
import { PLATEAU_STAGE_WEIGHT } from '@/lib/scoring/games';
import { db } from '@/lib/db/client';
import { reviewCards, sessions } from '@/lib/db/schema';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

/**
 * Journey J1: "I have 45 minutes, what should I do?"
 * The recommendation must be actionable in ONE click, or you will open the fun
 * module instead. At most two recommendations — a list of nine gets ignored.
 */
function recommend(readings: StageReadiness[], weightOf: (stage: Stage) => number) {
  const scored = readings.map((r) => ({
    reading: r,
    stage: STAGES.find((s) => s.id === r.stage)!,
  }));

  return scored
    .sort((a, b) => {
      const aUntested = a.reading.readiness === null;
      const bUntested = b.reading.readiness === null;
      // Untested always outranks tested: an unmeasured gate is the biggest unknown.
      if (aUntested !== bUntested) return aUntested ? -1 : 1;
      // Among untested, the stage that can most easily end your process comes first.
      if (aUntested && bUntested) return weightOf(b.stage) - weightOf(a.stage);
      // Among tested, lowest readiness relative to how much the exam cares.
      return a.reading.readiness! / weightOf(a.stage) - b.reading.readiness! / weightOf(b.stage);
    })
    .slice(0, 2);
}

export default function Dashboard() {
  const readings = STAGES.map((s) => computeReadiness(s.id));

  // A plateaued arcade stops earning its place in the recommendation. This is
  // the point of plateau detection: the fun module is the one you will keep
  // opening, so something has to actively stop sending you there.
  const gameStats = allGameStats();
  const arcadeSpent = cognitiveIsSpent(gameStats);
  const weightOf = (stage: Stage) =>
    stage.id === 'cognitive' && arcadeSpent ? PLATEAU_STAGE_WEIGHT : stage.weight;

  const top = recommend(readings, weightOf);
  const tested = readings.filter((r) => r.readiness !== null);
  const totalAttempts = readings.reduce((sum, r) => sum + r.attempts, 0);
  const allUntested = tested.length === 0;

  const mocksCompleted = db
    .select({ n: sql<number>`count(*)` })
    .from(sessions)
    .where(and(eq(sessions.mode, 'mock'), isNotNull(sessions.finishedAt)))
    .get()?.n ?? 0;

  const dueNow = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewCards)
    .where(lte(reviewCards.dueAt, new Date()))
    .get()?.n ?? 0;

  const leadStage = top[0]?.stage;
  const leadUntested = top[0]?.reading.readiness === null;

  return (
    <div className={styles.page}>
      <section className={styles.today}>
        <div className={styles.todayHead}>
          <h1>Today</h1>
          <Badge tone="neutral" icon="mock">
            {tested.length} / {STAGES.length} stages tested
          </Badge>
        </div>

        <p className={styles.lede}>
          {allUntested
            ? 'Nothing measured yet. Every stage is untested, so the fastest way to a useful plan is one short drill in the stage most likely to end your process.'
            : leadUntested
              ? `${leadStage?.label} is still untested, which makes it your biggest unknown. One timed set turns a guess into a number.`
              : `${leadStage?.label} is your weakest ${leadStage?.eliminatory ? 'gate' : 'stage'}. Work there first — ${leadStage?.eliminatory ? 'a gate you fail cannot be rescued by a strong score anywhere else' : 'and it is the one that sets your package tier'}.`}
        </p>

        <div className={styles.recos}>
          {top.map(({ reading, stage }) => (
            <Link key={stage.id} href={stageHref(stage)} className={clsx('press', styles.reco)} data-stage={stage.id}>
              <span className={styles.recoText}>
                <span className="microlabel">{stage.label}</span>
                <span className={styles.recoWhy}>
                  {reading.readiness === null
                    ? `Untested — ${reading.attempts} attempt${reading.attempts === 1 ? '' : 's'} so far. Sit one timed set to get a baseline.`
                    : `Readiness ${Math.round(reading.readiness)}. ${stage.eliminatory ? 'Elimination gate.' : 'Decides your package tier.'}`}
                </span>
              </span>
              <Icon name="chevron" size={20} />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.today}>
        <span className={clsx('microlabel', styles.sectionLabel)}>Readiness by stage</span>
        <div className={styles.grid}>
          {readings.map((r) => {
            const stage = STAGES.find((s) => s.id === r.stage)!;
            return (
              <StageCard
                key={stage.id}
                stage={stage}
                readiness={r.readiness}
                history={r.history}
                note={stage.id === 'cognitive' && arcadeSpent ? 'Plateaued — stop grinding' : undefined}
              />
            );
          })}
        </div>
      </section>

      <section className={styles.today}>
        <span className={clsx('microlabel', styles.sectionLabel)}>Progress</span>
        <div className={styles.statRow}>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{totalAttempts}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Questions attempted</span>
          </span>
          <Link href="/mock" className={styles.stat} style={{ textDecoration: 'none' }}>
            <span className={clsx('tabular', styles.statValue)}>{mocksCompleted}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Mocks completed</span>
          </Link>
          <Link href="/review" className={styles.stat} style={{ textDecoration: 'none' }}>
            <span className={clsx('tabular', styles.statValue)}>{dueNow}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Due for review</span>
          </Link>
        </div>
        <p className={styles.note}>
          A stage shows <strong>Untested</strong> rather than zero until it has at least ten
          attempts. An untested stage is not a failing stage, and showing it as zero would make
          this dashboard lie to you.
        </p>
      </section>
    </div>
  );
}
