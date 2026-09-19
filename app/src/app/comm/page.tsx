import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="english" className={shell.stack}>
      <h1>Communication</h1>
      <EmptyState icon="comm" title="Not built yet" meta="Phase 05">
        Timed essay composition with rubric grading, and speaking practice that measures words per minute, filler rate and pause profile locally from the transcript.
      </EmptyState>
    </div>
  );
}
