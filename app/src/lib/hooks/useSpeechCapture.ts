'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Microphone capture for the speaking studio.
 *
 * Two paths, and the UI is told which one it got:
 *
 *  1. Web Speech recognition (Chrome and Edge) gives a live transcript with
 *     per-result timings, which is what every fluency metric is built on.
 *  2. Everywhere else, the recorder still runs and an AnalyserNode watches the
 *     signal level, so pauses and speaking time are still measured from the
 *     audio itself. Pace, filler and coverage are simply unavailable, and the
 *     studio says so rather than showing a zero.
 *
 * Nothing leaves the browser in either path. The audio is held as a blob URL
 * for playback and is never uploaded.
 */

export interface CaptureSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export type CaptureStatus = 'idle' | 'starting' | 'recording' | 'stopped' | 'error';

export interface SpeechCapture {
  status: CaptureStatus;
  segments: CaptureSegment[];
  /** The phrase currently being recognised, before it is finalised. */
  interim: string;
  audioUrl: string | null;
  usedMs: number;
  error: string | null;
  /** True only when a real transcript was produced. */
  transcriptAvailable: boolean;
  start: () => Promise<void>;
  /**
   * Returns the final values synchronously. React state from the same tick is
   * not readable yet, so a caller that submitted `capture.usedMs` right after
   * calling stop would post the value from before the recording — which is
   * zero, or worse, the previous take's.
   */
  stop: () => { usedMs: number; segments: CaptureSegment[]; transcriptAvailable: boolean };
  reset: () => void;
}

// --- Minimal typings. The Web Speech API is not in lib.dom under a stable name.
interface RecognitionAlternative { transcript: string }
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechRecognitionSupported = (): boolean => recognitionCtor() !== null;

export const mediaRecordingSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof MediaRecorder !== 'undefined';

/** Above this root-mean-square level the microphone is hearing speech, not room noise. */
const VOICE_FLOOR = 0.015;
const SAMPLE_MS = 50;
/** Two consecutive samples before switching state, so a consonant gap is not a pause. */
const DEBOUNCE_SAMPLES = 2;

