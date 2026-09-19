import { notFound } from 'next/navigation';
import { buildReport } from '@/lib/mock/report';
import shell from '@/components/shell/Shell.module.css';
import { ReportView } from './ReportView';

export const dynamic = 'force-dynamic';

/**
 * A past mock's report, addressable by URL. Worth revisiting: the three fixes
 * are what should drive the next day's study.
 */
export default async function MockReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = buildReport(id);
  if (!report) notFound();

  return (
    <div className={shell.stack}>
      <h1>Mock Report</h1>
      <ReportView data={report} />
    </div>
  );
}
