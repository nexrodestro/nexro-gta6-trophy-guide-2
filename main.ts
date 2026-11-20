// GTA VI trophy guide + tracker — make.fun gta6-trophy-guide-01 entry (Node 22, stdlib only).
//
// This program hands in the guide that lives in app/: plain static files a browser
// opens at app/index.html (an ES module plus CSS, no build step), fully offline. The
// trophy list and the per-trophy guides live in app/data/trophies.json — all 55
// official PS5 trophies, each with its official name, description and grade, a guide
// in our own words, a short tip, and cited sources. The program copies app/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json,
// the summary the judge reads (screenshots, the files and bytes of the first load,
// and the source), using the vendored make.fun library. Leave
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
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const ALLOWED_GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const ALLOWED_KINDS = ['story', 'chapter', 'mission', 'side-character', 'activity', 'collectible', 'robbery', 'combat', 'exploration', 'misc'];
const EXPECTED_SPLIT = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_HIDDEN = 28;

function die(message) {
  throw new Error(message);
}

// The scorer's trophies row: app/data/trophies.json has to name every one of the
// official 55 trophies (name match under the gate's nameKey) with a non-blank guide
// and a non-blank tip. Refuse to hand in a guide that would fail that row rather
// than ship a broken dossier.
function loadTrophies() {
  const text = readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8');
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.trophies;
  if (!Array.isArray(list)) die('trophies.json does not hold a trophy list');
  if (list.length !== 55) die(`trophies.json must hold 55 trophies, found ${list.length}`);
  const seen = new Set();
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let hidden = 0;
  let missable = 0;
  for (const trophy of list) {
    if (typeof trophy.name !== 'string' || trophy.name.trim() === '') die('trophy without a name');
    if (seen.has(trophy.name)) die(`duplicate trophy name: ${trophy.name}`);
    seen.add(trophy.name);
    if (!ALLOWED_GRADES.includes(trophy.grade)) die(`${trophy.name}: bad grade ${trophy.grade}`);
    if (typeof trophy.description !== 'string' || trophy.description.trim() === '') die(`${trophy.name}: blank description`);
    if (typeof trophy.guide !== 'string' || trophy.guide.trim() === '') die(`${trophy.name}: blank guide`);
    if (typeof trophy.tip !== 'string' || trophy.tip.trim() === '') die(`${trophy.name}: blank tip`);
    if (typeof trophy.hidden !== 'boolean') die(`${trophy.name}: hidden flag must be a boolean`);
    if (typeof trophy.missable !== 'boolean') die(`${trophy.name}: missable flag must be a boolean`);
    if (!ALLOWED_KINDS.includes(trophy.kind)) die(`${trophy.name}: bad kind ${trophy.kind}`);
    if (!Array.isArray(trophy.sources) || trophy.sources.length === 0) die(`${trophy.name}: no sources cited`);
    counts[trophy.grade]++;
    if (trophy.hidden) hidden++;
    if (trophy.missable) missable++;
  }
  for (const grade of ALLOWED_GRADES) {
    if (counts[grade] !== EXPECTED_SPLIT[grade]) {
      die(`grade split must be 1/2/6/46, found ${counts.platinum}/${counts.gold}/${counts.silver}/${counts.bronze}`);
    }
  }
  if (hidden !== EXPECTED_HIDDEN) die(`28 trophies must be flagged hidden, found ${hidden}`);
  return { list, counts, hidden, missable };
}

const checked = loadTrophies();
console.log(
  `trophies: ${checked.list.length} (${checked.counts.platinum} platinum, ${checked.counts.gold} gold, ` +
  `${checked.counts.silver} silver, ${checked.counts.bronze} bronze; ` +
  `${checked.hidden} hidden; ${checked.missable} missable)`,
);

// The scorer refuses more than 4 screenshots, any one over 256 KiB, or a long side
// over 1280 px / short side under 480 px. Check the files before handing them in;
// the pixel size is checked by the shot script that produces them (see shots.json).
function checkShots() {
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) die('screenshots/ missing: need 3 or 4 shots');
  const files = readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  if (files.length < 3 || files.length > 4) die(`need 3 or 4 screenshots, found ${files.length}`);
  for (const name of files) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > 262144) die(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
  return files;
}

const shots = checkShots();
console.log(`screenshots: ${shots.join(', ')}`);

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, dossierOptions));
console.log(`dossier written to ${join(outDir, 'dossier.json')}`);
