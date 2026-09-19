/**
 * Visual smoke check. Captures the key screens in both themes and at phone
 * width, and fails on console errors or horizontal overflow — the two faults
 * that are easy to ship and hard to notice.
 *
 * Usage: npm run dev, then `node scripts/screenshot.mjs [outDir]`
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? '.screenshots';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined,
});
const problems = [];

const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

for (const [path, name] of [['/', 'dashboard'], ['/settings', 'settings'], ['/debug', 'debug'], ['/drill', 'drill']]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/dashboard-light.png`, fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', (e) => problems.push(`mobile pageerror: ${e.message}`));
await mobile.goto(BASE + '/', { waitUntil: 'networkidle' });
await mobile.screenshot({ path: `${OUT}/mobile.png`, fullPage: true });

if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
  problems.push('horizontal scroll at 390px width');
}

await browser.close();

if (problems.length) {
  console.error('Visual smoke FAILED:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`Visual smoke passed. Screenshots in ${OUT}/`);
