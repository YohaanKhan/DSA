import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_COMPILE_TIMEOUT_MS,
  DEFAULT_RUN_TIMEOUT_MS,
  JAVA_CLASS_NAME,
  MAX_OUTPUT_BYTES,
  type CodeRunner,
  type Language,
  type RunRequest,
  type RunResult,
} from './types';

/**
 * Compiles and runs C, C++ and Java on this machine.
 *
 * SECURITY, stated plainly: this executes code with a timeout and an output cap,
 * and nothing else. That is acceptable for a single-user local tool where you
 * write all the code it runs. Do not expose this app to a network. For real
 * isolation set CODE_RUNNER=piston or run the app in a container.
 */

interface SpawnOutcome {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  truncated: boolean;
}

function execute(
  command: string,
  args: string[],
  opts: { cwd: string; stdin?: string; timeoutMs: number },
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      // Its own process group, so a runaway program that spawns children can be
      // killed wholesale. Killing just the child leaves orphans eating CPU for
      // the rest of the session.
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let truncated = false;
    let settled = false;

    const capture = (chunk: Buffer, which: 'out' | 'err') => {
      const target = which === 'out' ? stdout : stderr;
      if (target.length >= MAX_OUTPUT_BYTES) { truncated = true; return; }
      const text = chunk.toString('utf8');
      const room = MAX_OUTPUT_BYTES - target.length;
      const slice = text.length > room ? text.slice(0, room) : text;
      if (text.length > room) truncated = true;
      if (which === 'out') stdout += slice; else stderr += slice;
    };

    child.stdout.on('data', (c: Buffer) => capture(c, 'out'));
    child.stderr.on('data', (c: Buffer) => capture(c, 'err'));

    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL');
      } catch {
        try { child.kill('SIGKILL'); } catch { /* already gone */ }
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killGroup();
      resolve({ stdout, stderr, exitCode: -1, timedOut: true, truncated });
    }, opts.timeoutMs);

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + String(err), exitCode: -1, timedOut: false, truncated });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? -1, timedOut: false, truncated });
    });

    if (opts.stdin !== undefined) {
      child.stdin.on('error', () => { /* program exited before reading stdin */ });
      child.stdin.write(opts.stdin);
    }
    child.stdin.end();
  });
}

async function which(binary: string): Promise<boolean> {
  const result = await execute('sh', ['-c', `command -v ${binary}`], {
    cwd: tmpdir(),
    timeoutMs: 3_000,
  });
  return result.exitCode === 0;
}

const TOOLCHAIN: Record<Language, string[]> = {
  c: ['gcc'],
  cpp: ['g++'],
  java: ['javac', 'java'],
};

let cachedAvailability: Promise<Set<Language>> | null = null;

/** Probed once per process; the result is shown in Settings so a fallback is never silent. */
export function detectToolchains(): Promise<Set<Language>> {
  cachedAvailability ??= (async () => {
    const found = new Set<Language>();
    for (const [language, binaries] of Object.entries(TOOLCHAIN) as [Language, string[]][]) {
      const results = await Promise.all(binaries.map(which));
      if (results.every(Boolean)) found.add(language);
    }
    return found;
  })();
  return cachedAvailability;
}

export class LocalRunner implements CodeRunner {
  readonly name = 'local' as const;

  async available(): Promise<boolean> {
    return (await detectToolchains()).size > 0;
  }

  async supports(language: Language): Promise<boolean> {
    return (await detectToolchains()).has(language);
  }

  async run(req: RunRequest): Promise<RunResult> {
    const started = Date.now();
    const dir = await mkdtemp(join(tmpdir(), 'exceller-run-'));

    try {
      if (!(await this.supports(req.language))) {
        return {
          ok: false,
          compileError: `No local toolchain for ${req.language}. Install ${TOOLCHAIN[req.language].join(' and ')}, or set CODE_RUNNER=piston.`,
          stdout: '', stderr: '', exitCode: -1, timedOut: false, truncated: false,
          durationMs: Date.now() - started, runner: 'local',
        };
      }

      const runTimeout = req.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
      let compile: SpawnOutcome;
      let runCmd: [string, string[]];

      if (req.language === 'java') {
        await writeFile(join(dir, `${JAVA_CLASS_NAME}.java`), req.source, 'utf8');
        // javac is slow on first run, so compiling gets its own, longer budget.
        compile = await execute('javac', ['-nowarn', `${JAVA_CLASS_NAME}.java`], {
          cwd: dir, timeoutMs: DEFAULT_COMPILE_TIMEOUT_MS,
        });
        runCmd = ['java', ['-XX:+UseSerialGC', '-Xshare:auto', '-cp', '.', JAVA_CLASS_NAME]];
      } else {
        const file = req.language === 'c' ? 'main.c' : 'main.cpp';
        const compiler = req.language === 'c' ? 'gcc' : 'g++';
        const std = req.language === 'c' ? '-std=c11' : '-std=c++17';
        await writeFile(join(dir, file), req.source, 'utf8');
        compile = await execute(compiler, ['-O0', std, file, '-o', 'prog'], {
          cwd: dir, timeoutMs: DEFAULT_COMPILE_TIMEOUT_MS,
        });
        runCmd = ['./prog', []];
      }

      if (compile.exitCode !== 0 || compile.timedOut) {
        return {
          ok: false,
          compileError: compile.timedOut
            ? `Compilation timed out after ${DEFAULT_COMPILE_TIMEOUT_MS}ms.`
            : compile.stderr || compile.stdout || 'Compilation failed.',
          stdout: '', stderr: compile.stderr, exitCode: compile.exitCode,
          timedOut: compile.timedOut, truncated: compile.truncated,
          durationMs: Date.now() - started, runner: 'local',
        };
      }

      const run = await execute(runCmd[0], runCmd[1], {
        cwd: dir, stdin: req.stdin, timeoutMs: runTimeout,
      });

      return {
        ok: !run.timedOut && run.exitCode === 0,
        stdout: run.stdout,
        stderr: run.stderr,
        exitCode: run.exitCode,
        timedOut: run.timedOut,
        truncated: run.truncated,
        durationMs: Date.now() - started,
        runner: 'local',
      };
    } finally {
      // Always, even on throw — otherwise a week of drills fills the disk.
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
