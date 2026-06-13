// Parse the official Warframe drop-table HTML and extract Spy missions.
//
// The "Missions:" section is a single big <table>. Each mission is introduced
// by a full-width header row, e.g.
//   <tr><th colspan="2">Uranus/Rosalind (Spy)</th></tr>
// followed by rotation header rows
//   <tr><th colspan="2">Rotation A</th></tr>
// and then reward rows
//   <tr><td>Serration</td><td>Rare (8.60%)</td></tr>
// Rows continue until the next mission header.

const stripTags = (s) => s.replace(/<[^>]*>/g, '').trim();

/**
 * @param {string} html  full drop-table document
 * @returns {Array<{name:string, planet:string, node:string, rotations:Object}>}
 *   one entry per Spy mission. `rotations` maps "A"|"B"|"C" -> array of
 *   { item, chance } where chance is a fraction (0..1).
 */
export function parseSpyMissions(html) {
  const start = html.indexOf('id="missionRewards"');
  const end = html.indexOf('id="relicRewards"');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate the Missions section in the drop table.');
  }
  const section = html.slice(start, end);

  const rows = [...section.matchAll(/<tr>(.*?)<\/tr>/gs)].map((m) => m[1]);

  const missions = [];
  let current = null;
  let rotation = null;

  for (const row of rows) {
    const th = row.match(/<th[^>]*>(.*?)<\/th>/s);
    if (th) {
      const label = stripTags(th[1]);
      const rotMatch = label.match(/^Rotation\s+([A-Z])$/);
      if (rotMatch) {
        rotation = rotMatch[1];
      } else {
        // New mission header.
        current = { name: label, rotations: {} };
        missions.push(current);
        rotation = null;
      }
      continue;
    }

    const tds = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => stripTags(m[1]));
    if (tds.length === 2 && current) {
      const item = tds[0];
      const pct = tds[1].match(/([\d.]+)\s*%/);
      const chance = pct ? parseFloat(pct[1]) / 100 : 0;
      const rot = rotation || 'A';
      (current.rotations[rot] ||= []).push({ item, chance });
    }
  }

  // Keep only Spy missions and normalise their names.
  return missions
    .filter((m) => /\(Spy\)/.test(m.name))
    .map((m) => {
      // e.g. "Event: Venus/Vesper (Spy)" -> planet "Venus", node "Vesper"
      const clean = m.name.replace(/\s*\(Spy\)\s*$/, '');
      const isEvent = /^Event:\s*/.test(clean);
      const core = clean.replace(/^Event:\s*/, '');
      const [planet, node] = core.split('/').map((s) => s.trim());
      return {
        name: m.name,
        planet: planet || core,
        node: node || '',
        isEvent,
        rotations: m.rotations,
      };
    });
}
