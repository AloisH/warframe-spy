// Build step: download the drop table, parse missions of the curated types,
// price every tradable reward on warframe.market, and write public/data.json.
//
// Item values are stored RAW (avg of the 5 lowest online sell orders); the
// frontend applies an adjustable minimum-value filter live.
//
// Profitability metric (per mission, comparable WITHIN a type via the tabs):
//   - Spy:                total = EV(A) + EV(B) + EV(C)   (one reward per vault)
//   - Endless (A/B/C…):   total = weighted avg per reward, A-A-B-C frequency
//                         (A counts double), i.e. 0.5·A + 0.25·B + 0.25·C
//   - Single-completion:  total = EV(A)                    (one reward per run)
//
// Usage: node build.mjs
// Env: MIN_PLAT (default 3, slider start), CACHE_TTL (seconds, default 86400)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMissions } from './lib/parse.mjs';
import { loadCatalogue, priceItem } from './lib/wfm.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DROP_TABLE_URL =
  'https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html';

const DEFAULT_MIN_PLAT = Number(process.env.MIN_PLAT ?? 3);
const CACHE_TTL = Number(process.env.CACHE_TTL ?? 86400) * 1000;

// Curated, recognizable PvE mission types (tab order). Spy first (the original).
const CURATED_TYPES = [
  'Spy', 'Survival', 'Defense', 'Interception', 'Excavation', 'Disruption', 'Defection',
  'Capture', 'Exterminate', 'Rescue', 'Sabotage', 'Mobile Defense', 'Assassination', 'Arena',
];
const CURATED = new Set(CURATED_TYPES);

// --- helpers -------------------------------------------------------------

