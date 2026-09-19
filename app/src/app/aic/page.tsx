import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="aic" className={shell.stack}>
      <h1>AI-Assisted Coding</h1>
      <EmptyState icon="aic" title="Not built yet" meta="Phase 03">
        The five-step Frame, Plan, Prompt, Review, Refine simulator. This stage decides your package tier and almost nobody else will have practised it.
      </EmptyState>
    </div>
  );
}
