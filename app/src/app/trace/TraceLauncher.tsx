'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function TraceLauncher({ max }: { max: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(strategy: 'weakest' | 'unseen' | 'random', count: number, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'trace', kinds: ['trace'], count, strategy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      router.push(`/drill/${data.sessionId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const ten = Math.min(10, max);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        <Button variant="solid" size="lg" onClick={() => void start('weakest', ten, 'go')} loading={busy === 'go'} disabled={busy !== null}>
          Trace {ten} items
        </Button>
        <Button variant="outline" onClick={() => void start('unseen', ten, 'unseen')} loading={busy === 'unseen'} disabled={busy !== null}>
          Only unseen
        </Button>
        <Button variant="ghost" onClick={() => void start('random', ten, 'random')} loading={busy === 'random'} disabled={busy !== null}>
          Random
        </Button>
      </div>
      {error ? <p role="alert" style={{ color: 'var(--bad)', fontSize: 'var(--t-sm)' }}>{error}</p> : null}
    </div>
  );
}
