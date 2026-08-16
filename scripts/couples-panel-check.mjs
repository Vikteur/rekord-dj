// Browser check of the DJ-side couples panel (npm run check:couples).
//
// The DJ half of what used to be one couple-intake check; the guest half lives
// in Vikteur/rekord-couple as scripts/couple-intake-check.mjs.
//
// Needs a running backend (Vikteur/spotify-to-rekordbox):
//     python -m server.run          # in that repo, http://127.0.0.1:8000
//     API_URL=http://127.0.0.1:8000 npm run check:couples
//
// Creates a throwaway couple with one song in it over the API, opens the panel
// in a real browser, checks the magic links are shown and that "Load & match"
// puts a chapter into the normal match pipeline, and screenshots both into
// .cache/couples-panel. The couple is deleted at the end, so the DJ's own data
// stays untouched.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const WEB_PORT = Number(process.env.WEB_PORT ?? 5197);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
const OUT = '.cache/couples-panel';
mkdirSync(OUT, { recursive: true });

// vite proxies /api to API_URL (see vite.config.ts), so the browser talks to
// one origin exactly like it does in production behind nginx.
const web = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', String(WEB_PORT), '--strictPort'],
  { cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, API_URL: API } },
);

async function waitFor(fn, msg, timeout = 25000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return;
    } catch {
      /* retry */
    }
    if (Date.now() - start > timeout) throw new Error(`timeout: ${msg}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const json = (path, init) =>
  fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  }).then((response) => response.json());

let browser;
let coupleId;
let ok = 0;
let fail = 0;
const check = (condition, label) => {
  if (condition) {
    ok += 1;
    console.log(`ok  ${label}`);
  } else {
    fail += 1;
    console.log(`FAIL ${label}`);
  }
};

try {
  await waitFor(async () => (await fetch(`${API}/api/health`)).ok, `API up on ${API}`);
  await waitFor(async () => (await fetch(WEB)).ok, `vite up on ${WEB}`);

  const future = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const created = await json('/api/couples', {
    method: 'POST',
    body: JSON.stringify({ names: 'Sofie & Jan', wedding_date: future }),
  });
  coupleId = created.id;
  const coupleToken = created.links.couple.token;
  check(coupleToken && created.links.friends.token, 'couple created with both magic links');

  // Seed one song through the guest API, so the panel has a chapter to load.
  await json(`/api/guest/${coupleToken}/entries/e2e-1`, {
    method: 'PUT',
    body: JSON.stringify({
      kind: 'couple_top20',
      spotify_id: 'sp3',
      title: 'One More Time',
      artist: 'Daft Punk',
      duration_ms: 320000,
    }),
  });

  for (const channel of ['msedge', 'chrome']) {
    try {
      browser = await chromium.launch({ channel });
      break;
    } catch {
      /* next */
    }
  }
  if (!browser) browser = await chromium.launch();

  const dj = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await dj.goto(WEB, { waitUntil: 'networkidle' });
  await dj.getByRole('button', { name: /Sofie & Jan/ }).click();
  await dj.getByText('Magic links').waitFor();

  const shown = await dj.locator('.copylink-input').first().inputValue();
  check(shown.includes(`/g/${coupleToken}`), 'couple magic link is shown to the DJ');
  await dj.screenshot({ path: `${OUT}/1-panel.png` });

  // "Load & match" puts a chapter into the normal match pipeline.
  const topTwentyRow = dj.locator('.list-block', { hasText: 'Their top 20' });
  await topTwentyRow.getByRole('button', { name: 'Load & match' }).click();
  await dj.locator('.nav-item.active', { hasText: 'Their top 20' }).waitFor();
  check(true, 'chapter loads as the active playlist');
  await dj.screenshot({ path: `${OUT}/2-chapter-loaded.png` });

  console.log(`\n${ok} ok, ${fail} failed — screenshots in ${OUT}`);
  process.exitCode = fail ? 1 : 0;
} finally {
  if (coupleId != null) {
    await fetch(`${API}/api/couples/${coupleId}`, { method: 'DELETE' }).catch(() => undefined);
  }
  await browser?.close();
  web.kill();
}
