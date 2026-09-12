/**
 * Better Continuity screenshots: compile + partner panels.
 */
import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env', quiet: true });

const base = process.env.SMOKE_BASE_URL || 'https://cryptp-production.up.railway.app';
const out = path.resolve('docs/screenshots');
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const shot = async (name) => {
  await page.screenshot({ path: path.join(out, name) });
  console.log('saved', name);
};

const clickNav = async (re) => {
  const btn = page.getByRole('button', { name: re }).first();
  if (await btn.count()) {
    await btn.click();
    await sleep(1000);
    return true;
  }
  return false;
};

await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await sleep(2500);
await shot('01-auth-login.png');

await page.getByPlaceholder('name@company.com').fill(email);
await page.locator('input[type="password"]').fill(password);
await page.getByRole('button', { name: /Sign In To Console/i }).click();
await sleep(8000);

// Ensure Explorer + SimpleStorage open
await clickNav(/^Explorer$/i);
const file = page.getByText('SimpleStorage.sol').first();
if (await file.count()) {
  await file.click();
  await sleep(2500);
} else {
  // Token Factory → Simple Storage template
  await clickNav(/Token Factory|Asset Factory/i);
  const simple = page.getByText(/Simple Storage/i).first();
  if (await simple.count()) {
    await simple.click();
    await sleep(2000);
  }
}

await clickNav(/^Explorer$/i);
await sleep(1500);
await shot('02-ide-explorer.png');

await clickNav(/Token Factory/i);
await sleep(1200);
await shot('03-token-factory.png');

// Compile for richer Analytics/Output
const compile = page.getByRole('button', { name: /Compile/i }).first();
if (await compile.count()) {
  await compile.click();
  await sleep(12000);
}

await clickNav(/^Indexed$/i);
await sleep(1500);
await shot('04-indexed-graph.png');

await clickNav(/^Analytics$/i);
await sleep(2000);
// Try generate metrics if present
const gen = page.getByRole('button', { name: /Generate Metrics/i }).first();
if (await gen.count()) {
  await gen.click();
  await sleep(4000);
}
await shot('05-analytics-chainlink.png');

// Confidential / CRE via Problem Audit / Security / Confidential
const problem = page.getByRole('button', { name: /Problem Audit|Security/i }).first();
if (await problem.count()) await problem.click();
await sleep(800);
const conf = page.getByRole('button', { name: /Confidential/i }).first();
if (await conf.count()) {
  await conf.click();
  await sleep(1500);
} else {
  // Search Confidential text
  const t = page.getByText(/Confidential|CRE audit|Run staging/i).first();
  if (await t.count()) await t.click().catch(() => {});
  await sleep(1000);
}
await shot('06-cre-confidential.png');

await browser.close();
console.log('DONE', out);
