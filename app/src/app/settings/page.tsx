import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.key}>
        <span className="microlabel">{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
      <span className={clsx('tabular', styles.val)}>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  // The key's PRESENCE is shown, never the key itself.
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const runner = process.env.CODE_RUNNER ?? 'auto';
  const cap = process.env.LLM_DAILY_CAP_USD ?? '2';
  const examDate = process.env.NEXT_PUBLIC_EXAM_DATE ?? '2026-09-26';
  const profile = process.env.NEXT_PUBLIC_EXAM_PROFILE ?? 'reported-2026-default';

  return (
    <div className={styles.page}>
      <h1>Settings</h1>

      <Panel title="Exam" headerTone="plain">
        <div className={styles.rows}>
          <Row label="Exam date" hint="Drives the countdown and the review scheduler's three-day interval cap.">
            {examDate}
          </Row>
          <Row
            label="Drive profile"
            hint="Section counts and timings vary by campus drive. Edit src/lib/config/exam-profiles.ts the moment you learn your actual pattern — it is one file, by design."
          >
            {profile}
          </Row>
        </div>
      </Panel>

      <Panel title="Assistance" headerTone="plain">
        <div className={styles.rows}>
          <Row
            label="Anthropic API key"
            hint="Optional. Enables AI-assisted coding scoring, essay grading and content generation. Without it those fall back to deterministic rubric scoring — the app works fully offline."
          >
            {hasKey ? <Badge tone="ok" icon="check">Configured</Badge> : <Badge tone="neutral">Not set</Badge>}
          </Row>
          <Row label="Daily spend cap" hint="When exceeded, assisted features degrade to rubric-only rather than billing you.">
            ${cap}
          </Row>
          <Row label="LLM spend today" hint="Metered per call from the llm_calls table.">
            $0.00
          </Row>
        </div>
      </Panel>

      <Panel title="Code runner" headerTone="plain">
        <div className={styles.rows}>
          <Row
            label="Mode"
            hint="auto prefers a local gcc/g++/javac toolchain and falls back to a remote Piston instance when one is not installed."
          >
            {runner}
          </Row>
        </div>
        <p className={styles.note}>
          The local runner compiles and executes code on this machine with a timeout and an output
          cap, and nothing else. That is fine for a single-user local tool where you write all the
          code. Do not expose this app to a network. If you want isolation, set{' '}
          <code>CODE_RUNNER=piston</code> or run the app in a container.
        </p>
      </Panel>
    </div>
  );
}
