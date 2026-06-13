// Spy Profit Index — render the generated data.json as a ranked HUD board.

const ROTS = ['A', 'B', 'C'];
const fmtPlat = (n) => (Math.round(n * 10) / 10).toFixed(1);
let MIN_PLAT = 3; // overwritten from data.params.minPlat

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
  document.getElementById('r-updated').textContent = timeAgo(data.generatedAt);
  document.getElementById('r-updated').title = new Date(data.generatedAt).toLocaleString();

  document.getElementById('method').innerHTML =
    `Each mission's score is the platinum you'd expect from a <b>full 3-vault clear</b> ` +
    `(one Rotation&nbsp;A + B + C reward), summing <b>drop&nbsp;chance × sell&nbsp;price</b> across every reward. ` +
    `Prices are the <b>average of the 5 lowest live sell orders</b>; anything under ` +
    `<b>${data.params.minPlat}p</b> (or not tradable) counts as 0. Relics priced as <b>intact</b>.`;
}

function rotBar(mission, maxTotal) {
  // Outer width tracks the mission's total vs. the most profitable mission;
  // inner segments are proportional to each rotation's expected value.
  const total = mission.totalValue || 0;
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const segs = ROTS.map((r) => {
    const ev = mission.rotations[r]?.ev || 0;
    if (ev <= 0) return '';
    const w = total > 0 ? (ev / total) * 100 : 0;
    return `<span class="bar__seg bar__seg--${r.toLowerCase()}" style="flex:${w}"
              title="Rotation ${r}: ${fmtPlat(ev)}p"></span>`;
  }).join('');
  return `
    <div class="barwrap">
      <div class="bar" style="width:${Math.max(pct, 6)}%">${segs}</div>
      <small>A ${fmtPlat(mission.rotations.A?.ev || 0)} · B ${fmtPlat(
        mission.rotations.B?.ev || 0
      )} · C ${fmtPlat(mission.rotations.C?.ev || 0)}</small>
    </div>`;
}

function priceCell(d) {
  if (!d.tradable)
    return '<span class="drop__price drop__price--na" title="Not tradable on warframe.market">—</span>';
  if (d.value <= 0)
    return `<span class="drop__price drop__price--na" title="Sells under ${MIN_PLAT}p — counted as 0">&lt;${MIN_PLAT}p</span>`;
  return `<span class="drop__price">${fmtPlat(d.value)}p</span>`;
}

function rotPanel(rot, data) {
  if (!data) return '';
  const drops = data.rewards
    .map((d) => {
      const zero = d.value <= 0 ? ' drop--zero' : '';
      return `<div class="drop${zero}">
          <span class="drop__name" title="${esc(d.item)}">${esc(d.item)}</span>
          ${priceCell(d)}
          <span class="drop__chance">${(d.chance * 100).toFixed(1)}%</span>
          <span class="drop__contrib">${fmtPlat(d.contribution)}p</span>
        </div>`;
    })
    .join('');
  return `
    <div class="rot rot--${rot.toLowerCase()}">
      <div class="rot__head">
        <span class="rot__name">ROTATION ${rot}</span>
        <span class="rot__ev">${fmtPlat(data.ev)}p <small>/ run</small></span>
      </div>
      <div class="drop drop--head" title="Expected value (EV) = sell price each × drop chance">
        <span>Reward</span><span>Each</span><span>Chance</span><span>EV</span>
      </div>
      ${drops}
    </div>`;
}

function missionCard(m, i, maxTotal) {
  const top = i === 0 ? ' mission--top' : '';
  const accent =
    i === 0 ? 'var(--gold)' : 'color-mix(in srgb, var(--gold) 45%, var(--line))';
  const tag = m.isEvent ? '<span class="tag">Event Node</span>' : '';

  const el = document.createElement('article');
  el.className = `mission${top}`;
  el.style.setProperty('--accent', accent);
  el.style.animationDelay = `${Math.min(i * 45, 700)}ms`;

  el.innerHTML = `
    <div class="mission__head">
      <div class="rank">${String(i + 1).padStart(2, '0')}</div>
      <div class="info">
        <div class="node">${esc(m.node || m.name)} ${tag}</div>
        <div class="planet">${esc(m.planet)}</div>
      </div>
      ${rotBar(m, maxTotal)}
      <div style="display:flex;align-items:center;gap:14px;">
        <div class="value">
          <div class="value__num">${fmtPlat(m.totalValue)}<span class="plat">◈</span></div>
          <div class="value__label">PLAT / FULL CLEAR</div>
        </div>
        <span class="chev">▶</span>
      </div>
    </div>
    <div class="detail">
      ${ROTS.map((r) => rotPanel(r, m.rotations[r])).join('')}
    </div>`;

  el.querySelector('.mission__head').addEventListener('click', () =>
    el.classList.toggle('open')
  );
  return el;
}

async function main() {
  const board = document.getElementById('board');
  let data;
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    board.innerHTML = `<div class="loading">⚠ Could not load data.json — run <code>npm run build</code> first.</div>`;
    return;
  }

  MIN_PLAT = data.params?.minPlat ?? MIN_PLAT;
  setReadout(data);
  const maxTotal = Math.max(...data.missions.map((m) => m.totalValue), 1);

  board.innerHTML = '';
  data.missions.forEach((m, i) => board.appendChild(missionCard(m, i, maxTotal)));
}

main();
