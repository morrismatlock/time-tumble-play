// Time Tumble replay verifier (v0.12).
//
// Every ranked weekly run is sent as PENDING with its replay (seed + game version + button log).
// This script fetches the pending runs, plays each one again in a headless browser on exactly
// the game version it was played on, and marks it VERIFIED only if the replay ends on the same
// tick with the same distance and score. Anything else is REJECTED (with a short note).
// Verified runs get their ghost and era splits written from the replay, so ghosts are trustworthy.
//
// It runs on a schedule in GitHub Actions (in the public time-tumble-play repo: free minutes).
// Secrets: VERIFIER_TOKEN only (made by `select public.new_verifier_token();` in Supabase). That
// token can ONLY list pending runs and give verdicts (see supabase/schema.sql); it's never in the game.
//
//   node verifier/verify.mjs --check          print whether anything is waiting (CI: skips the browser install)
//   node verifier/verify.mjs                  verify everything pending
//   node verifier/verify.mjs --build dist     use this folder as the build for the current version
//   node verifier/verify.mjs --runs file.json --build dist   offline: verify runs from a file, print verdicts
//
// Env: SUPABASE_URL, SUPABASE_KEY (the public publishable key), VERIFIER_TOKEN.
// (URL and key default to verifier/config.json, written at deploy time.)

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'config.json'), 'utf8')); } catch { /* none */ }
const URL_ = process.env.SUPABASE_URL || cfg.supabaseUrl;
const KEY = process.env.SUPABASE_KEY || cfg.supabaseKey;
const TOKEN = process.env.VERIFIER_TOKEN || '';
const EXTRA_TICKS = 1200; // a replay that hasn't ended 10 s after the claimed end is a mismatch

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------------------------------------------------------------- Supabase (RPC only)

async function rpc(fn, body) {
  const h = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY?.startsWith('eyJ')) h.Authorization = `Bearer ${KEY}`;
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
const fetchPending = () => rpc('weekly_pending', { p_token: TOKEN, p_limit: 40 });
const sendVerdict = (id, status, note, ghost, splits) => rpc('weekly_verdict', { p_token: TOKEN, p_id: id, p_status: status, p_note: note, p_ghost: ghost, p_splits: splits });

// ---------------------------------------------------------------- builds

