import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="ai-literacy" className={shell.stack}>
      <h1>Review Queue</h1>
      <EmptyState icon="review" title="Not built yet" meta="Phase 06">
        Spaced repetition across every module, interleaved rather than blocked, with intervals capped at three days so nothing learned on day one goes stale before the exam.
      </EmptyState>
    </div>
  );
}
