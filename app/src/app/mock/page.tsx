import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="technical" className={shell.stack}>
      <h1>Full Mock</h1>
      <EmptyState icon="mock" title="Not built yet" meta="Phase 06">
        All stages back to back under exam conditions, with gate enforcement, crash-safe resume, and a report that names the three things to fix next.
      </EmptyState>
    </div>
  );
}
