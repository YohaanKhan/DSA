'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export function ReviewLauncher({ dueCount }: { dueCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(count: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'review', kinds: ['mcq', 'trace'], count, strategy: 'due' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      router.push(`/drill/${data.sessionId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const batch = Math.min(20, dueCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <Button variant="solid" size="lg" onClick={() => void start(batch)} loading={busy}>
          Review {batch}
        </Button>
        {dueCount > batch ? (
          <Button variant="outline" onClick={() => void start(dueCount)} disabled={busy}>
            Review all {dueCount}
          </Button>
        ) : null}
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}
