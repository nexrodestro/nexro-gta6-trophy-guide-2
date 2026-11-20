// GTA VI trophy guide + tracker — make.fun gta6-trophy-guide-01 entry (Node 22, stdlib only).
//
// What this program does: it takes the guide in app/ — plain static files a browser
// opens at app/index.html (an ES module plus CSS, no build step), fully offline —
// and hands it in. The trophy list and the per-trophy guides live in
// app/data/trophies.json: all 55 official PS5 trophies, each with its official name,
// description and grade, a guide in our own words, and cited sources. The program
// copies app/ and screenshots/ next to this file into /output and writes
// /output/dossier.json, the summary the judge reads (screenshots, the files and bytes
// of the first load, and the source), using the vendored make.fun library. Leave
// vendor/makefun-frontend.ts alone: the scorer requires dossier.json to be byte for
// byte what its own copy writes.
//
// Run it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GRADES = new Set(['platinum', 'gold', 'silver', 'bronze']);
const KINDS = new Set(['story', 'chapter', 'mission', 'side-character', 'activity', 'collectible', 'robbery', 'combat', 'exploration', 'misc']);

// The scorer's trophies row: app/data/trophies.json has to name every one of the
// official 55 trophies (name match under the gate's nameKey) with a non-blank guide.
// Refuse to hand in a guide that would fail that row rather than ship a broken dossier.
function validateTrophies() {
  const raw = readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8');
  const doc = JSON.parse(raw);
  const list = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(list) || list.length !== 55) {
    throw new Error(`trophies.json must hold 55 trophies, found ${Array.isArray(list) ? list.length : 'not an array'}`);
  }
  const names = new Set();
  for (const t of list) {
    if (typeof t.name !== 'string' || !t.name.trim()) throw new Error('trophy without a name');
    if (names.has(t.name)) throw new Error(`duplicate trophy name: ${t.name}`);
    names.add(t.name);
    if (!GRADES.has(t.grade)) throw new Error(`${t.name}: bad grade ${t.grade}`);
    if (typeof t.description !== 'string' || !t.description.trim()) throw new Error(`${t.name}: blank description`);
    if (typeof t.guide !== 'string' || !t.guide.trim()) throw new Error(`${t.name}: blank guide`);
    if (typeof t.hidden !== 'boolean') throw new Error(`${t.name}: hidden flag must be a boolean`);
    if (typeof t.missable !== 'boolean') throw new Error(`${t.name}: missable flag must be a boolean`);
    if (!KINDS.has(t.kind)) throw new Error(`${t.name}: bad kind ${t.kind}`);
    if (!Array.isArray(t.sources) || t.sources.length === 0) throw new Error(`${t.name}: no sources cited`);
  }
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of list) grades[t.grade]++;
  if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
    throw new Error(`grade split must be 1/2/6/46, found ${grades.platinum}/${grades.gold}/${grades.silver}/${grades.bronze}`);
  }
  const hidden = list.filter((t) => t.hidden).length;
  if (hidden !== 28) throw new Error(`28 trophies must be flagged hidden, found ${hidden}`);
  return list;
}

const trophies = validateTrophies();
console.log(
  `trophies: ${trophies.length} (1 platinum, 2 gold, 6 silver, 46 bronze; ` +
  `${trophies.filter((t) => t.hidden).length} hidden; ` +
  `${trophies.filter((t) => t.missable).length} missable)`,
);

// The scorer refuses more than 4 screenshots, any one over 256 KiB, or a long side
// over 1280 px / short side under 480 px. Check the files before handing them in;
// the pixel size is checked by the shot script that produces them (see shots.json).
function validateScreenshots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) throw new Error('screenshots/ missing: need 3 or 4 shots');
  const files = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  if (files.length < 3 || files.length > 4) {
    throw new Error(`need 3 or 4 screenshots, found ${files.length}`);
  }
  for (const f of files) {
    const bytes = statSync(join(dir, f)).size;
    if (bytes > 262144) throw new Error(`screenshot ${f} is ${bytes} bytes, over the 256 KiB cap`);
  }
  return files;
}

const shots = validateScreenshots();
console.log(`screenshots: ${shots.join(', ')}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log(`dossier written to ${join(out, 'dossier.json')}`);
