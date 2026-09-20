'use client';

import { useRouter } from 'next/navigation';
import { MockReport, type ReportData } from '@/components/mock/MockReport';

export function ReportView({ data }: { data: ReportData }) {
  const router = useRouter();
  return <MockReport data={data} onAgain={() => router.push('/mock')} />;
}
