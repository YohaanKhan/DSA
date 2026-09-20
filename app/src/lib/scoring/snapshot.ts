import 'server-only';

import { nanoid } from 'nanoid';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { readinessSnapshots } from '@/lib/db/schema';
import { STAGES } from '@/lib/config/stages';
import { computeReadiness } from './readiness';

/**
 * Writes one readiness snapshot per stage per day, so the dashboard sparklines
 * have real history rather than a line invented at render time.
 *
 * Idempotent within a day: re-running updates today's row rather than stacking
 * duplicates, which would make a heavy practice day look like a trend.
 */
export function snapshotReadiness(now = new Date()): number {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  let written = 0;

  for (const stage of STAGES) {
    const reading = computeReadiness(stage.id);
    if (reading.readiness === null) continue;

    const existing = db
      .select()
      .from(readinessSnapshots)
      .where(and(eq(readinessSnapshots.stage, stage.id), gte(readinessSnapshots.computedAt, startOfDay)))
      .get();

    const row = {
      stage: stage.id,
      readiness: reading.readiness,
      accuracy: reading.accuracy,
      speedFactor: reading.speedFactor,
      coverage: reading.coverage,
      consistency: reading.consistency,
      computedAt: now,
    };

    if (existing) {
      db.update(readinessSnapshots).set(row).where(eq(readinessSnapshots.id, existing.id)).run();
    } else {
      db.insert(readinessSnapshots).values({ id: nanoid(), ...row }).run();
    }
    written++;
  }

  return written;
}
