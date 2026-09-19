import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="ai-literacy" className={shell.stack}>
      <h1>Drill</h1>
      <EmptyState icon="drill" title="Not built yet" meta="Phase 01">
        The MCQ engine, weakest-topic selection and confidence capture land here. It is the highest-value phase in the plan: it covers AI Literacy and the technical module, the two eliminatory stages with the largest surface area.
      </EmptyState>
    </div>
  );
}
