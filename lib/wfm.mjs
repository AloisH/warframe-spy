// Minimal warframe.market v2 API client.
//
// Responsibilities:
//   - fetch the tradable item catalogue and build a name -> item index
//   - map a drop-table reward name to a WFM item (or null if not tradable)
//   - fetch the top sell orders for an item and turn them into a plat value
//
// The public API enforces a polite request rate (3 req/s per WFM docs).

const API = 'https://api.warframe.market/v2';

// --- rate limiting -------------------------------------------------------
// WFM allows 3 requests/second. We serialise calls with a minimum gap.
const MIN_GAP_MS = 350; // ~2.85 req/s, comfortably under the limit
let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rateLimited(fn) {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  return fn();
}

async function getJson(path, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await rateLimited(() =>
      fetch(`${API}${path}`, {
        headers: { Platform: 'pc', Crossplay: 'true', Language: 'en' },
      })
    );
    if (res.status === 429 || res.status === 509) {
      // Backoff and retry on rate-limit / too-many-connections.
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`WFM ${path} -> HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(`WFM ${path} -> ${JSON.stringify(body.error)}`);
    return body.data;
  }
  throw new Error(`WFM ${path} -> still rate-limited after ${retries} retries`);
}

const normalise = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Fetch the full tradable-item catalogue and return helpers for matching.
 */
export async function loadCatalogue() {
  const items = await getJson('/items');
  const byName = new Map();
  for (const it of items) {
    const name = it.i18n?.en?.name;
    if (name) byName.set(normalise(name), it);
  }

  /**
   * Resolve a drop-table reward name to a WFM item, or null if not tradable.
   * Drop-table names append "Blueprint" to Warframe components, while WFM
   * usually lists them without it (e.g. "Harrow Systems Blueprint" -> the WFM
   * item is "Harrow Systems"). Non-tradable items (credit/endo caches, regular
   * Warframe parts that aren't on WFM) resolve to null.
   */
  const resolve = (rewardName) => {
    const n = normalise(rewardName);
    if (byName.has(n)) return byName.get(n);
    const stripped = normalise(rewardName.replace(/\s+Blueprint$/i, ''));
    if (byName.has(stripped)) return byName.get(stripped);
    return null;
  };

  return { items, resolve };
}

/**
 * Fetch the top sell orders for an item and compute its raw sell value in
 * platinum (the average of the up to 5 lowest online sell orders).
 *
 * No platinum threshold is applied here — the frontend applies an adjustable
 * minimum-value filter at view time, so we keep the true market value.
 *
 * @param {object} item  a WFM item object (needs `slug` and `tags`)
 * @returns {Promise<{value:number, sellPrices:number[], subtype:string|null}>}
 */
export async function priceItem(item) {
  const isRelic = (item.tags || []).includes('relic');
  // Spy missions drop intact relics, so price the intact subtype only.
  const query = isRelic ? '?subtype=intact' : '';
  const data = await getJson(`/orders/item/${item.slug}/top${query}`);

  let sell = data.sell || [];
  if (isRelic) sell = sell.filter((o) => o.subtype === 'intact');

  // `/top` returns the cheapest online sell orders first (max 5).
  const prices = sell.map((o) => o.platinum).slice(0, 5);
  const avg = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;

  return {
    value: Math.round(avg * 100) / 100,
    sellPrices: prices,
    subtype: isRelic ? 'intact' : null,
  };
}
