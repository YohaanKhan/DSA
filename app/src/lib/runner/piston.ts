import {
  DEFAULT_RUN_TIMEOUT_MS,
  JAVA_CLASS_NAME,
  MAX_OUTPUT_BYTES,
  type CodeRunner,
  type Language,
  type RunRequest,
  type RunResult,
} from './types';

/**
 * Remote execution against a Piston-compatible endpoint. The fallback, not the
 * default: the public instance is rate-limited, and a drill that stalls on a 429
 * is worse than one that runs locally.
 */

const LANG: Record<Language, { language: string; version: string; file: string }> = {
  c: { language: 'c', version: '10.2.0', file: 'main.c' },
  cpp: { language: 'c++', version: '10.2.0', file: 'main.cpp' },
  java: { language: 'java', version: '15.0.2', file: `${JAVA_CLASS_NAME}.java` },
};

interface PistonStage {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
}

interface PistonResponse {
  compile?: PistonStage;
  run?: PistonStage;
  message?: string;
}

const cap = (s: string) => (s.length > MAX_OUTPUT_BYTES ? s.slice(0, MAX_OUTPUT_BYTES) : s);

export class PistonRunner implements CodeRunner {
  readonly name = 'piston' as const;

  constructor(private readonly baseUrl = process.env.PISTON_BASE_URL ?? 'https://emkc.org/api/v2/piston') {}

  async available(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/runtimes`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async run(req: RunRequest): Promise<RunResult> {
    const started = Date.now();
    const spec = LANG[req.language];
    const timeout = req.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;

    const body = JSON.stringify({
      language: spec.language,
      version: spec.version,
      files: [{ name: spec.file, content: req.source }],
      stdin: req.stdin ?? '',
      run_timeout: timeout,
      compile_timeout: 10_000,
    });

    const attempt = async (): Promise<Response> =>
      fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeout + 20_000),
      });

    let response: Response;
    try {
      response = await attempt();
      if (response.status === 429) {
        // One retry with backoff, then surface it clearly rather than as a
        // generic failure the user cannot act on.
        await new Promise((r) => setTimeout(r, 2_000));
        response = await attempt();
      }
    } catch (err) {
      return this.fail(`Remote runner unreachable: ${(err as Error).message}`, started);
    }

    if (response.status === 429) {
      return this.fail('Remote runner is rate-limited. Install gcc/g++/javac and set CODE_RUNNER=local.', started);
    }
    if (!response.ok) {
      return this.fail(`Remote runner returned ${response.status}.`, started);
    }

    const data = (await response.json()) as PistonResponse;

    if (data.compile && (data.compile.code ?? 0) !== 0) {
      return {
        ok: false,
        compileError: cap(data.compile.stderr || data.compile.output || 'Compilation failed.'),
        stdout: '', stderr: cap(data.compile.stderr ?? ''), exitCode: data.compile.code ?? -1,
        timedOut: false, truncated: false, durationMs: Date.now() - started, runner: 'piston',
      };
    }

    const run = data.run ?? {};
    // Piston reports a timeout kill as a signal rather than an exit code.
    const timedOut = run.signal === 'SIGKILL' || run.signal === 'SIGTERM';

    return {
      ok: !timedOut && (run.code ?? -1) === 0,
      stdout: cap(run.stdout ?? ''),
      stderr: cap(run.stderr ?? ''),
      exitCode: run.code ?? -1,
      timedOut,
      truncated: (run.stdout ?? '').length > MAX_OUTPUT_BYTES,
      durationMs: Date.now() - started,
      runner: 'piston',
    };
  }

  private fail(message: string, started: number): RunResult {
    return {
      ok: false, compileError: message, stdout: '', stderr: message,
      exitCode: -1, timedOut: false, truncated: false,
      durationMs: Date.now() - started, runner: 'piston',
    };
  }
}
