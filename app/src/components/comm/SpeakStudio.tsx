'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useExamTimer } from '@/lib/hooks/useExamTimer';
import { useIsHydrated } from '@/lib/hooks/useClientState';
import {
  mediaRecordingSupported, speechRecognitionSupported, useSpeechCapture,
  type CaptureSegment,
} from '@/lib/hooks/useSpeechCapture';
import { LONG_PAUSE_MS, fillerSpans, type SpeechMetrics } from '@/lib/scoring/speech';
import styles from './Comm.module.css';

export interface SpeakItem {
  id: string;
  prompt: string;
  thinkSeconds: number;
  speakSeconds: number;
  expectedPoints: string[];
  difficulty: string;
}

type Phase = 'brief' | 'think' | 'speaking' | 'review';

export function SpeakStudio({ item }: { item: SpeakItem }) {
  const hydrated = useIsHydrated();
  const [phase, setPhase] = useState<Phase>('brief');
  const [metrics, setMetrics] = useState<SpeechMetrics | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const capture = useSpeechCapture();

  const finish = useCallback(async (segments: CaptureSegment[], usedMs: number, transcriptAvailable: boolean) => {
    setBusy(true);
    setSaveError(null);
    setPhase('review');
    try {
      const res = await fetch('/api/comm/speak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          segments,
          usedSeconds: usedMs / 1000,
          transcriptAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setMetrics(data.metrics as SpeechMetrics);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [item.id]);

  const stopSpeaking = useCallback(() => {
    // stop() returns the final values synchronously; reading capture.usedMs here
    // would read the state from before this tick, which is always zero.
    const final = capture.stop();
    void finish(final.segments, final.usedMs, final.transcriptAvailable);
  }, [capture, finish]);

  if (phase === 'brief') {
    return (
      <Brief
        item={item}
        hydrated={hydrated}
        onStart={() => setPhase('think')}
      />
    );
  }

  if (phase === 'think') {
    return (
      <ThinkPhase
        item={item}
        onSpeak={() => { void capture.start(); setPhase('speaking'); }}
      />
    );
  }

  if (phase === 'speaking') {
    return (
      <SpeakingPhase
        item={item}
        capture={capture}
        onStop={stopSpeaking}
      />
    );
  }

  return (
    <Review
      item={item}
      metrics={metrics}
      segments={capture.segments}
      audioUrl={capture.audioUrl}
      transcriptAvailable={capture.transcriptAvailable}
      captureError={capture.error}
      saveError={saveError}
      busy={busy}
    />
  );
}

function Brief({ item, hydrated, onStart }: { item: SpeakItem; hydrated: boolean; onStart: () => void }) {
  const canRecord = hydrated && mediaRecordingSupported();
  const canTranscribe = hydrated && speechRecognitionSupported();

  return (
    <div className={styles.brief} data-stage="english">
      <Link href="/comm" className="microlabel" style={{ color: 'var(--ink-faint)' }}>← Communication</Link>
      <h1>Speaking</h1>
      <div className={styles.promptBox}>{item.prompt}</div>

      <div className={styles.facts}>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>{item.thinkSeconds}s</span>
          <span className={clsx('microlabel', styles.factLabel)}>to think</span>
        </span>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>{item.speakSeconds}s</span>
          <span className={clsx('microlabel', styles.factLabel)}>to speak</span>
        </span>
        <span className={styles.fact}>
          <span className={clsx('tabular', styles.factValue)}>{item.expectedPoints.length}</span>
          <span className={clsx('microlabel', styles.factLabel)}>points to cover</span>
        </span>
      </div>

      <p className={styles.note}>
        The think timer is the point. Planning two or three points before you open your mouth is
        what separates a fluent answer from a filled silence, and forty-five seconds is what the
        reported format gives you.
      </p>

      {!hydrated ? null : !canRecord ? (
        <div className={styles.warnBox}>
          <Icon name="cross" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            This browser cannot record audio, so the studio cannot measure anything. Use Chrome or
            Edge on a machine with a microphone.
          </span>
        </div>
      ) : !canTranscribe ? (
        <div className={styles.warnBox}>
          <Icon name="flag" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            <strong>No speech recognition in this browser.</strong> The recording and the pause
            analysis will still work, but pace, filler rate, point coverage and sentence completion
            all need a transcript. Chrome or Edge gives you the full set.
          </span>
        </div>
      ) : (
        <div className={styles.infoBox}>
          <Icon name="check" size={18} style={{ flex: '0 0 auto' }} />
          <span>
            Speech recognition is available in this browser, and both the audio and the transcript
            are analysed on this machine — nothing is uploaded. Some Chromium builds expose the API
            without a speech service behind it; if no transcript comes back you will still get the
            pause and timing analysis, and the studio will say so.
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="solid" size="lg" icon="timer" disabled={hydrated && !canRecord} onClick={onStart}>
          Start the {item.thinkSeconds}-second think timer
        </Button>
      </div>
    </div>
  );
}

function ThinkPhase({ item, onSpeak }: { item: SpeakItem; onSpeak: () => void }) {
  const timer = useExamTimer({ totalMs: item.thinkSeconds * 1000, autoStart: true, onExpire: onSpeak });
  const low = timer.remainingMs <= 10_000;

  return (
    <div className={styles.stage} data-stage="english">
      <span className={clsx('microlabel', styles.phaseName)}>Think — do not speak yet</span>
      <span className={clsx('tabular', styles.bigClock, low && styles.bigClockLow)}>
        {Math.ceil(timer.remainingMs / 1000)}
      </span>
      <p className={styles.thinkPrompt}>{item.prompt}</p>
      <p className={styles.note}>
        Decide your three points and your first sentence. Do not write a script — you will read it,
        and read speech is obvious.
      </p>
      <Button variant="outline" onClick={onSpeak}>Start speaking now</Button>
    </div>
  );
}

function SpeakingPhase({
  item, capture, onStop,
}: {
  item: SpeakItem;
  capture: ReturnType<typeof useSpeechCapture>;
  onStop: () => void;
}) {
  const timer = useExamTimer({ totalMs: item.speakSeconds * 1000, autoStart: true, onExpire: onStop });
  const low = timer.remainingMs <= 15_000;

  return (
    <div className={styles.stage} data-stage="english">
      <span className={clsx('microlabel', styles.phaseName)}>
        <span className={styles.recDot} /> Recording
      </span>
      <span className={clsx('tabular', styles.bigClock, low && styles.bigClockLow)}>
        {Math.ceil(timer.remainingMs / 1000)}
      </span>
      <p className={styles.thinkPrompt}>{item.prompt}</p>

      {capture.error ? <p role="alert" className={styles.error}>{capture.error}</p> : null}

      <div className={styles.transcript} aria-live="polite">
        {capture.segments.filter((s) => s.text).map((s, i) => <span key={i}>{s.text} </span>)}
        {capture.interim ? <span className={styles.interim}>{capture.interim}</span> : null}
        {capture.segments.every((s) => !s.text) && !capture.interim ? (
          <span className={styles.interim}>
            {capture.status === 'recording'
              ? 'Listening. No live transcript in this browser — the recording is still being measured.'
              : 'Starting the microphone…'}
          </span>
        ) : null}
      </div>

      <Button variant="solid" size="lg" icon="check" onClick={onStop}>
        Stop and analyse
      </Button>
    </div>
  );
}

function Review({
  item, metrics, segments, audioUrl, transcriptAvailable, captureError, saveError, busy,
}: {
  item: SpeakItem;
  metrics: SpeechMetrics | null;
  segments: CaptureSegment[];
  audioUrl: string | null;
  transcriptAvailable: boolean;
  captureError: string | null;
  saveError: string | null;
  busy: boolean;
}) {
  // Without a transcript only the timing metrics carry meaning. Showing a zero
  // for pace or filler rate would be a measurement the app never took.
  const TIMING_ONLY = new Set(['pauses', 'time']);
  const verdicts = metrics
    ? metrics.verdicts.filter((v) => transcriptAvailable || TIMING_ONLY.has(v.id))
    : [];

  return (
    <div className={styles.page} data-stage="english">
      <div className={styles.card}>
        <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Speaking — analysed locally</span>
        <span className={styles.cardTitle}>
          {busy ? 'Measuring…' : metrics
            ? `${verdicts.filter((v) => v.ok).length} of ${verdicts.length} in band`
            : 'Nothing measured'}
        </span>
        {saveError ? <p role="alert" className={styles.error}>{saveError}</p> : null}
        {captureError ? <p className={styles.cardNote}>{captureError}</p> : null}

        {!transcriptAvailable ? (
          <div className={styles.warnBox}>
            <Icon name="flag" size={18} style={{ flex: '0 0 auto' }} />
            <span>
              <strong>No transcript was produced</strong>, so pace, filler rate, point coverage and
              sentence completion could not be measured. Pauses and time used come from the audio
              itself and are shown below. Chrome or Edge gives the full set.
            </span>
          </div>
        ) : null}

        {audioUrl ? (
          <audio className={styles.player} controls src={audioUrl}>
            Your browser cannot play the recording back.
          </audio>
        ) : null}
      </div>

      {metrics && verdicts.length > 0 ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Metrics</span>
          <div className={styles.bands}>
            {verdicts.map((v) => (
              <div key={v.id} className={styles.band}>
                <span className={styles.bandName}>{v.label}</span>
                <span className={clsx(styles.bandScore, v.ok ? styles.bandPass : styles.bandFail)}>{v.value}</span>
                <span className={styles.bandWhy}>
                  <strong>{v.ok ? 'In band' : `Target ${v.target}`}.</strong> {v.note}
                </span>
              </div>
            ))}
          </div>
          <p className={styles.cardNote}>
            Accent is not measured, here or in the reported rubric. Fluency and clarity are, and
            both are above.
          </p>
        </div>
      ) : null}

      {transcriptAvailable && metrics ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>
            What you said — fillers highlighted, long pauses marked
          </span>
          <div className={styles.transcript}>
            <AnnotatedTranscript segments={segments} />
          </div>
        </div>
      ) : null}

      {metrics ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Points the prompt wanted</span>
          <ul className={styles.points}>
            {metrics.coverage.map((c) => (
              <li key={c.point} className={clsx(styles.point, c.hit ? styles.pointHit : styles.pointMiss)}>
                <Icon name={c.hit ? 'check' : 'cross'} size={16} />
                <span>{c.point}</span>
              </li>
            ))}
          </ul>
          {!transcriptAvailable ? (
            <p className={styles.cardNote}>
              Coverage could not be checked without a transcript — the list is here so you can mark
              yourself honestly against it.
            </p>
          ) : null}
        </div>
      ) : null}

      {metrics && metrics.fixes.length > 0 && transcriptAvailable ? (
        <div className={styles.card}>
          <span className="microlabel" style={{ color: 'var(--ink-faint)' }}>Fix these first</span>
          <ol className={styles.fixes}>
            {metrics.fixes.map((fix, i) => (
              <li key={fix} className={styles.fix}>
                <span className={styles.fixNum}>{i + 1}</span>
                <span>{fix}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link href="/comm/speak" className="press">
          <Badge tone="stage" filled icon="comm">Another prompt</Badge>
        </Link>
        <Link href={`/comm/speak?item=${item.id}`} className="microlabel">Retry this one</Link>
        <Link href="/comm" className="microlabel">Back to Communication</Link>
      </div>
    </div>
  );
}

/** Fillers in amber, gaps over the threshold marked with their length. */
function AnnotatedTranscript({ segments }: { segments: CaptureSegment[] }) {
  const spoken = segments.filter((s) => s.text);
  return (
    <>
      {spoken.map((segment, i) => {
        const gap = i > 0 ? segment.startMs - spoken[i - 1].endMs : 0;
        return (
          <span key={i}>
            {gap >= LONG_PAUSE_MS ? (
              <span className={styles.pauseMark}>{(gap / 1000).toFixed(1)}s</span>
            ) : null}
            <Highlighted text={segment.text} />{' '}
          </span>
        );
      })}
    </>
  );
}

function Highlighted({ text }: { text: string }) {
  const spans = fillerSpans(text);
  if (spans.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start < cursor) return;
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    parts.push(<mark key={i} className={styles.filler}>{text.slice(span.start, span.end)}</mark>);
    cursor = span.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
