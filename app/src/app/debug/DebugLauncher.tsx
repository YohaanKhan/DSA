'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { DebugLab, type DebugExercise } from '@/components/debug/DebugLab';
import styles from './DebugLauncher.module.css';

export interface ExerciseSummary {
  id: string;
  language: string;
  family: string;
  problem: string;
}

export function DebugLauncher({ exercises }: { exercises: ExerciseSummary[] }) {
  const [active, setActive] = useState<DebugExercise | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(id: string) {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/debug/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setActive(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  if (active) {
    return <DebugLab exercise={active} onNext={() => setActive(null)} />;
  }

  return (
    <div className={styles.list}>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {exercises.map((ex) => (
        <button
          key={ex.id}
          type="button"
          className={clsx('press', styles.row)}
          onClick={() => void open(ex.id)}
          disabled={loading !== null}
        >
          <span className={styles.rowText}>
            <span className={styles.rowMeta}>
              <Badge tone="stage">{ex.language.toUpperCase()}</Badge>
              {/* The family is NOT revealed here — naming it is the exercise. */}
              <span className={clsx('microlabel', styles.hidden)}>bug family hidden</span>
            </span>
            <span className={styles.rowProblem}>{ex.problem}</span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      ))}
    </div>
  );
}
