import { formatViolations, loadContent } from '../src/lib/content/loader';

const { items, violations, files } = loadContent();

console.log(`Scanned ${files.length} bank(s), parsed ${items.length} item(s).`);

if (violations.length > 0) {
  console.error(`\n${violations.length} violation(s):\n`);
  console.error(formatViolations(violations));
  console.error('\nContent is INVALID. No bank with a violation is served.');
  process.exit(1);
}

const byStage = new Map<string, number>();
for (const item of items) byStage.set(item.stage, (byStage.get(item.stage) ?? 0) + 1);
console.log('\nBy stage:');
for (const [stage, count] of [...byStage].sort()) console.log(`  ${stage.padEnd(14)} ${count}`);
console.log('\nAll content valid.');
