// Spy Profit Index — render data.json as a ranked HUD board with a live
// minimum-value filter. Cards are built once; the slider recomputes expected
// platinum, re-ranks (via CSS `order`, so expanded panels stay open), and
// updates every value in place.

const ROTS = ['A', 'B', 'C'];
const fmtPlat = (n) => (Math.round(n * 10) / 10).toFixed(1);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    `Each mission's score is the platinum you'd expect from a <b>full 3-vault clear</b> ` +
    `(one Rotation&nbsp;A + B + C reward), summing <b>drop&nbsp;chance × sell&nbsp;price</b> across every reward. ` +
    `Prices are the <b>average of the 5 lowest live sell orders</b>; relics priced as <b>intact</b>. ` +
    `Use the filter below to ignore low-value rewards not worth a trade slot.`;
}

// --- DOM construction (once) --------------------------------------------

function buildRot(mission, rot) {
  const rewards = mission.rotations[rot];
  if (!rewards) return '';
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
        <span class="rot__name">ROTATION ${rot}</span>
        <span class="rot__ev"><span class="evnum">0.0</span>p <small>/ run</small></span>
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
  el.style.animationDelay = `${Math.min(domIndex * 40, 640)}ms`;
  const tag = mission.isEvent ? '<span class="tag">Event Node</span>' : '';

  el.innerHTML = `
    <div class="mission__head">
      <div class="rank">00</div>
      <div class="info">
        <div class="node">${esc(mission.node || mission.name)} ${tag}</div>
        <div class="planet">${esc(mission.planet)}</div>
      </div>
      <div class="barwrap">
        <div class="bar">
          <span class="bar__seg bar__seg--a"></span>
          <span class="bar__seg bar__seg--b"></span>
          <span class="bar__seg bar__seg--c"></span>
        </div>
        <small></small>
      </div>
      <div class="value-wrap">
        <div class="value">
          <div class="value__num"><span class="vnum">0.0</span><span class="plat">◈</span></div>
          <div class="value__label">PLAT / FULL CLEAR</div>
        </div>
        <span class="chev">▶</span>
      </div>
    </div>
    <div class="detail">${ROTS.map((r) => buildRot(mission, r)).join('')}</div>`;

  el.querySelector('.mission__head').addEventListener('click', () => el.classList.toggle('open'));

  const dropsByRot = {};
  const rotEvEls = {};
  for (const rot of ROTS) {
    const rotEl = el.querySelector(`.rot--${rot.toLowerCase()}`);
    if (!rotEl) continue;
    rotEvEls[rot] = rotEl.querySelector('.evnum');
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
    rankEl: el.querySelector('.rank'),
    vnumEl: el.querySelector('.vnum'),
    barEl: el.querySelector('.bar'),
    segs: { A: el.querySelector('.bar__seg--a'), B: el.querySelector('.bar__seg--b'), C: el.querySelector('.bar__seg--c') },
    smallEl: el.querySelector('.barwrap small'),
    rotEvEls,
    dropsByRot,
    rotEv: {},
    total: 0,
  };
}

// --- live update --------------------------------------------------------

function priceText(d, t) {
  if (!d.tradable) return { txt: '—', cls: 'drop__price drop__price--na', title: 'Not tradable on warframe.market' };
  if (d.value <= 0) return { txt: '—', cls: 'drop__price drop__price--na', title: 'No live sell orders found' };
  if (d.value < t)
    return { txt: `${fmtPlat(d.value)}p`, cls: 'drop__price drop__price--cut', title: `Below the ${t}p filter — counted as 0` };
  return { txt: `${fmtPlat(d.value)}p`, cls: 'drop__price', title: '' };
}

function updateCard(card, t) {
  let total = 0;
  for (const rot of ROTS) {
    const list = card.dropsByRot[rot];
    if (!list) continue;
    let ev = 0;
    for (const dr of list) {
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
    card.rotEv[rot] = ev;
    card.rotEvEls[rot].textContent = fmtPlat(ev);
    total += ev;
  }
  card.total = total;
  card.vnumEl.textContent = fmtPlat(total);
}

function apply(cards, t) {
  let max = 0;
  for (const c of cards) {
    updateCard(c, t);
    if (c.total > max) max = c.total;
  }
  for (const c of cards) {
    const pct = max > 0 ? (c.total / max) * 100 : 0;
    c.barEl.style.width = `${Math.max(pct, 6)}%`;
    for (const rot of ROTS) {
      const seg = c.segs[rot];
      if (!seg) continue;
      const ev = c.rotEv[rot] || 0;
      seg.style.flex = String(ev);
      seg.style.display = ev > 0 ? 'block' : 'none';
    }
    c.smallEl.textContent =
      `A ${fmtPlat(c.rotEv.A || 0)} · B ${fmtPlat(c.rotEv.B || 0)} · C ${fmtPlat(c.rotEv.C || 0)}`;
  }
  // Re-rank: reorder visually via flex `order` (keeps open panels & avoids re-animation).
  [...cards]
    .sort((a, b) => b.total - a.total)
    .forEach((c, i) => {
      c.el.style.order = String(i);
      c.rankEl.textContent = String(i + 1).padStart(2, '0');
      c.el.classList.toggle('is-first', i === 0 && c.total > 0);
    });
}

function wireSlider(cards, data) {
  const slider = document.getElementById('threshold');
  const out = document.getElementById('threshold-val');
  const maxVal = Math.max(5, Math.ceil(data.params?.maxItemValue ?? 30));
  const start = Math.min(data.params?.defaultMinPlat ?? 3, maxVal);

  slider.min = 0;
  slider.max = maxVal;
  slider.step = 1;
  slider.value = start;

  const onInput = () => {
    const t = Number(slider.value);
    out.textContent = `${t}p`;
    const pct = maxVal > 0 ? (t / maxVal) * 100 : 0;
    slider.style.background = `linear-gradient(90deg, var(--gold) ${pct}%, var(--line) ${pct}%)`;
    apply(cards, t);
  };
  slider.addEventListener('input', onInput);
  onInput();
}

// --- entry --------------------------------------------------------------

async function main() {
  const board = document.getElementById('board');
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

  board.innerHTML = '';
  const cards = data.missions.map((m, i) => {
    const card = buildCard(m, i);
    board.appendChild(card.el);
    return card;
  });

  wireSlider(cards, data);
}

main();
