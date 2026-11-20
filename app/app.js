// GTA VI trophy guide + tracker: a saved checklist over the 55 official trophies.
// The data (names, descriptions, grades, guides, hidden/missable flags, sources)
// comes from data/trophies.json. Progress lives in localStorage; export/import moves
// it as JSON. Nothing here touches the network. URL parameters preset the view:
// ?grade=silver&kind=robbery&phase=2&q=bank&spoiler=off&view=roadmap
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoiler';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const cardsEl = $('cards');
const qEl = $('q');
const gradeEl = $('grade');
const kindEl = $('kind');
const phaseEl = $('phase');
const statusEl = $('status');
const spoilerEl = $('spoiler');

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let spoiler = params.get('spoiler') === 'off' ? false
  : params.get('spoiler') === 'on' ? true
  : localStorage.getItem(SPOILER_KEY) !== 'off';
spoilerEl.checked = spoiler;

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

// Preset the filters from the URL (used by screenshots and deep links).
for (const [el, key] of [[gradeEl, 'grade'], [kindEl, 'kind'], [phaseEl, 'phase'], [statusEl, 'status']]) {
  const v = params.get(key);
  if (v && [...el.options].some((o) => o.value === v)) el.value = v;
}
if (params.get('q')) qEl.value = params.get('q');

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_KEY, spoiler ? 'on' : 'off');
}

function visible(t) {
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
  if (phaseEl.value !== 'all' && String(t.phase) !== phaseEl.value) return false;
  if (statusEl.value === 'earned' && !earned.has(t.name)) return false;
  if (statusEl.value === 'remaining' && earned.has(t.name)) return false;
  const q = qEl.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function flag(parent, text, cls) {
  const el = document.createElement('span');
  el.className = `flag${cls ? ' ' + cls : ''}`;
  el.textContent = text;
  parent.append(el);
}

function card(t) {
  const isEarned = earned.has(t.name);
  const hiddenNow = spoiler && t.hidden && !isEarned;
  const el = document.createElement('article');
  el.className = `card grade-${t.grade}${isEarned ? ' earned' : ''}`;

  const top = document.createElement('div');
  top.className = 'card-top';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', `Mark ${hiddenNow ? 'hidden trophy' : t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    save();
    render();
  });

  const body = document.createElement('div');
  const badge = document.createElement('span');
  badge.className = `badge ${t.grade}`;
  badge.textContent = t.grade;
  body.append(badge);

  const name = document.createElement('h3');
  name.className = 'trophy-name';
  name.textContent = hiddenNow ? 'Hidden Trophy' : t.name;
  body.append(name);

  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = hiddenNow
    ? 'Story trophy — hidden until you earn it.'
    : `“${t.description}”`;
  body.append(official);

  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = hiddenNow
    ? 'Hidden — tick it off once it pops to reveal the guide.'
    : t.guide;
  body.append(guide);

  const flags = document.createElement('div');
  flags.className = 'flags';
  if (t.hidden) flag(flags, 'Hidden', 'hidden-flag');
  if (t.missable) flag(flags, 'Missable', 'missable');
  flag(flags, t.kind.replace('-', ' '), '');
  flag(flags, `Phase ${t.phase}`, '');
  body.append(flags);

  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = `Sources: ${t.sources.join(' · ')}`;
  body.append(sources);

  top.append(box, body);
  el.append(top);
  return el;
}

function render() {
  cardsEl.replaceChildren();
  const shown = trophies.filter(visible);
  for (const t of shown) cardsEl.append(card(t));
  if (!shown.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No trophies match these filters.';
    cardsEl.append(p);
  }

  $('progressText').textContent = `${earned.size} of ${trophies.length} earned`;
  $('progressPct').textContent = `${Math.round((earned.size / trophies.length) * 100)}%`;
  $('progressBar').style.width = `${(earned.size / trophies.length) * 100}%`;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    totals[t.grade]++;
    if (earned.has(t.name)) counts[t.grade]++;
  }
  $('gradeCounts').textContent =
    `Platinum ${counts.platinum}/${totals.platinum} · Gold ${counts.gold}/${totals.gold} · ` +
    `Silver ${counts.silver}/${totals.silver} · Bronze ${counts.bronze}/${totals.bronze}`;
  for (const el of document.querySelectorAll('.phase-count')) {
    const ph = Number(el.dataset.phase);
    const inPhase = trophies.filter((t) => t.phase === ph);
    const done = inPhase.filter((t) => earned.has(t.name)).length;
    el.textContent = `${done} of ${inPhase.length} trophies in this phase earned.`;
  }
  $('showing').textContent =
    `Showing ${shown.length} of ${trophies.length} trophies` +
    (spoiler ? ' · story trophies hidden until earned' : ' · spoilers shown');
}

for (const el of [qEl, gradeEl, kindEl, phaseEl, statusEl]) {
  el.addEventListener(el === qEl ? 'input' : 'change', render);
}
spoilerEl.addEventListener('change', () => {
  spoiler = spoilerEl.checked;
  save();
  render();
});

$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned].sort(), null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const names = JSON.parse(await file.text());
  earned = new Set(names.filter((n) => trophies.some((t) => t.name === n)));
  save();
  render();
});
$('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    save();
    render();
  }
});

render();
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
}