async function cachedText(name, url) {
  const file = path.join(CACHE_DIR, name);
  try {
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) return fs.readFile(file, 'utf8');
  } catch {
    /* not cached yet */
  }
  process.stdout.write(`  downloading ${url.slice(0, 60)}...\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const text = await res.text();
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, text);
  return text;
}

const fmt = (n) => Math.round(n * 100) / 100;

// A-A-B-C reward frequency; A appears twice as often in the rotation cycle.
const ROT_FREQ = { A: 2, B: 1, C: 1, D: 1, E: 1 };

// Per-mission weighting of each rotation toward "expected plat per reward".
function rotationWeights(type, rotKeys) {
  if (type === 'Spy') return Object.fromEntries(rotKeys.map((k) => [k, 1])); // sum of 3 vaults
  const present = rotKeys.filter((k) => ROT_FREQ[k] != null);
  const sum = present.reduce((s, k) => s + ROT_FREQ[k], 0) || 1;
  return Object.fromEntries(rotKeys.map((k) => [k, (ROT_FREQ[k] || 0) / sum]));
}

function metricLabel(type, rotKeys) {
  if (type === 'Spy') return 'plat / full clear';
  return rotKeys.length <= 1 ? 'plat / reward' : 'avg plat / reward';
}

const evAt = (rewards, t) =>
  rewards.reduce((s, r) => s + r.chance * (r.value >= t ? r.value : 0), 0);
const totalAt = (m, t) =>
  Object.entries(m.rotations).reduce((s, [k, rw]) => s + (m.weights[k] || 0) * evAt(rw, t), 0);

// --- main ----------------------------------------------------------------

async function main() {
  console.log('1/4  Loading drop table...');
  const html = await cachedText('droptable.html', DROP_TABLE_URL);
  const all = parseMissions(html);
  const missions = all.filter((m) => CURATED.has(m.type));
  console.log(`     ${missions.length} missions across ${CURATED.size} curated types.`);

  console.log('2/4  Loading WFM item catalogue...');
  const { resolve } = await loadCatalogue();

  const resolved = new Map();
  const slugToItem = new Map();
  for (const m of missions) {
    for (const rewards of Object.values(m.rotations)) {
      for (const r of rewards) {
        if (!resolved.has(r.item)) {
          const item = resolve(r.item);
          resolved.set(r.item, item);
          if (item) slugToItem.set(item.slug, item);
        }
      }
    }
  }
  console.log(`     ${slugToItem.size} unique tradable items to price.`);

  console.log('3/4  Pricing items on warframe.market...');
  const valueBySlug = new Map();
  let done = 0;
  for (const [slug, item] of slugToItem) {
    try {
      valueBySlug.set(slug, await priceItem(item));
    } catch (err) {
      console.warn(`     ! ${slug}: ${err.message}`);
      valueBySlug.set(slug, { value: 0, sellPrices: [], subtype: null });
    }
    done++;
    if (done % 10 === 0 || done === slugToItem.size) {
      process.stdout.write(`     ${done}/${slugToItem.size}\r`);
    }
  }
  process.stdout.write('\n');

  console.log('4/4  Assembling mission data...');
  const out = missions.map((m) => {
    const rotKeys = Object.keys(m.rotations).sort();
    const weights = rotationWeights(m.type, rotKeys);
    const rotations = {};
    for (const [rot, rewards] of Object.entries(m.rotations)) {
      rotations[rot] = rewards
        .map((r) => {
          const item = resolved.get(r.item);
          const priced = item ? valueBySlug.get(item.slug) : null;
          return {
            item: r.item,
            slug: item?.slug ?? null,
            tradable: Boolean(item),
            chance: fmt(r.chance),
            value: priced ? priced.value : 0,
          };
        })
        .sort((a, b) => b.value - a.value || b.chance - a.chance);
    }
    return {
      name: m.name,
      type: m.type,
      planet: m.planet,
      node: m.node,
      isEvent: m.isEvent,
      metricLabel: metricLabel(m.type, rotKeys),
      weights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, fmt(v)])),
      rotations,
    };
  });

  // Tidy JSON order: curated type order, then by value within type.
  out.sort(
    (a, b) =>
      CURATED_TYPES.indexOf(a.type) - CURATED_TYPES.indexOf(b.type) ||
      totalAt(b, DEFAULT_MIN_PLAT) - totalAt(a, DEFAULT_MIN_PLAT)
  );

  const typeList = CURATED_TYPES.filter((t) => out.some((m) => m.type === t)).map((t) => ({
    key: t,
    label: t,
    count: out.filter((m) => m.type === t).length,
  }));

  const maxItemValue = Math.max(
    0,
    ...out.flatMap((m) => Object.values(m.rotations).flat().map((r) => r.value))
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      dropTable: DROP_TABLE_URL,
      market: 'https://warframe.market (v2 API, PC, crossplay)',
    },
    params: {
      defaultMinPlat: DEFAULT_MIN_PLAT,
      maxItemValue: fmt(maxItemValue),
      valueMetric: 'average of up to 5 lowest online sell orders (raw, unfiltered)',
      model: 'Spy = EV(A)+EV(B)+EV(C); endless = A-A-B-C weighted plat/reward; single = EV(A)',
      relicSubtype: 'intact',
    },
    types: typeList,
    missionCount: out.length,
    pricedItemCount: slugToItem.size,
    missions: out,
  };

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_DIR, 'data.json'), JSON.stringify(payload, null, 2));

  console.log(`\nDone. ${out.length} missions, ${typeList.length} types. Top per type (filter ${DEFAULT_MIN_PLAT}p):`);
  for (const t of typeList) {
    const top = out
      .filter((m) => m.type === t.key)
      .sort((a, b) => totalAt(b, DEFAULT_MIN_PLAT) - totalAt(a, DEFAULT_MIN_PLAT))[0];
    console.log(`  ${t.label.padEnd(15)} ${totalAt(top, DEFAULT_MIN_PLAT).toFixed(1)}p  ${top.planet}/${top.node}`);
  }
  console.log('\nWrote public/data.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
