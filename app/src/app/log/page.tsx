import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="aic" className={shell.stack}>
      <h1>Submission Log</h1>
      <EmptyState icon="log" title="Not built yet" meta="Phase 06">
        Every debugging fix and AI-assisted run with your prompts and reasoning, exportable to Markdown. The technical interview may ask you to explain code from earlier rounds.
      </EmptyState>
    </div>
  );
}
