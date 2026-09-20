'use client';

import { clsx } from 'clsx';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { AicWizard, type AicProblem } from '@/components/aic/AicWizard';
import styles from '@/app/debug/DebugLauncher.module.css';

export function AicLauncher({ problems }: { problems: { id: string; title: string; language: string }[] }) {
  const [active, setActive] = useState<AicProblem | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open(id: string) {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/aic/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setActive(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  if (active) return <AicWizard problem={active} onExit={() => setActive(null)} />;

  return (
    <div className={styles.list}>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {problems.map((p) => (
        <button
          key={p.id}
          type="button"
          className={clsx('press', styles.row)}
          onClick={() => void open(p.id)}
          disabled={loading !== null}
        >
          <span className={styles.rowText}>
            <span className={styles.rowMeta}>
              <Badge tone="stage">{p.language.toUpperCase()}</Badge>
            </span>
            <span className={styles.rowProblem}>{p.title}</span>
          </span>
          <Icon name="chevron" size={20} />
        </button>
      ))}
    </div>
  );
}
