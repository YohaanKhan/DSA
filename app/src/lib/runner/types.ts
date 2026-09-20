export type Language = 'c' | 'cpp' | 'java';

export interface RunRequest {
  language: Language;
  source: string;
  stdin?: string;
  /** Wall-clock limit for the compiled program. */
  timeoutMs?: number;
}

export interface RunResult {
  ok: boolean;
  compileError?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  /** True when output hit the cap and was cut short. */
  truncated: boolean;
  durationMs: number;
  runner: 'local' | 'piston';
}

export interface CodeRunner {
  readonly name: 'local' | 'piston';
  available(): Promise<boolean>;
  run(req: RunRequest): Promise<RunResult>;
}

/** Java's public class must match the file name, so every exercise uses Main. */
export const JAVA_CLASS_NAME = 'Main';

export const DEFAULT_RUN_TIMEOUT_MS = 5_000;
export const DEFAULT_COMPILE_TIMEOUT_MS = 10_000;
/** An infinite printf would otherwise buffer gigabytes into the Node process. */
export const MAX_OUTPUT_BYTES = 64 * 1024;