export function useSpeechCapture(): SpeechCapture {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [segments, setSegments] = useState<CaptureSegment[]>([]);
  const [interim, setInterim] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [usedMs, setUsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptAvailable, setTranscriptAvailable] = useState(false);

  // Refs hold the browser objects. They are only ever touched from event
  // handlers and callbacks, never read during render.
  const recognition = useRef<RecognitionLike | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const lastFinalEnd = useRef(0);
  const voicedFrom = useRef<number | null>(null);
  const run = useRef(0);
  // Mirrors of the two pieces of state `stop()` has to report immediately.
  // Written beside every setState below, never read during render.
  const segmentsRef = useRef<CaptureSegment[]>([]);
  const transcriptRef = useRef(false);

  const pushSegment = useCallback((segment: CaptureSegment) => {
    segmentsRef.current = [...segmentsRef.current, segment];
    setSegments(segmentsRef.current);
  }, []);

  const teardown = useCallback(() => {
    if (levelTimer.current) { clearInterval(levelTimer.current); levelTimer.current = null; }
    try { recognition.current?.stop(); } catch { /* already stopped */ }
    recognition.current = null;
    try { if (recorder.current?.state === 'recording') recorder.current.stop(); } catch { /* ignore */ }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
  }, []);

  const reset = useCallback(() => {
    teardown();
    setStatus('idle');
    segmentsRef.current = [];
    transcriptRef.current = false;
    setSegments([]);
    setInterim('');
    setAudioUrl((url) => { if (url) URL.revokeObjectURL(url); return null; });
    setUsedMs(0);
    setError(null);
    setTranscriptAvailable(false);
  }, [teardown]);

  const start = useCallback(async () => {
    setStatus('starting');
    setError(null);
    segmentsRef.current = [];
    transcriptRef.current = false;
    setSegments([]);
    setInterim('');
    setTranscriptAvailable(false);
    chunks.current = [];
    lastFinalEnd.current = 0;
    voicedFrom.current = null;
    const thisRun = ++run.current;

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (thisRun !== run.current) { media.getTracks().forEach((t) => t.stop()); return; }
      stream.current = media;
      startedAt.current = performance.now();

      const rec = new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      rec.onstop = () => {
        if (chunks.current.length === 0) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      };
      rec.start();

      const Ctor = recognitionCtor();
      if (Ctor) {
        const speech = new Ctor();
        speech.continuous = true;
        speech.interimResults = true;
        speech.lang = 'en-IN';
        speech.onresult = (event) => {
          const now = performance.now() - startedAt.current;
          let pending = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript.trim();
            if (!text) continue;
            if (result.isFinal) {
              // The API gives no timings, so a phrase is taken to span from the
              // end of the previous one to now. That is exactly what a pause is:
              // the gap between finishing one phrase and finishing the next.
              const spokenMs = Math.max(400, text.split(/\s+/).length * 380);
              const startMs = Math.max(lastFinalEnd.current, now - spokenMs);
              pushSegment({ text, startMs, endMs: now });
              lastFinalEnd.current = now;
              transcriptRef.current = true;
              setTranscriptAvailable(true);
            } else {
              pending += `${text} `;
            }
          }
          setInterim(pending.trim());
        };
        speech.onerror = (event) => {
          // 'no-speech' and 'aborted' are normal ends, not failures.
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          setError(`Speech recognition stopped: ${event.error}. The recording and its timing metrics are unaffected.`);
        };
        speech.onend = () => {
          // Chrome ends the session on long silences; restart while still recording.
          if (thisRun === run.current && recorder.current?.state === 'recording') {
            try { speech.start(); } catch { /* already restarting */ }
          }
        };
        recognition.current = speech;
        speech.start();
      } else {
        // No transcript: measure voiced spans straight off the signal instead.
        const context = new AudioContext();
        audioContext.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaStreamSource(media).connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        let above = 0;
        let below = 0;

        levelTimer.current = setInterval(() => {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (const sample of buffer) sum += sample * sample;
          const rms = Math.sqrt(sum / buffer.length);
          const at = performance.now() - startedAt.current;

          if (rms >= VOICE_FLOOR) {
            above++; below = 0;
            if (above >= DEBOUNCE_SAMPLES && voicedFrom.current === null) {
              voicedFrom.current = at - DEBOUNCE_SAMPLES * SAMPLE_MS;
            }
          } else {
            below++; above = 0;
            if (below >= DEBOUNCE_SAMPLES && voicedFrom.current !== null) {
              const from = voicedFrom.current;
              voicedFrom.current = null;
              pushSegment({ text: '', startMs: from, endMs: at });
            }
          }
        }, SAMPLE_MS);
      }

      setStatus('recording');
    } catch (err) {
      teardown();
      setStatus('error');
      setError(
        (err as Error).name === 'NotAllowedError'
          ? 'Microphone access was refused. Allow it in the address bar and try again — the audio never leaves this machine.'
          : `Could not start the microphone: ${(err as Error).message}`,
      );
    }
  }, [teardown, pushSegment]);

  const stop = useCallback(() => {
    const at = performance.now() - startedAt.current;
    // Close an open voiced span so the last thing you said is not discarded.
    if (voicedFrom.current !== null) {
      const from = voicedFrom.current;
      voicedFrom.current = null;
      pushSegment({ text: '', startMs: from, endMs: at });
    }
    run.current++;
    teardown();
    setUsedMs(at);
    setInterim('');
    setStatus('stopped');
    return { usedMs: at, segments: segmentsRef.current, transcriptAvailable: transcriptRef.current };
  }, [teardown, pushSegment]);

  return {
    status, segments, interim, audioUrl, usedMs, error, transcriptAvailable,
    start, stop, reset,
  };
}
