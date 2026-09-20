'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

/** Downloads the log as Markdown — the file to skim before the interview. */
export function ExportButton() {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch('/api/log/export');
      const text = await res.text();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `exceller-log-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" icon="log" onClick={() => void download()} loading={busy}>
      Export Markdown
    </Button>
  );
}
