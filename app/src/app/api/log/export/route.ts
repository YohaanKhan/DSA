import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { submissions } from '@/lib/db/schema';

/** The whole log as Markdown, for skimming before the technical interview. */
export async function GET() {
  const rows = db.select().from(submissions).orderBy(desc(submissions.createdAt)).all();

  const lines: string[] = [
    '# Exceller Trainer — submission log',
    '',
    `Exported ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. ${rows.length} entries.`,
    '',
    '> The technical interview may ask you to explain code you wrote in an earlier round.',
    '> This is that record.',
    '',
  ];

  for (const row of rows) {
    const a = row.artifacts as Record<string, unknown>;
    const when = row.createdAt.toISOString().slice(0, 16).replace('T', ' ');
    lines.push(`## ${row.kind === 'debug' ? 'Debugging' : 'AI-assisted coding'} — ${row.itemId}`);
    lines.push('');
    lines.push(`*${when} · ${Math.round((row.score ?? 0) * 100)}% · ${String(a.language ?? '').toUpperCase()}*`);
    lines.push('');

    if (row.kind === 'debug') {
      lines.push(`**Hypothesis:** ${String(a.hypothesis ?? 'none')} · **Actual:** ${String(a.actualFamily ?? '')}`);
      lines.push(`**Lines changed:** ${String(a.changedLines ?? '')}`);
      const edges = a.edgeCasesChecked as string[] | undefined;
      if (edges?.length) lines.push(`**Edge cases checked:** ${edges.join(', ')}`);
      lines.push('');
      lines.push('```' + String(a.language ?? ''));
      lines.push(String(a.submitted ?? ''));
      lines.push('```');
    } else {
      for (const step of (a.steps as { step: string; outOfFive: number; text: string }[] | undefined) ?? []) {
        lines.push(`### ${step.step} — ${step.outOfFive}/5`);
        lines.push('');
        lines.push(step.text.split('\n').map((l) => `> ${l}`).join('\n'));
        lines.push('');
      }
      lines.push(`**Final code ${a.codePasses ? 'passes' : 'fails'} the tests:**`);
      lines.push('');
      lines.push('```' + String(a.language ?? ''));
      lines.push(String(a.finalCode ?? ''));
      lines.push('```');
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="exceller-log.md"',
    },
  });
}
