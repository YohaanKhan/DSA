import { PROFILES } from '@/lib/config/exam-profiles';
import shell from '@/components/shell/Shell.module.css';
import { MockShell } from './MockShell';

export const dynamic = 'force-dynamic';

export default function MockPage() {
  return (
    <div className={shell.stack}>
      <MockShell
        profiles={PROFILES.map((p) => ({
          id: p.id,
          label: p.label,
          note: p.note,
          shape: p.sections.map((s) => `${s.label} ${s.minutes}m`).join(' · '),
          minutes: p.sections.reduce((sum, s) => sum + s.minutes, 0),
          stages: [...new Set(p.sections.map((s) => s.stage))],
        }))}
      />
    </div>
  );
}
