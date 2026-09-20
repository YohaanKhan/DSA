/**
 * One command between a fresh clone and a running app.
 *
 * It applies migrations, seeds the content banks, validates them, and then tells
 * you what it found — including which optional pieces are missing and exactly
 * what each one costs you. A setup script that succeeds silently while three
 * features are quietly degraded is worse than no setup script.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bold = (s) => `\u001b[1m${s}\u001b[0m`;
const dim = (s) => `\u001b[2m${s}\u001b[0m`;
const green = (s) => `\u001b[32m${s}\u001b[0m`;
const yellow = (s) => `\u001b[33m${s}\u001b[0m`;
const red = (s) => `\u001b[31m${s}\u001b[0m`;

function step(label, fn) {
  process.stdout.write(`${dim('·')} ${label}… `);
  try {
    const out = fn();
    process.stdout.write(`${green('done')}\n`);
    return out;
  } catch (err) {
    process.stdout.write(`${red('failed')}\n`);
    throw err;
  }
}

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const have = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;

// --- Node version ---------------------------------------------------------
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(red(`Node ${process.versions.node} is too old. Next 16 needs 20.9 or newer.`));
  process.exit(1);
}

console.log(`\n${bold('Exceller Trainer — setup')}\n`);

// --- Environment file -----------------------------------------------------
const envLocal = join(root, '.env.local');
if (!existsSync(envLocal) && existsSync(join(root, '.env.example'))) {
  step('Creating .env.local from .env.example', () => copyFileSync(join(root, '.env.example'), envLocal));
} else {
  console.log(`${dim('·')} .env.local already exists ${dim('(left alone)')}`);
}

// --- Database and content -------------------------------------------------
step('Applying database migrations', () => run('npx', ['tsx', 'src/lib/db/migrate.ts']));
const seedOut = step('Seeding content', () => run('npx', ['tsx', 'src/lib/db/seed.ts']));
const validateOut = step('Validating content', () => run('npx', ['tsx', 'scripts/validate-content.ts']));

console.log('');
for (const line of [...seedOut.split('\n'), ...validateOut.split('\n')]) {
  if (line.trim() && !line.startsWith('>')) console.log(`  ${line}`);
}

// --- Optional pieces, and what each one costs -----------------------------
console.log(`\n${bold('Optional pieces')}\n`);

const compilers = [
  ['gcc', 'C debugging exercises'],
  ['g++', 'C++ debugging exercises'],
  ['javac', 'Java debugging exercises'],
];
const missing = compilers.filter(([cmd]) => !have(cmd));
for (const [cmd, what] of compilers) {
  console.log(have(cmd)
    ? `  ${green('✓')} ${cmd.padEnd(6)} ${dim(what)}`
    : `  ${yellow('!')} ${cmd.padEnd(6)} ${dim(`${what} will run remotely via Piston instead`)}`);
}
if (missing.length === compilers.length) {
  console.log(`    ${dim('No local toolchain at all — set CODE_RUNNER=piston in .env.local, or install build-essential and a JDK.')}`);
}

console.log(process.env.ANTHROPIC_API_KEY
  ? `  ${green('✓')} ANTHROPIC_API_KEY ${dim('— essay grammar band, rewrites, live AI assistant, content generation')}`
  : `  ${yellow('!')} ANTHROPIC_API_KEY ${dim('not set — everything still runs. You lose: the essay grammar band and')}\n` +
    `    ${dim('sentence rewrites, the live coding assistant (a scripted flawed reply stands in),')}\n` +
    `    ${dim('and content generation. All scoring falls back to deterministic rubrics.')}`);

console.log(`  ${dim('Speaking needs Chrome or Edge for the Web Speech API. Other browsers still')}`);
console.log(`  ${dim('record and measure pauses, but not pace, filler rate or point coverage.')}`);

console.log(`\n${bold('Ready.')} Start it with:\n\n    ${bold('npm run dev')}      ${dim('then open http://localhost:3000')}\n`);
