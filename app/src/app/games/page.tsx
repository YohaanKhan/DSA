import { EmptyState } from '@/components/ui/EmptyState';
import shell from '@/components/shell/Shell.module.css';

export default function Page() {
  return (
    <div data-stage="cognitive" className={shell.stack}>
      <h1>Cognitive Arcade</h1>
      <EmptyState icon="games" title="Not built yet" meta="Phase 04">
        Grid, Switch, Digit and Motion challenges with level curves and plateau detection, so the app tells you when further practice here has stopped paying.
      </EmptyState>
    </div>
  );
}