/** The folder holding the game build for `version` (current folder, or an older deploy's git tag). */
function buildFor(version) {
  const forced = opt('build', null);
  const here = forced ? path.resolve(forced) : ROOT;
  const vfile = path.join(here, 'version.json');
  let current = null;
  try { current = JSON.parse(fs.readFileSync(vfile, 'utf8')).version; } catch { /* dev: read package.json */ }
  if (!current) try { current = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch { /* none */ }
  if (version === current) return here;
  // an older version: every deploy is tagged v<version> in the play repo
  const dir = path.join(ROOT, '.builds', version);
  if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  try {
    execSync(`git rev-parse -q --verify "refs/tags/v${version}"`, { cwd: ROOT, stdio: 'ignore' });
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    execSync(`git worktree add --detach "${dir}" "v${version}"`, { cwd: ROOT, stdio: 'ignore' });
    return dir;
  } catch { return null; }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
/** A tiny static file server for one build folder. */
function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent((req.url || '/').split('?')[0]);
      let f = path.join(dir, p === '/' ? 'index.html' : p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

// ---------------------------------------------------------------- the replay

const INPUTS_RE = /^(?:[JRGSPU][0-9a-z]*)*$/;

/** Play a run again in the real game (headless) and return what it worked out. */
async function replay(browser, gameUrl, run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  // the game is offline while replaying: block every outside request
  await page.route((u) => !u.href.startsWith(gameUrl), (r) => r.abort());
  await page.addInitScript((r) => { window.__ttReplay = r; }, { v: 1, version: run.version, seed: run.seed, inputs: run.inputs, ticks: run.ticks, score: run.score, distance: run.distance });
  try {
    await page.goto(`${gameUrl}?play&replay&fast`);
    // budget: generous for a slow CI machine (a 10-minute run replays in well under a minute)
    await page.waitForFunction(() => window.__ttResult, null, { timeout: 60000 + run.ticks * 8 });
    return { ...(await page.evaluate(() => window.__ttResult)), errors };
  } catch (e) {
    return { error: `replay did not finish (${String(e.message || e).slice(0, 80)})`, errors };
  } finally { await page.close(); }
}

/** Compare a claim with its replay. */
export function judge(run, r) {
  if (r.error) return { status: 'rejected', note: r.error };
  if (r.score === run.score && r.distance === run.distance && r.ticks === run.ticks) return { status: 'verified', note: `replay matched (${r.ticks} ticks)` };
  return { status: 'rejected', note: `replay gave ${r.score} pts / ${r.distance} m / tick ${r.ticks}, claimed ${run.score} / ${run.distance} m / tick ${run.ticks}` };
}

/** Checks before we even start a browser. */
function precheck(run) {
  if (!run.inputs || !INPUTS_RE.test(run.inputs)) return 'bad input log';
  if (!run.seed || run.seed !== `weekly-${run.week}`) return `wrong seed for ${run.week}`;
  if (!Number.isInteger(run.ticks) || run.ticks <= 0 || run.ticks > 120 * 60 * 60) return 'bad run length';
  return null;
}

/** Verify a list of runs; `report(run, status, note, result)` is called for each. */
export async function verifyRuns(runs, report) {
  const { chromium } = await import('playwright');
  const byVersion = new Map();
  for (const r of runs) { const v = r.version || '?'; if (!byVersion.has(v)) byVersion.set(v, []); byVersion.get(v).push(r); }
  let browser = null;
  try {
    for (const [version, list] of byVersion) {
      const dir = buildFor(version);
      if (!dir) { for (const r of list) await report(r, 'stale', `no build of version ${version} to replay on`, null); continue; }
      const srv = await serve(dir);
      const la = { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] };
      // (CI installs Playwright's Chromium; on a PC without it, the installed Chrome works too)
      browser ??= await chromium.launch(la).catch(() => chromium.launch({ ...la, channel: 'chrome' }));
      try {
        for (const run of list) {
          const bad = precheck(run);
          if (bad) { await report(run, 'rejected', bad, null); continue; }
          const t0 = Date.now();
          const res = await replay(browser, srv.url, run);
          const v = judge(run, res);
          log(`${run.name.padEnd(16)} ${String(run.score).padStart(7)} pts  ${String(run.distance).padStart(5)} m  v${version}  -> ${v.status.toUpperCase()}  (${((Date.now() - t0) / 1000).toFixed(1)} s)  ${v.status === 'verified' ? '' : v.note}`);
          await report(run, v.status, v.note, res);
        }
      } finally { srv.close(); }
    }
  } finally { await browser?.close(); }
}

// ---------------------------------------------------------------- main

async function main() {
  const file = opt('runs', null);
  if (file) {
    // offline: runs from a file, verdicts printed (and written next to it)
    const runs = JSON.parse(fs.readFileSync(file, 'utf8'));
    const out = [];
    await verifyRuns(runs, (run, status, note, res) => { out.push({ name: run.name, claimed: run.score, status, note, replayScore: res?.score, ghostSamples: res?.ghost ? res.ghost.length / 3 : 0, splits: res?.splits }); });
    fs.writeFileSync(file.replace(/\.json$/, '') + '.verdicts.json', JSON.stringify(out, null, 2));
    console.table(out.map(({ name, claimed, status, note }) => ({ name, claimed, status, note })));
    return;
  }
  if (!URL_ || !KEY) throw new Error('SUPABASE_URL / SUPABASE_KEY missing');
  if (!TOKEN) {
    log('No VERIFIER_TOKEN set yet (see "Steps for Morris" in docs/DESIGN.md): nothing to do.');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'pending=no\n');
    return;
  }
  const pending = await fetchPending();
  log(`${pending.length} run(s) waiting`);
  if (opt('check', false)) {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pending.length ? 'yes' : 'no'}\n`);
    return;
  }
  if (!pending.length) return;
  await verifyRuns(pending, async (run, status, note, res) => {
    let ghost = null, splits = null;
    if (status === 'verified' && res) {
      ghost = JSON.stringify(res.ghost);
      if (ghost.length > 190000) ghost = JSON.stringify(res.ghost.filter((_, i) => Math.floor(i / 3) % 2 === 0)); // very long run: 5 a second
      if (ghost.length > 190000) ghost = null;
      splits = res.splits.map((t) => (t === null ? 0 : t));
    }
    await sendVerdict(run.id, status, String(note).slice(0, 200), ghost, splits);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
