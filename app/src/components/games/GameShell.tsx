'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { randomSeed } from '@/lib/games/rng';
import { gameScore, levelReward } from '@/lib/scoring/games';
import type { CheckResult, GameMeta, GameStats } from '@/lib/games/types';
import { formatClock } from '@/lib/format';
import styles from './Games.module.css';

/** What a level component is handed, and the one callback it owes back. */
export interface LevelProps {
  level: number;
  seed: number;
  onResult: (result: CheckResult) => void;
}

interface RunTiming {
  level: number;
  seconds: number;
  credit: number;
  cleared: boolean;
}

type Phase = 'rules' | 'playing' | 'between' | 'over';

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * Everything the four games share: the rules screen, level progression, the
 * scoreboard, persistence and the post-run verdict.
 *
 * The one rule this component exists to enforce is that a run NEVER starts by
 * itself. Reading the rules on the clock is the most-cited avoidable loss in
 * this stage of the assessment, so the rules screen precedes every single run,
 * even your fortieth, and nothing moves until you press Start.
 */
export function GameShell({
  meta, initialStats, renderLevel, startSeed,
}: {
  meta: GameMeta;
  initialStats: GameStats;
  renderLevel: (props: LevelProps) => ReactNode;
  /** Replays an exact run. Every level is a pure function of (seed, level). */
  startSeed?: number;
}) {
  const [phase, setPhase] = useState<Phase>('rules');
  const [stats, setStats] = useState(initialStats);
  const [seed, setSeed] = useState(0);
  const [level, setLevel] = useState(1);
  const [timings, setTimings] = useState<RunTiming[]>([]);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [levelStartedAt, setLevelStartedAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const cleared = timings.filter((t) => t.cleared);
  const score = gameScore(cleared);

  const startRun = useCallback(() => {
    setSeed(startSeed ?? randomSeed());
    setLevel(1);
    setTimings([]);
    setLastResult(null);
    setSaveError(null);
    const t = now();
    setRunStartedAt(t);
    setLevelStartedAt(t);
    setPhase('playing');
  }, [startSeed]);

  /** Persistence happens here, in a handler — never in an effect. */
  const finishRun = useCallback(async (finalTimings: RunTiming[], startedAt: number) => {
    setSaving(true);
    setPhase('over');
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          game: meta.id,
          seed,
          durationMs: now() - startedAt,
          timings: finalTimings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save the run');
      setStats(data.stats as GameStats);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [meta.id, seed]);

  const handleResult = useCallback((result: CheckResult) => {
    const seconds = (now() - levelStartedAt) / 1000;
    const timing: RunTiming = { level, seconds, credit: result.credit, cleared: result.correct };
    const next = [...timings, timing];
    setTimings(next);
    setLastResult(result);
    if (result.correct) {
      setPhase('between');
    } else {
      void finishRun(next, runStartedAt);
    }
  }, [level, levelStartedAt, timings, runStartedAt, finishRun]);

  const nextLevel = useCallback(() => {
    setLevel((l) => l + 1);
    setLevelStartedAt(now());
    setPhase('playing');
  }, []);

  const retire = useCallback(() => {
    void finishRun(timings, runStartedAt);
  }, [timings, runStartedAt, finishRun]);

  // ---- Rules -------------------------------------------------------------
  if (phase === 'rules') {
    return (
      <div className={styles.page} data-stage="cognitive">
        <RulesScreen meta={meta} stats={stats} startSeed={startSeed} onStart={startRun} />
      </div>
    );
  }

  // ---- Report ------------------------------------------------------------
  if (phase === 'over') {
    return (
      <div className={styles.page} data-stage="cognitive">
        <RunReport
          meta={meta}
          seed={seed}
          timings={timings}
          score={score}
          durationMs={Math.max(0, now() - runStartedAt) || 0}
          failNote={lastResult && !lastResult.correct ? lastResult.note : null}
          stats={stats}
          saving={saving}
          saveError={saveError}
          onAgain={startRun}
        />
      </div>
    );
  }

  // ---- Playing / between --------------------------------------------------
  return (
    <div className={styles.page} data-stage="cognitive">
      <div className={styles.hud}>
        <span className={clsx('tabular', styles.hudLevel)}>{level}</span>
        <span className={styles.hudCell}>
          <span className={clsx('microlabel', styles.hudLabel)}>Level</span>
          <span className={clsx('microlabel', styles.hudLabel)}>{meta.title}</span>
        </span>
        <span className={styles.hudSpacer} />
        <span className={styles.hudCell}>
          <span className={clsx('tabular', styles.hudValue)}>{score.toFixed(1)}</span>
          <span className={clsx('microlabel', styles.hudLabel)}>Score</span>
        </span>
        <span className={styles.hudCell}>
          <span className={clsx('tabular', styles.hudValue)}>{cleared.length}</span>
          <span className={clsx('microlabel', styles.hudLabel)}>Cleared</span>
        </span>
        <Button variant="ghost" size="sm" onClick={retire}>End run</Button>
      </div>

      {phase === 'playing' ? (
        // Remounting on level change is deliberate: each level is a fresh
        // puzzle with its own clock, and carrying any state across would be a bug.
        <div key={`${seed}-${level}`}>{renderLevel({ level, seed, onResult: handleResult })}</div>
      ) : (
        <BetweenLevels
          level={level}
          result={lastResult}
          timing={timings[timings.length - 1]}
          scoreSoFar={score}
          onContinue={nextLevel}
          onStop={retire}
        />
      )}
    </div>
  );
}

// ---- Rules ---------------------------------------------------------------

function RulesScreen({
  meta, stats, startSeed, onStart,
}: {
  meta: GameMeta; stats: GameStats; startSeed?: number; onStart: () => void;
}) {
  return (
    <div className={styles.rules}>
      <Link href="/games" className="microlabel" style={{ color: 'var(--ink-faint)' }}>
        ← Arcade
      </Link>
      <h1 className={styles.gameTitle}>{meta.title}</h1>
      <p className={styles.measures}>{meta.measures}</p>

      {stats.runs > 0 ? (
        <div className={styles.statRow}>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{stats.best.toFixed(1)}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Best score</span>
          </span>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{stats.bestLevel}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Deepest level</span>
          </span>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{stats.runs}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Runs</span>
          </span>
        </div>
      ) : null}

      {stats.plateau.plateaued ? <PlateauBanner message={stats.plateau.message} /> : null}

      <div>
        <span className={clsx('microlabel', styles.sectionLabel)}>The rules</span>
        <ol className={styles.ruleList} style={{ marginTop: 'var(--s-3)' }}>
          {meta.rules.map((rule) => <li key={rule} className={styles.rule}><span>{rule}</span></li>)}
        </ol>
      </div>

      <div>
        <span className={clsx('microlabel', styles.sectionLabel)}>How to play it well</span>
        <ul className={styles.strategyList} style={{ marginTop: 'var(--s-3)' }}>
          {meta.strategy.map((tip) => <li key={tip} className={styles.strategy}><span>{tip}</span></li>)}
        </ul>
      </div>

      <p className={styles.note}>
        Read all of that now, every time. In the real assessment the clock starts with the
        instructions on screen, and the single most expensive mistake candidates report is
        working out the rules while being timed.
      </p>

      <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
        <Button variant="solid" size="lg" icon="games" onClick={onStart}>
          {startSeed === undefined ? 'Start run' : `Replay seed ${startSeed}`}
        </Button>
        {startSeed === undefined ? null : (
          <Link href={`/games/${meta.id}`} className="microlabel" style={{ alignSelf: 'center' }}>
            Fresh run instead
          </Link>
        )}
      </div>
    </div>
  );
}

function PlateauBanner({ message }: { message: string }) {
  return (
    <div className={clsx(styles.verdict, styles.verdictStop)}>
      <Icon name="flag" size={20} style={{ flex: '0 0 auto' }} />
      <span>
        <strong>Plateaued — stop grinding.</strong> {message}{' '}
        <Link href="/">Take the dashboard&rsquo;s recommendation instead.</Link>
      </span>
    </div>
  );
}

// ---- Between levels ------------------------------------------------------

function BetweenLevels({
  level, result, timing, scoreSoFar, onContinue, onStop,
}: {
  level: number;
  result: CheckResult | null;
  timing: RunTiming | undefined;
  scoreSoFar: number;
  onContinue: () => void;
  onStop: () => void;
}) {
  const gained = timing ? levelReward(timing.level, timing.seconds, timing.credit) : 0;
  // What the next level pays at the same pace. The squared numerator means it is
  // always more, which is exactly the intuition this screen is here to build.
  const nextAtSamePace = timing ? levelReward(level + 1, timing.seconds) : 0;

  return (
    <div className={clsx(styles.card, styles.cardPass)}>
      <span className={clsx('microlabel')} style={{ color: 'var(--ok)' }}>Level {level} cleared</span>
      <span className={styles.cardTitle}>{result?.note}</span>

      <div className={styles.rewardRow}>
        <span className={styles.reward}>
          <span className={clsx('tabular', styles.rewardValue)}>+{gained.toFixed(2)}</span>
          <span className={clsx('microlabel', styles.rewardLabel)}>
            earned ({timing?.seconds.toFixed(1)}s)
          </span>
        </span>
        <span className={styles.reward}>
          <span className={clsx('tabular', styles.rewardValue)}>{scoreSoFar.toFixed(2)}</span>
          <span className={clsx('microlabel', styles.rewardLabel)}>run total</span>
        </span>
        <span className={styles.reward}>
          <span className={clsx('tabular', styles.rewardValue)}>+{nextAtSamePace.toFixed(2)}</span>
          <span className={clsx('microlabel', styles.rewardLabel)}>level {level + 1} at this pace</span>
        </span>
      </div>

      <p className={styles.cardNote}>
        Depth beats speed here: the reward is level squared over seconds, so one level deeper is
        worth more than the same level answered twice as fast. Push.
      </p>

      <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
        <Button variant="solid" size="lg" iconAfter="chevron" onClick={onContinue}>
          Level {level + 1}
        </Button>
        <Button variant="ghost" onClick={onStop}>End here</Button>
      </div>
    </div>
  );
}

// ---- Report --------------------------------------------------------------

function RunReport({
  meta, seed, timings, score, durationMs, failNote, stats, saving, saveError, onAgain,
}: {
  meta: GameMeta;
  seed: number;
  timings: RunTiming[];
  score: number;
  durationMs: number;
  failNote: string | null;
  stats: GameStats;
  saving: boolean;
  saveError: string | null;
  onAgain: () => void;
}) {
  const cleared = timings.filter((t) => t.cleared);
  const maxLevel = cleared.length > 0 ? Math.max(...cleared.map((t) => t.level)) : 0;
  const failed = timings.find((t) => !t.cleared);
  const isBest = stats.runs > 0 && score >= stats.best - 1e-9;
  const peak = Math.max(...stats.recent, score, 1);

  return (
    <>
      <div className={clsx(styles.card, failed ? styles.cardFail : styles.cardPass)}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>{meta.title} — run over</span>
        <span className={styles.cardTitle}>
          {maxLevel === 0 ? 'No levels cleared' : `Reached level ${maxLevel}`}
        </span>

        <div className={styles.statRow}>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{score.toFixed(1)}</span>
            <span className={clsx('microlabel', styles.statLabel)}>
              Score{isBest && stats.runs > 1 ? ' — personal best' : ''}
            </span>
          </span>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{maxLevel}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Max level</span>
          </span>
          <span className={styles.stat}>
            <span className={clsx('tabular', styles.statValue)}>{formatClock(durationMs)}</span>
            <span className={clsx('microlabel', styles.statLabel)}>Run time</span>
          </span>
        </div>

        {failed && failNote ? <p className={styles.cardNote}>Level {failed.level}: {failNote}</p> : null}
        <span className={styles.seed}>
          seed {seed} —{' '}
          <Link href={`/games/${meta.id}?seed=${seed}`}>replay these exact levels</Link>
        </span>
      </div>

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Level by level</span>
        <table className={styles.timings}>
          <thead>
            <tr>
              <th>Level</th><th>Time</th><th>Credit</th><th>Earned</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            {timings.map((t) => (
              <tr key={t.level} className={t.cleared ? undefined : styles.rowFailed}>
                <td>{t.level}</td>
                <td>{t.seconds.toFixed(1)}s</td>
                <td>{Math.round(t.credit * 100)}%</td>
                <td>{t.cleared ? `+${levelReward(t.level, t.seconds, t.credit).toFixed(2)}` : '—'}</td>
                <td>{t.cleared ? 'cleared' : 'failed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>
          Trend — last {stats.recent.length} run{stats.recent.length === 1 ? '' : 's'}
        </span>
        {saving ? <p className={styles.cardNote}>Saving the run…</p> : null}
        {saveError ? <p className={styles.cardNote} role="alert" style={{ color: 'var(--bad)' }}>{saveError}</p> : null}

        {stats.recent.length > 0 ? (
          <div className={styles.spark} aria-hidden="true">
            {stats.recent.map((s, i) => (
              <span
                key={i}
                className={clsx(styles.sparkBar, i === stats.recent.length - 1 && styles.sparkBarLast)}
                style={{ height: `${Math.max(4, (s / peak) * 100)}%` }}
              />
            ))}
          </div>
        ) : null}

        <div className={clsx(styles.verdict, stats.plateau.plateaued ? styles.verdictStop : styles.verdictGo)}>
          <Icon name={stats.plateau.plateaued ? 'flag' : 'spark'} size={20} style={{ flex: '0 0 auto' }} />
          <span>
            {stats.plateau.plateaued ? <strong>Plateaued — stop grinding. </strong> : null}
            {stats.plateau.message}
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Before your next run</span>
        <ul className={styles.strategyList}>
          {meta.strategy.map((tip) => <li key={tip} className={styles.strategy}><span>{tip}</span></li>)}
        </ul>
      </div>

      <div className={styles.actions} style={{ justifyContent: 'flex-start' }}>
        <Button variant="solid" size="lg" icon="games" onClick={onAgain}>Play again</Button>
        <Link href="/games" className="microlabel" style={{ alignSelf: 'center' }}>Back to the arcade</Link>
        <Link href="/" className="microlabel" style={{ alignSelf: 'center' }}>Dashboard</Link>
      </div>
    </>
  );
}
