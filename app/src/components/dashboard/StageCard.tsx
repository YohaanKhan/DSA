import Link from 'next/link';
import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { StatusGlyph, bandFor, BAND_LABEL } from '@/components/ui/StatusGlyph';
import { stageHref, type Stage } from '@/lib/config/stages';
import { ReadinessSparkline } from './ReadinessSparkline';
import styles from './StageCard.module.css';

export function StageCard({
  stage,
  readiness,
  history = [],
}: {
  stage: Stage;
  readiness: number | null;
  history?: (number | null)[];
}) {
  const band = bandFor(readiness);

  return (
    <Link href={stageHref(stage)} className={clsx('press', styles.card)} data-stage={stage.id}>
      <div className={styles.head}>
        <span className={clsx('microlabel', styles.title)}>
          <Icon name={stage.icon} size={18} />
          {stage.label}
        </span>
        <span className={clsx('microlabel', styles.status)}>
          <StatusGlyph band={band} />
          {BAND_LABEL[band]}
        </span>
      </div>

      <div className={styles.readout}>
        {readiness === null ? (
          <span className={clsx('microlabel', styles.untested)}>No data yet</span>
        ) : (
          <span className={clsx('tabular', styles.score)}>{Math.round(readiness)}</span>
        )}
        <ReadinessSparkline points={history} />
      </div>

      <p className={styles.blurb}>{stage.blurb}</p>
      <span className={clsx('microlabel', styles.gate)}>
        {stage.eliminatory ? 'Elimination gate' : 'Tier-deciding'}
      </span>
    </Link>
  );
}
