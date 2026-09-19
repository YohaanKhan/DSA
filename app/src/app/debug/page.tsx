import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="debugging" className={shell.stack}>
      <h1>Debugging Lab</h1>
      <EmptyState icon="debug" title="Not built yet" meta="Phase 02">
        A pluggable code runner for C, C++ and Java, plus a bug-injection engine that turns any correct solution into unlimited exercises that are provably broken and provably fixable.
      </EmptyState>
    </div>
  );
}
