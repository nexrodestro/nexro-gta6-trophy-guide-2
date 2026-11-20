// GTA VI trophy guide + tracker — the checklist app for all 55 official trophies.
//
// The trophy data (names, descriptions, grades, guides, tips, hidden/missable flags
// and sources) is loaded from data/trophies.json. Progress is kept in localStorage
// and can be exported to a file and imported back. Nothing here touches the network.
// The address bar presets the view, so screenshots and deep links can set it:
// ?grade=silver&kind=robbery&phase=2&q=bank&spoiler=off&view=roadmap
const STORE_KEY = 'gta6-trophy-checklist';
const SPOILER_STORE_KEY = 'gta6-trophy-spoiler';
const PROGRESS_FILE = 'gta6-trophy-progress.json';

const params = new URLSearchParams(window.location.search);
const byId = (id) => document.getElementById(id);
const cardsBox = byId('cards');
const searchBox = byId('q');
const gradePick = byId('grade');
const kindPick = byId('kind');
const phasePick = byId('phase');
const statusPick = byId('status');
const spoilerBox = byId('spoiler');

const esc = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
let spoilerOn = params.get('spoiler') === 'off' ? false
  : params.get('spoiler') === 'on' ? true
  : localStorage.getItem(SPOILER_STORE_KEY) !== 'off';
spoilerBox.checked = spoilerOn;

const trophyResponse = await fetch('data/trophies.json');
const trophyDoc = await trophyResponse.json();
const trophies = trophyDoc.trophies;

// Take the filter values from the URL when the link sets them (screenshots and
// deep links use this), and the search text too.
for (const [control, key] of [[gradePick, 'grade'], [kindPick, 'kind'], [phasePick, 'phase'], [statusPick, 'status']]) {
  const wanted = params.get(key);
  if (wanted && [...control.options].some((option) => option.value === wanted)) control.value = wanted;
}
if (params.get('q')) searchBox.value = params.get('q');

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_STORE_KEY, spoilerOn ? 'on' : 'off');
}

function passesFilters(trophy) {
  if (gradePick.value !== 'all' && trophy.grade !== gradePick.value) return false;
  if (kindPick.value !== 'all' && trophy.kind !== kindPick.value) return false;
  if (phasePick.value !== 'all' && String(trophy.phase) !== phasePick.value) return false;
  if (statusPick.value === 'earned' && !earned.has(trophy.name)) return false;
  if (statusPick.value === 'remaining' && earned.has(trophy.name)) return false;
  const query = searchBox.value.trim().toLowerCase();
  if (!query) return true;
  const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.tip} ${trophy.kind}`.toLowerCase();
  return haystack.includes(query);
}

function cardHtml(trophy) {
  const got = earned.has(trophy.name);
  const hiddenNow = spoilerOn && trophy.hidden && !got;
  const displayName = hiddenNow ? 'Hidden Trophy' : trophy.name;
  const displayDesc = hiddenNow
    ? 'Story trophy — hidden until you earn it.'
    : `“${trophy.description}”`;
  const displayGuide = hiddenNow
    ? 'Hidden — tick it off once it pops to reveal the guide.'
    : trophy.guide;
  const displayTip = hiddenNow ? '' : trophy.tip;
  const flagBits = [
    trophy.hidden ? '<span class="flag hidden-flag">Hidden</span>' : '',
    trophy.missable ? '<span class="flag missable">Missable</span>' : '',
    `<span class="flag">${esc(trophy.kind.replace('-', ' '))}</span>`,
    `<span class="flag">Phase ${trophy.phase}</span>`,
  ].join('');
  return `<article class="card grade-${trophy.grade}${got ? ' earned' : ''}">` +
    `<div class="card-top">` +
    `<input type="checkbox" data-name="${esc(trophy.name)}" ${got ? 'checked' : ''} aria-label="Mark ${esc(displayName)} as earned">` +
    `<div>` +
    `<span class="badge ${trophy.grade}">${trophy.grade}</span>` +
    `<h3 class="trophy-name">${esc(displayName)}</h3>` +
    `<p class="official">${esc(displayDesc)}</p>` +
    `<p class="guide">${esc(displayGuide)}</p>` +
    (displayTip ? `<p class="guide"><strong>Tip:</strong> ${esc(displayTip)}</p>` : '') +
    `<div class="flags">${flagBits}</div>` +
    `<p class="sources">Sources: ${esc(trophy.sources.join(' · '))}</p>` +
    `</div></div></article>`;
}

function paint() {
  const shown = trophies.filter(passesFilters);
  cardsBox.innerHTML = shown.length
    ? shown.map(cardHtml).join('')
    : '<p class="empty">No trophies match these filters.</p>';

  byId('progressText').textContent = `${earned.size} of ${trophies.length} earned`;
  byId('progressPct').textContent = `${Math.round((earned.size / trophies.length) * 100)}%`;
  byId('progressBar').style.width = `${(earned.size / trophies.length) * 100}%`;
  const gotByGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totalByGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    totalByGrade[trophy.grade]++;
    if (earned.has(trophy.name)) gotByGrade[trophy.grade]++;
  }
  byId('gradeCounts').textContent =
    `Platinum ${gotByGrade.platinum}/${totalByGrade.platinum} · Gold ${gotByGrade.gold}/${totalByGrade.gold} · ` +
    `Silver ${gotByGrade.silver}/${totalByGrade.silver} · Bronze ${gotByGrade.bronze}/${totalByGrade.bronze}`;
  for (const phaseLine of document.querySelectorAll('.phase-count')) {
    const phase = Number(phaseLine.dataset.phase);
    const inPhase = trophies.filter((trophy) => trophy.phase === phase);
    const done = inPhase.filter((trophy) => earned.has(trophy.name)).length;
    phaseLine.textContent = `${done} of ${inPhase.length} trophies in this phase earned.`;
  }
  byId('showing').textContent =
    `Showing ${shown.length} of ${trophies.length} trophies` +
    (spoilerOn ? ' · story trophies hidden until earned' : ' · spoilers shown');
}

// One delegated listener handles every card checkbox, since paint() rebuilds them.
cardsBox.addEventListener('change', (event) => {
  const box = event.target;
  if (!box.matches('input[type="checkbox"]')) return;
  if (box.checked) earned.add(box.dataset.name);
  else earned.delete(box.dataset.name);
  persist();
  paint();
});

for (const control of [searchBox, gradePick, kindPick, phasePick, statusPick]) {
  control.addEventListener(control === searchBox ? 'input' : 'change', paint);
}
spoilerBox.addEventListener('change', () => {
  spoilerOn = spoilerBox.checked;
  persist();
  paint();
});

byId('export').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify([...earned].sort(), null, 2)], { type: 'application/json' }));
  link.download = PROGRESS_FILE;
  link.click();
});
byId('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const names = JSON.parse(await file.text());
  earned = new Set(names.filter((name) => trophies.some((trophy) => trophy.name === name)));
  persist();
  paint();
});
byId('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    persist();
    paint();
  }
});

paint();
if (params.get('view') === 'roadmap') {
  byId('roadmap').scrollIntoView();
}
