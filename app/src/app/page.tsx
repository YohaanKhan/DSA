import Link from 'next/link';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StageCard } from '@/components/dashboard/StageCard';
import { STAGES, stageHref } from '@/lib/config/stages';
import { computeReadiness, type StageReadiness } from '@/lib/scoring/readiness';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

/**
 * Journey J1: "I have 45 minutes, what should I do?"
 * The recommendation must be actionable in ONE click, or you will open the fun
 * module instead. At most two recommendations — a list of nine gets ignored.
 */
function recommend(readings: StageReadiness[]) {
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
      if (aUntested && bUntested) return b.stage.weight - a.stage.weight;
      // Among tested, lowest readiness relative to how much the exam cares.
      return a.reading.readiness! / a.stage.weight - b.reading.readiness! / b.stage.weight;
    })
    .slice(0, 2);
}

export default function Dashboard() {
  const readings = STAGES.map((s) => computeReadiness(s.id));
  const top = recommend(readings);
  const tested = readings.filter((r) => r.readiness !== null);
  const totalAttempts = readings.reduce((sum, r) => sum + r.attempts, 0);
  const allUntested = tested.length === 0;

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
            : `Your weakest gate is ${top[0].stage.label}. Work there first — a gate you fail cannot be rescued by a strong score anywhere else.`}
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
            return <StageCard key={stage.id} stage={stage} readiness={r.readiness} history={r.history} />;
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
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>0</span>
            <span className={clsx('microlabel', styles.statLabel)}>Mocks completed</span>
          </span>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>0</span>
            <span className={clsx('microlabel', styles.statLabel)}>Due for review</span>
          </span>
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
