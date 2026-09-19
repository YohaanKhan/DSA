'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DrillRunner, type RunnerItem } from '@/components/drill/DrillRunner';

export function RunnerShell({ sessionId, items }: { sessionId: string; items: RunnerItem[] }) {
  const router = useRouter();

  const finish = useCallback(async () => {
    // Fire and forget would risk navigating before the summary is written.
    try {
      await fetch(`/api/sessions/${sessionId}/finish`, { method: 'POST' });
    } catch {
      /* the review page recomputes from attempts, so this is not fatal */
    }
    router.push(`/drill/${sessionId}/review`);
  }, [sessionId, router]);

  return <DrillRunner sessionId={sessionId} items={items} onFinish={() => void finish()} />;
}
