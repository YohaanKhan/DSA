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

interface PaperStatus {
  paper: number;
  state: 'done' | 'in-progress' | 'fresh';
  recycled: boolean;
  score: number | null;
  mockId: string | null;
}

interface PaperInfo {
  statuses: PaperStatus[];
  clean: number;
  limiting: { label: string; papers: number } | null;
}

export function MockShell({ profiles }: { profiles: ProfileView[] }) {
  const router = useRouter();
  const [mockId, setMockId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [resumable, setResumable] = useState<{ mockId: string; sectionLabel: string | null; paper: number } | null>(null);
  const [papers, setPapers] = useState<Record<string, PaperInfo>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Offer to resume a mock left open — a crash must not cost you the attempt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mock');
        const data = await res.json();
        if (cancelled) return;
        if (data.papers) setPapers(data.papers as Record<string, PaperInfo>);
        if (data.resumable) setResumable(data.resumable);
      } catch { /* nothing to resume */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const start = useCallback(async (profileId: string, paper?: number) => {
    setBusy(profileId);
    setError(null);
    try {
      const res = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId, paper }),
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
              You were on {resumable.sectionLabel ?? 'a section'} of paper {resumable.paper}. Section
              clocks run on wall time, so resuming does not give any of it back.
            </p>
          </div>
          <Button variant="solid" onClick={() => setMockId(resumable.mockId)}>Resume</Button>
        </div>
      ) : null}

      <div className={styles.profiles}>
        {profiles.map((p) => {
          const info = papers[p.id];
          const next = info?.statuses.find((s) => s.state === 'fresh');
          return (
            <div key={p.id} className={styles.profileGroup} data-stage={p.stages[0]}>
              <button
                type="button"
                className={clsx('press', styles.profile)}
                onClick={() => void start(p.id)}
                disabled={busy !== null}
              >
                <span className={styles.profileText}>
                  <span className="microlabel">{p.label} · {p.minutes} min</span>
                  <span className={styles.profileNote}>{p.note}</span>
                  <span className={styles.profileShape}>{p.shape}</span>
                </span>
                <span className={styles.profileCta}>
                  <span className="microlabel">{next ? `Start paper ${next.paper}` : 'Start'}</span>
                  <Icon name="chevron" size={22} />
                </span>
              </button>

              {info ? (
                <div className={styles.papers}>
                  <span className={clsx('microlabel', styles.papersLabel)}>
                    Papers — {info.clean} with no repeated question
                  </span>
                  <div className={styles.paperRow}>
                    {info.statuses.map((s) => (
                      <button
                        key={s.paper}
                        type="button"
                        className={clsx('press', styles.paper,
                          s.state === 'done' && styles.paperDone,
                          s.state === 'in-progress' && styles.paperOpen,
                          s.recycled && styles.paperRecycled)}
                        disabled={busy !== null}
                        title={s.recycled
                          ? `Paper ${s.paper} reuses questions from earlier papers`
                          : `Paper ${s.paper}`}
                        onClick={() => void start(p.id, s.paper)}
                      >
                        <span className="tabular">{s.paper}</span>
                        {s.state === 'done' ? <Icon name="check" size={11} /> : null}
                        {s.score !== null ? (
                          <span className={clsx('tabular', styles.paperScore)}>
                            {Math.round(s.score * 100)}%
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <p className={styles.papersNote}>
                    Papers never share a question, so sitting them in order means every mock is
                    entirely new.{' '}
                    {info.limiting
                      ? `${info.limiting.label} is the smallest bank at ${info.limiting.papers} paper${info.limiting.papers === 1 ? '' : 's'}, so that is the limit.`
                      : null}{' '}
                    Papers past {info.clean} are struck through: they reshuffle questions you have
                    already seen, which is still useful for timing but no longer a fresh measurement.
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
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
