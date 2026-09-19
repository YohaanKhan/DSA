import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="technical" className={shell.stack}>
      <h1>Trace Lab</h1>
      <EmptyState icon="trace" title="Not built yet" meta="Phase 01">
        Pseudocode tracing with a variable-table stepper. Being told the answer teaches nothing; watching the variables change while the executed line is highlighted teaches the procedure.
      </EmptyState>
    </div>
  );
}
