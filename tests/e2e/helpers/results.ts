import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type SmokeStatus = 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED';

export interface SmokeResult {
  id: string;
  section: string;
  steps: string;
  status: SmokeStatus;
  notes?: string;
}

const results: SmokeResult[] = [];

export function clearResults(): void {
  results.length = 0;
}

export function record(
  id: string,
  section: string,
  steps: string,
  status: SmokeStatus,
  notes?: string
): void {
  results.push({ id, section, steps, status, notes });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'SKIP' ? '○' : '⊘';
  console.log(`${icon} ${id}: ${status}${notes ? ` — ${notes}` : ''}`);
}

export function getDefects(): SmokeResult[] {
  return results.filter((r) => r.status === 'FAIL');
}

export function writeReport(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(__dirname, '../../..');
  const jsonPath = path.join(outDir, 'tests/e2e/smoke-checklist.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const defects = results.filter((r) => r.status === 'FAIL');
  const blocked = results.filter((r) => r.status === 'BLOCKED');

  const md = `# CryptP IDE Smoke Test Report

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Environment:** local dev (\`npm run dev\`)  
**Runner:** Playwright (\`tests/e2e/ide-smoke.spec.ts\`)

## Summary

| Status | Count |
|--------|-------|
| PASS | ${counts.PASS || 0} |
| FAIL | ${counts.FAIL || 0} |
| SKIP | ${counts.SKIP || 0} |
| BLOCKED | ${counts.BLOCKED || 0} |

## Results

| ID | Section | Status | Notes |
|----|---------|--------|-------|
${results.map((r) => `| ${r.id} | ${r.section} | ${r.status} | ${(r.notes || r.steps).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`).join('\n')}

## Defects (FAIL)

${defects.length === 0 ? '_None._' : defects.map((d) => `- **${d.id}** (${d.section}): ${d.notes || d.steps}`).join('\n')}

## Blocked / manual follow-up

${blocked.length === 0 ? '_None._' : blocked.map((d) => `- **${d.id}**: ${d.notes || d.steps}`).join('\n')}

## Known non-wired UI (N/A)

- \`DeploymentGuide.tsx\` — not mounted in main IDE flow
- \`CallTraceVisualizer.tsx\` — not in activity bar (use Gas Profiler instead)

## Security note

Credentials were supplied via environment variables only and are not stored in this report. Rotate your password if it was shared in chat.
`;

  const mdPath = path.join(outDir, 'docs/SMOKE_TEST_REPORT.md');
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, md);
  console.log(`\nReport written to ${mdPath}`);
}
