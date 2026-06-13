// Build step: download the drop table, parse Spy missions, price every
// tradable reward on warframe.market, compute per-mission expected platinum,
// and write public/data.json for the static frontend.
//
// Usage: node build.mjs
//
// Tunables (env vars):
//   MIN_PLAT   items whose sell value is below this are treated as 0 (default 3)
//   CACHE_TTL  seconds to reuse the cached drop-table HTML & catalogue (default 86400)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSpyMissions } from './lib/parse.mjs';
import { loadCatalogue, priceItem } from './lib/wfm.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DROP_TABLE_URL =
  'https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html';

const MIN_PLAT = Number(process.env.MIN_PLAT ?? 3);
const CACHE_TTL = Number(process.env.CACHE_TTL ?? 86400) * 1000;

// --- helpers -------------------------------------------------------------

async function cachedText(name, url) {
  const file = path.join(CACHE_DIR, name);
  try {
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs < CACHE_TTL) {
      return fs.readFile(file, 'utf8');
    }
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

// --- main ----------------------------------------------------------------

async function main() {
  console.log('1/4  Loading drop table...');
  const html = await cachedText('droptable.html', DROP_TABLE_URL);
  const missions = parseSpyMissions(html);
  console.log(`     ${missions.length} Spy missions parsed.`);

  console.log('2/4  Loading WFM item catalogue...');
  const { resolve } = await loadCatalogue();

  // Collect every distinct tradable reward across all missions.
  const resolved = new Map(); // rewardName -> item|null
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

  console.log(`3/4  Pricing items on warframe.market (min ${MIN_PLAT}p)...`);
  const valueBySlug = new Map(); // slug -> { value, sellPrices, subtype }
  let done = 0;
  for (const [slug, item] of slugToItem) {
    try {
      valueBySlug.set(slug, await priceItem(item, { minPlat: MIN_PLAT }));
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

  console.log('4/4  Computing expected platinum per mission...');
  const out = missions.map((m) => {
    const rotations = {};
    let totalValue = 0;
    for (const [rot, rewards] of Object.entries(m.rotations)) {
      let ev = 0;
      const detailed = rewards.map((r) => {
        const item = resolved.get(r.item);
        const priced = item ? valueBySlug.get(item.slug) : null;
        const value = priced ? priced.value : 0;
        const contribution = fmt(r.chance * value);
        ev += contribution;
        return {
          item: r.item,
          slug: item?.slug ?? null,
          tradable: Boolean(item),
          chance: fmt(r.chance),
          value,
          sellPrices: priced?.sellPrices ?? [],
          contribution,
        };
      });
      // Sort rewards within a rotation by contribution, biggest first.
      detailed.sort((a, b) => b.contribution - a.contribution);
      rotations[rot] = { ev: fmt(ev), rewards: detailed };
      totalValue += ev;
    }
    return {
      name: m.name,
      planet: m.planet,
      node: m.node,
      isEvent: m.isEvent,
      // Expected platinum from a full 3-vault clear (one A + one B + one C reward).
      totalValue: fmt(totalValue),
      rotations,
    };
  });

  out.sort((a, b) => b.totalValue - a.totalValue);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      dropTable: DROP_TABLE_URL,
      market: 'https://warframe.market (v2 API, PC, crossplay)',
    },
    params: {
      minPlat: MIN_PLAT,
      valueMetric: 'average of up to 5 lowest online sell orders',
      rotationModel: 'full 3-vault clear: totalValue = EV(A) + EV(B) + EV(C)',
      relicSubtype: 'intact',
    },
    missionCount: out.length,
    pricedItemCount: slugToItem.size,
    missions: out,
  };

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(
    path.join(PUBLIC_DIR, 'data.json'),
    JSON.stringify(payload, null, 2)
  );

  console.log('\nDone. Top 5 Spy missions by expected platinum (full clear):');
  for (const m of out.slice(0, 5)) {
    console.log(`  ${m.totalValue.toFixed(1)}p  ${m.name}`);
  }
  console.log('\nWrote public/data.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
