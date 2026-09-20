import { LocalRunner, detectToolchains } from './local';
import { PistonRunner } from './piston';
import type { CodeRunner, Language, RunRequest, RunResult } from './types';

export * from './types';
export { detectToolchains } from './local';

let resolved: CodeRunner | null = null;

/**
 * CODE_RUNNER=auto prefers the local toolchain and falls back to the remote one.
 * Local is faster and works offline, which matters on exam eve.
 */
export async function getRunner(): Promise<CodeRunner> {
  if (resolved) return resolved;

  const mode = (process.env.CODE_RUNNER ?? 'auto').toLowerCase();
  const local = new LocalRunner();
  const piston = new PistonRunner();

  if (mode === 'local') { resolved = local; return resolved; }
  if (mode === 'piston') { resolved = piston; return resolved; }

  resolved = (await local.available()) ? local : piston;
  return resolved;
}

export async function runCode(req: RunRequest): Promise<RunResult> {
  return (await getRunner()).run(req);
}

/** For the Settings page, so the active runner is never a mystery. */
export async function runnerStatus(): Promise<{
  mode: string;
  active: 'local' | 'piston';
  localLanguages: Language[];
}> {
  const runner = await getRunner();
  return {
    mode: process.env.CODE_RUNNER ?? 'auto',
    active: runner.name,
    localLanguages: [...(await detectToolchains())],
  };
}
