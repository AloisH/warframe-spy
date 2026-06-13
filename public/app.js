// Mission Profit Index — ranked HUD board with a mission-type tab selector and
// a live minimum-value filter.
//
// Each mission's score = Σ weight(rotation) · EV(rotation), where the weights
// come from the build (Spy = 1/1/1 sum of 3 vaults; endless = A-A-B-C 0.5/0.25/
// 0.25 per reward; single-completion = {A:1}). Ranking happens within the
// selected type, so the unit is comparable inside each tab.

const ROTS = ['A', 'B', 'C', 'D', 'E'];
const fmtPlat = (n) => (Math.round(n * 10) / 10).toFixed(1);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let cards = [];
let threshold = 3;
let board;

function timeAgo(iso) {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 90) return 'just now';
  const mins = secs / 60;
  if (mins < 90) return `${Math.round(mins)} min ago`;
  const hrs = mins / 60;
  if (hrs < 36) return `${Math.round(hrs)} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function setReadout(data) {
  const live = document.querySelector('.readout__live');
  live.textContent = '● ONLINE';
  live.classList.add('ok');
  document.getElementById('r-missions').textContent = data.missionCount;
  document.getElementById('r-items').textContent = data.pricedItemCount;
  const updated = document.getElementById('r-updated');
  updated.textContent = timeAgo(data.generatedAt);
  updated.title = new Date(data.generatedAt).toLocaleString();

  document.getElementById('method').innerHTML =
    `Pick a mission type below — missions are ranked against each other by expected <b>platinum</b>, ` +
    `using <b>drop&nbsp;chance × sell&nbsp;price</b> from the official drop table and live ` +
    `<a href="https://warframe.market" target="_blank" rel="noopener">warframe.market</a> orders. ` +
    `<b>Spy</b> sums its 3 vaults; <b>endless</b> types weight rewards by A-A-B-C frequency; ` +
    `others give one reward. Use the filter to ignore low-value drops not worth a trade slot.`;
}

// --- DOM construction ----------------------------------------------------

function buildRot(mission, rot) {
  const rewards = mission.rotations[rot];
  if (!rewards) return '';
  const weight = mission.weights?.[rot] ?? 1;
  const multi = Object.keys(mission.weights || {}).length > 1;
  const badge =
    multi && mission.type !== 'Spy'
      ? `<span class="rot__weight" title="This rotation is ${Math.round(weight * 100)}% of the rewards you receive">${Math.round(weight * 100)}%</span>`
      : '';
  const rows = rewards
    .map(
      (d, i) => `
      <div class="drop" data-i="${i}">
        <span class="drop__name" title="${esc(d.item)}">${esc(d.item)}</span>
        <span class="drop__price"></span>
        <span class="drop__chance">${(d.chance * 100).toFixed(1)}%</span>
        <span class="drop__contrib"></span>
      </div>`
    )
    .join('');
  return `
    <div class="rot rot--${rot.toLowerCase()}">
      <div class="rot__head">
        <span><span class="rot__name">ROTATION ${rot}</span>${badge}</span>
        <span class="rot__ev"><span class="evnum">0.0</span>p <small>/ drop</small></span>
      </div>
      <div class="drop drop--head" title="Expected value (EV) = sell price each × drop chance">
        <span>Reward</span><span>Each</span><span>Chance</span><span>EV</span>
      </div>
      ${rows}
    </div>`;
}

function buildCard(mission, domIndex) {
  const el = document.createElement('article');
  el.className = 'mission';
  el.style.setProperty('--accent', 'var(--gold)');
  el.style.animationDelay = `${Math.min(domIndex * 35, 560)}ms`;
  const tag = mission.isEvent ? '<span class="tag">Event Node</span>' : '';
  const rotKeys = ROTS.filter((r) => mission.rotations[r]);

  el.innerHTML = `
    <div class="mission__head">
      <div class="rank">00</div>
      <div class="info">
        <div class="node">${esc(mission.node || mission.name)} ${tag}</div>
        <div class="planet">${esc(mission.planet)}</div>
      </div>
      <div class="barwrap">
        <div class="bar">${rotKeys.map((r) => `<span class="bar__seg bar__seg--${r.toLowerCase()}"></span>`).join('')}</div>
        <small></small>
      </div>
      <div class="value-wrap">
        <div class="value">
          <div class="value__num"><span class="vnum">0.0</span><span class="plat">◈</span></div>
          <div class="value__label">${esc(mission.metricLabel || 'plat / reward').toUpperCase()}</div>
        </div>
        <span class="chev">▶</span>
      </div>
    </div>
    <div class="detail">${rotKeys.map((r) => buildRot(mission, r)).join('')}</div>`;

  el.querySelector('.mission__head').addEventListener('click', () => el.classList.toggle('open'));

  const dropsByRot = {};
  const rotEvEls = {};
  const segs = {};
  for (const rot of rotKeys) {
    const rotEl = el.querySelector(`.rot--${rot.toLowerCase()}`);
    rotEvEls[rot] = rotEl.querySelector('.evnum');
    segs[rot] = el.querySelector(`.bar__seg--${rot.toLowerCase()}`);
    dropsByRot[rot] = [...rotEl.querySelectorAll('.drop[data-i]')].map((rowEl) => ({
      reward: mission.rotations[rot][Number(rowEl.dataset.i)],
      rowEl,
      priceEl: rowEl.querySelector('.drop__price'),
      contribEl: rowEl.querySelector('.drop__contrib'),
    }));
  }

  return {
    mission,
    el,
    rotKeys,
    rankEl: el.querySelector('.rank'),
    vnumEl: el.querySelector('.vnum'),
    barEl: el.querySelector('.bar'),
    segs,
    smallEl: el.querySelector('.barwrap small'),
    rotEvEls,
    dropsByRot,
    rotWeighted: {},
    total: 0,
  };
}

// --- live update ---------------------------------------------------------

function priceText(d, t) {
  if (!d.tradable) return { txt: '—', cls: 'drop__price drop__price--na', title: 'Not tradable on warframe.market' };
  if (d.value <= 0) return { txt: '—', cls: 'drop__price drop__price--na', title: 'No live sell orders found' };
  if (d.value < t)
    return { txt: `${fmtPlat(d.value)}p`, cls: 'drop__price drop__price--cut', title: `Below the ${t}p filter — counted as 0` };
  return { txt: `${fmtPlat(d.value)}p`, cls: 'drop__price', title: '' };
}

function updateCard(card, t) {
  let total = 0;
  for (const rot of card.rotKeys) {
    let ev = 0;
    for (const dr of card.dropsByRot[rot]) {
      const d = dr.reward;
      const v = d.value >= t ? d.value : 0;
      const contrib = d.chance * v;
      ev += contrib;
      dr.contribEl.textContent = `${fmtPlat(contrib)}p`;
      const p = priceText(d, t);
      dr.priceEl.textContent = p.txt;
      dr.priceEl.className = p.cls;
      dr.priceEl.title = p.title;
      dr.rowEl.classList.toggle('drop--zero', v <= 0);
    }
    card.rotEvEls[rot].textContent = fmtPlat(ev);
    const weighted = (card.mission.weights?.[rot] ?? 1) * ev;
    card.rotWeighted[rot] = weighted;
    total += weighted;
  }
  card.total = total;
  card.vnumEl.textContent = fmtPlat(total);
}

function applyFilter() {
  let max = 0;
  for (const c of cards) {
    updateCard(c, threshold);
    if (c.total > max) max = c.total;
  }
  for (const c of cards) {
    const pct = max > 0 ? (c.total / max) * 100 : 0;
    c.barEl.style.width = `${Math.max(pct, 6)}%`;
    for (const rot of c.rotKeys) {
      const w = c.rotWeighted[rot] || 0;
      c.segs[rot].style.flex = String(w);
      c.segs[rot].style.display = w > 0 ? 'block' : 'none';
    }
    c.smallEl.textContent = c.rotKeys.map((r) => `${r} ${fmtPlat(c.rotWeighted[r] || 0)}`).join(' · ');
  }
  [...cards]
    .sort((a, b) => b.total - a.total)
    .forEach((c, i) => {
      c.el.style.order = String(i);
      c.rankEl.textContent = String(i + 1).padStart(2, '0');
      c.el.classList.toggle('is-first', i === 0 && c.total > 0);
    });
}

// --- tabs ----------------------------------------------------------------

let missionsByType = {};

function selectTab(type) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  board.innerHTML = '';
  cards = (missionsByType[type] || []).map((m, i) => {
    const card = buildCard(m, i);
    board.appendChild(card.el);
    return card;
  });
  applyFilter();
}

function buildTabs(data) {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  for (const t of data.types) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.dataset.type = t.key;
    btn.innerHTML = `${esc(t.label)}<span class="tab__count">${t.count}</span>`;
    btn.addEventListener('click', () => selectTab(t.key));
    tabs.appendChild(btn);
  }
}

function wireSlider(data) {
  const slider = document.getElementById('threshold');
  const out = document.getElementById('threshold-val');
  const maxVal = Math.max(5, Math.ceil(data.params?.maxItemValue ?? 30));
  threshold = Math.min(data.params?.defaultMinPlat ?? 3, maxVal);

  slider.min = 0;
  slider.max = maxVal;
  slider.step = 1;
  slider.value = threshold;

  const refresh = () => {
    const pct = maxVal > 0 ? (threshold / maxVal) * 100 : 0;
    out.textContent = `${threshold}p`;
    slider.style.background = `linear-gradient(90deg, var(--gold) ${pct}%, var(--line) ${pct}%)`;
  };
  slider.addEventListener('input', () => {
    threshold = Number(slider.value);
    refresh();
    applyFilter();
  });
  refresh();
}

// --- entry ---------------------------------------------------------------

async function main() {
  board = document.getElementById('board');
  let data;
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch {
    board.innerHTML = `<div class="loading">⚠ Could not load data.json — run <code>npm run build</code> first.</div>`;
    return;
  }

  setReadout(data);
  missionsByType = {};
  for (const m of data.missions) (missionsByType[m.type] ||= []).push(m);

  buildTabs(data);
  wireSlider(data);
  selectTab(data.types[0]?.key); // default: first tab (Spy)
}

main();
