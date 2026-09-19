'use client';

import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { formatClock } from '@/lib/format';
import styles from './Mock.module.css';
import report from './Report.module.css';

export interface ReportData {
  verdict: { wouldProgress: boolean; failedLabel: string | null; failedScore: number | null; passMark: number | null };
  overall: number;
  sections: {
    id: string; label: string; stage: string; kind: string;
    eliminatory: boolean; passMark: number; score: number | null;
    skipped: boolean; skipReason?: string; passed: boolean | null;
    elapsedMs: number | null; budgetMs: number;
  }[];
  timing: { rushed: number; dwelt: number; dweltAndWrong: number; total: number };
  heatmap: { stage: string; topic: string; attempts: number; accuracy: number; priority: string }[];
  fixes: { stage: string; topic: string; accuracy: number; attempts: number; priority: string }[];
  wrong: { itemId: string; stage: string; topic: string; stem: string; explanation: string; timeMs: number; targetMs: number }[];
}

export function MockReport({ data, onAgain }: { data: ReportData; onAgain: () => void }) {
  const ran = data.sections.filter((s) => !s.skipped && s.score !== null);

  return (
    <div className={styles.page}>
      {/* 1. Verdict ------------------------------------------------------- */}
      <div className={clsx(report.verdict, data.verdict.wouldProgress ? report.verdictPass : report.verdictFail)}>
        <Icon name={data.verdict.wouldProgress ? 'check' : 'cross'} size={28} style={{ flex: '0 0 auto' }} />
        <div>
          <div className={report.verdictTitle}>
            {data.verdict.wouldProgress
              ? 'You would have progressed'
              : `Your process would have ended at ${data.verdict.failedLabel}`}
          </div>
          <p className={report.verdictBody}>
            {data.verdict.wouldProgress
              ? 'Every eliminatory section cleared its mark. Adequate everywhere beats brilliant somewhere — that is exactly what a gated exam rewards.'
              : `${Math.round((data.verdict.failedScore ?? 0) * 100)}% against a ${Math.round((data.verdict.passMark ?? 0) * 100)}% bar. A strong score in another stage cannot rescue a failed gate.`}
          </p>
        </div>
      </div>

      {/* 2. Per-section --------------------------------------------------- */}
      <Panel title="By section" headerTone="plain">
        <div className={report.bars}>
          {data.sections.map((s) => (
            <div key={s.id} className={report.barRow} data-stage={s.stage}>
              <span className={clsx('microlabel', report.barLabel)}>{s.label}</span>
              {s.skipped ? (
                <span className={clsx('microlabel', report.skipped)}>Skipped — {s.skipReason}</span>
              ) : (
                <>
                  <span className={report.barTrack}>
                    <span
                      className={clsx(report.barFill, s.passed === false && report.barFail)}
                      style={{ width: `${Math.round((s.score ?? 0) * 100)}%` }}
                    />
                    {s.eliminatory ? (
                      <span className={report.passLine} style={{ left: `${Math.round(s.passMark * 100)}%` }} />
                    ) : null}
                  </span>
                  <span className={clsx('tabular', report.barValue)}>{Math.round((s.score ?? 0) * 100)}%</span>
                  <span className={clsx('microlabel', report.barMeta)}>
                    {s.elapsedMs !== null ? `${formatClock(s.elapsedMs)} / ${formatClock(s.budgetMs)}` : '—'}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
        {ran.length > 0 ? (
          <p className={styles.note} style={{ marginTop: 'var(--s-4)' }}>
            The line on each eliminatory bar is its pass mark.
          </p>
        ) : null}
      </Panel>

      {/* 3. Time ---------------------------------------------------------- */}
      <Panel title="Time" headerTone="plain">
        <div className={report.stats}>
          <Stat value={data.timing.rushed} label="Rushed" note="Answered in under 40% of the budget — you skimmed these." />
          <Stat value={data.timing.dwelt} label="Over-dwelt" note="Over 200% of the budget. This kills more candidates than not knowing does." />
          <Stat value={data.timing.dweltAndWrong} label="Dwelt AND wrong" note="Pure waste: the minutes bought you nothing. Flag and move on next time." tone={data.timing.dweltAndWrong > 0 ? 'bad' : undefined} />
        </div>
      </Panel>

      {/* 4. The three fixes ----------------------------------------------- */}
      {data.fixes.length > 0 ? (
        <Panel title="The three things to fix before your next mock" headerTone="stage">
          <div className={report.fixes}>
            {data.fixes.map((f, i) => (
              <div key={`${f.stage}/${f.topic}`} className={report.fix} data-stage={f.stage}>
                <span className={clsx('tabular', report.fixRank)}>{i + 1}</span>
                <span className={report.fixText}>
                  <span className="microlabel">{f.topic.replace(/-/g, ' ')}</span>
                  <span className={report.fixWhy}>
                    {Math.round(f.accuracy * 100)}% over {f.attempts} question{f.attempts === 1 ? '' : 's'}
                    {f.priority === 'P0' ? ' · P0, so this one matters most' : ` · ${f.priority}`}
                  </span>
                </span>
                <Badge tone="stage">{f.stage}</Badge>
              </div>
            ))}
          </div>
          <p className={styles.note} style={{ marginTop: 'var(--s-4)' }}>
            Ranked by how wrong you were, weighted by how much the exam cares and how often it
            came up. Drill exactly these before sitting another mock.
          </p>
        </Panel>
      ) : null}

      {/* 5. Heatmap -------------------------------------------------------- */}
      {data.heatmap.length > 0 ? (
        <Panel title="Every topic, worst first" headerTone="plain">
          <div className={report.heat}>
            {data.heatmap.map((h) => (
              <div key={`${h.stage}/${h.topic}`} className={report.heatCell} title={`${h.attempts} attempts`}>
                <span
                  className={report.heatSwatch}
                  style={{ background: `color-mix(in oklab, var(--ok) ${Math.round(h.accuracy * 100)}%, var(--bad))` }}
                />
                <span className={clsx('microlabel', report.heatName)}>{h.topic.replace(/-/g, ' ')}</span>
                <span className={clsx('tabular', report.heatValue)}>{Math.round(h.accuracy * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* 6. Every wrong answer -------------------------------------------- */}
      {data.wrong.length > 0 ? (
        <Panel title={`Got wrong (${data.wrong.length})`} headerTone="plain">
          <div className={report.wrongList}>
            {data.wrong.map((w) => (
              <div key={w.itemId} className={report.wrongRow} data-stage={w.stage}>
                <div className={report.wrongHead}>
                  <Badge tone="stage">{w.topic.replace(/-/g, ' ')}</Badge>
                  <span className={clsx('tabular', 'microlabel', report.barMeta)}>
                    {formatClock(w.timeMs)} / {formatClock(w.targetMs)}
                  </span>
                </div>
                <p className={report.wrongStem}>{w.stem}</p>
                {w.explanation ? <p className={report.wrongWhy}>{w.explanation}</p> : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className={styles.actions}>
        <Button variant="solid" size="lg" onClick={onAgain}>Another mock</Button>
      </div>
    </div>
  );
}

function Stat({ value, label, note, tone }: { value: number; label: string; note: string; tone?: 'bad' }) {
  return (
    <div className={report.stat}>
      <span className={clsx('tabular', report.statValue, tone === 'bad' && report.statBad)}>{value}</span>
      <span className={clsx('microlabel', report.statLabel)}>{label}</span>
      <span className={report.statNote}>{note}</span>
    </div>
  );
}
