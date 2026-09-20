'use client';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import type { StageId } from '@/lib/config/stages';
import styles from './Builder.module.css';

export interface TopicOption {
  stage: StageId;
  topic: string;
  priority: 'P0' | 'P1' | 'P2';
  count: number;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export function DrillBuilder({
  topics,
  initialStage,
}: {
  topics: TopicOption[];
  initialStage?: StageId;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<StageId | 'all'>(initialStage ?? 'all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stages = Array.from(new Set(topics.map((t) => t.stage)));
  const visibleTopics = topics.filter((t) => stage === 'all' || t.stage === stage);
  const available = visibleTopics
    .filter((t) => selectedTopics.length === 0 || selectedTopics.includes(t.topic))
    .reduce((sum, t) => sum + t.count, 0);

  async function start(strategy: 'weakest' | 'random' | 'unseen' | 'due', label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'drill',
          kinds: ['mcq', 'trace'],
          stage: stage === 'all' ? undefined : stage,
          topics: selectedTopics.length ? selectedTopics : undefined,
          difficulty: difficulty.length ? difficulty : undefined,
          count,
          strategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      router.push(`/drill/${data.sessionId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className={styles.page} data-stage={stage === 'all' ? undefined : stage}>
      <div className={styles.hero}>
        <h1>Drill</h1>
        <p className={styles.lede}>
          Timed questions with instant explanations. Every answer you mark as a guess comes back
          in the review queue, even when it was right.
        </p>
      </div>

      <button
        type="button"
        className={clsx('press', styles.surprise)}
        onClick={() => void start('weakest', 'weakest')}
        disabled={busy !== null}
      >
        <span className={styles.surpriseText}>
          <span className={styles.surpriseTitle}>Surprise me</span>
          <span className={styles.surpriseWhy}>
            {count} questions from your weakest topics, weighted by how much the exam cares.
            Skips anything you answered confidently and correctly in the last two days.
          </span>
        </span>
        <Icon name="chevron" size={24} />
      </button>

      <Panel title="Or choose exactly what you want" headerTone="plain">
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={clsx('microlabel', styles.label)}>Stage</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={clsx('microlabel', styles.chip, stage === 'all' && styles.chipOn)}
                onClick={() => { setStage('all'); setSelectedTopics([]); }}
              >
                All
              </button>
              {stages.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-stage={s}
                  className={clsx('microlabel', styles.chip, stage === s && styles.chipOn)}
                  onClick={() => { setStage(s); setSelectedTopics([]); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={clsx('microlabel', styles.label)}>Difficulty</span>
            <div className={styles.chips}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={clsx('microlabel', styles.chip, difficulty.includes(d) && styles.chipOn)}
                  onClick={() => toggle(difficulty, d, setDifficulty)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={clsx('microlabel', styles.label)}>Questions</span>
            <div className={styles.count}>
              <input
                className={styles.numberInput}
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                aria-label="Number of questions"
              />
              <span className={clsx('microlabel', styles.label)}>{available} available</span>
            </div>
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: 'var(--s-5)' }}>
          <span className={clsx('microlabel', styles.label)}>
            Topics {selectedTopics.length > 0 ? `(${selectedTopics.length} selected)` : '(all)'}
          </span>
          <div className={styles.chips}>
            {visibleTopics.map((t) => (
              <button
                key={`${t.stage}/${t.topic}`}
                type="button"
                data-stage={t.stage}
                className={clsx('microlabel', styles.chip, selectedTopics.includes(t.topic) && styles.chipOn)}
                onClick={() => toggle(selectedTopics, t.topic, setSelectedTopics)}
                title={`${t.count} items`}
              >
                {t.topic} · {t.count}
              </button>
            ))}
            {visibleTopics.length === 0 ? (
              <span className={styles.bankNote}>
                No items seeded for this stage yet. Run <code>npm run db:seed</code> after adding banks.
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.footer} style={{ marginTop: 'var(--s-5)' }}>
          <Button variant="solid" size="lg" onClick={() => void start('weakest', 'go')} loading={busy === 'go'} disabled={busy !== null}>
            Start drill
          </Button>
          <Button variant="outline" onClick={() => void start('unseen', 'unseen')} loading={busy === 'unseen'} disabled={busy !== null}>
            Only unseen
          </Button>
          <Button variant="outline" onClick={() => void start('due', 'due')} loading={busy === 'due'} disabled={busy !== null}>
            Due for review
          </Button>
          <Button variant="ghost" onClick={() => void start('random', 'random')} loading={busy === 'random'} disabled={busy !== null}>
            Random
          </Button>
        </div>

        {error ? (
          <p className={styles.error} role="alert" style={{ marginTop: 'var(--s-4)' }}>
            {error}
          </p>
        ) : null}
      </Panel>

      <p className={styles.bankNote}>
        <Badge tone="neutral">{topics.reduce((s, t) => s + t.count, 0)} items in the bank</Badge>{' '}
        Generate more with <code>npm run content:generate</code>, then <code>npm run db:seed</code>.
      </p>
    </div>
  );
}
