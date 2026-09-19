'use client';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { MockRunner } from '@/components/mock/MockRunner';
import { MockReport, type ReportData } from '@/components/mock/MockReport';
import styles from '@/components/mock/Mock.module.css';

interface ProfileView {
  id: string; label: string; note: string; shape: string; minutes: number; stages: string[];
}

export function MockShell({ profiles }: { profiles: ProfileView[] }) {
  const router = useRouter();
  const [mockId, setMockId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [resumable, setResumable] = useState<{ mockId: string; sectionLabel: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Offer to resume a mock left open — a crash must not cost you the attempt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mock');
        const data = await res.json();
        if (!cancelled && data.resumable) setResumable(data.resumable);
      } catch { /* nothing to resume */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const start = useCallback(async (profileId: string) => {
    setBusy(profileId);
    setError(null);
    try {
      const res = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMockId(data.mockId);
      setResumable(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const finish = useCallback(async () => {
    if (!mockId) return;
    setBusy('finish');
    try {
      const res = await fetch(`/api/mock/${mockId}/finish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Addressable, so the report can be revisited later.
      router.push(`/mock/${mockId}/report`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, [mockId, router]);

  if (report) {
    return <MockReport data={report} onAgain={() => { setReport(null); setResumable(null); }} />;
  }

  if (mockId) {
    return <MockRunner mockId={mockId} onFinish={() => void finish()} />;
  }

  return (
    <div className={styles.page}>
      <h1>Full Mock</h1>

      <p className="reading">
        Every stage back to back under exam conditions. Sections run in order, each with its own
        clock, and you cannot return to one you have finished. Failing an eliminatory gate is
        shown but does not stop the mock — the data from the later stages is worth more to you
        than stopping would be.
      </p>

      {resumable ? (
        <div className={styles.verdictBanner}>
          <Icon name="timer" size={22} style={{ flex: '0 0 auto' }} />
          <div style={{ flex: 1 }}>
            <div className="microlabel">A mock is still in progress</div>
            <p className={styles.verdictBody} style={{ marginTop: 'var(--s-2)' }}>
              You were on {resumable.sectionLabel ?? 'a section'}. Section clocks run on wall time,
              so resuming does not give any of it back.
            </p>
          </div>
          <Button variant="solid" onClick={() => setMockId(resumable.mockId)}>Resume</Button>
        </div>
      ) : null}

      <div className={styles.profiles}>
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={clsx('press', styles.profile)}
            data-stage={p.stages[0]}
            onClick={() => void start(p.id)}
            disabled={busy !== null}
          >
            <span className={styles.profileText}>
              <span className="microlabel">{p.label} · {p.minutes} min</span>
              <span className={styles.profileNote}>{p.note}</span>
              <span className={styles.profileShape}>{p.shape}</span>
            </span>
            <Icon name="chevron" size={22} />
          </button>
        ))}
      </div>

      {error ? <p role="alert" className={styles.error}>{error}</p> : null}

      <p className={styles.note}>
        <Badge tone="neutral">Configurable</Badge>{' '}
        Section counts and timings vary by campus drive, so they live in{' '}
        <code>src/lib/config/exam-profiles.ts</code>. Edit that one file the moment you learn
        your own drive&apos;s pattern — nothing else hardcodes a section list.
      </p>
    </div>
  );
}
