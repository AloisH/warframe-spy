// Parse the official Warframe drop-table HTML and extract every mission.
//
// The "Missions:" section is one big <table>. Each mission is introduced by a
// full-width header row, e.g.
//   <tr><th colspan="2">Uranus/Rosalind (Spy)</th></tr>
// optionally followed by rotation header rows
//   <tr><th colspan="2">Rotation A</th></tr>
// and then reward rows
//   <tr><td>Serration</td><td>Rare (8.60%)</td></tr>
// Rows continue until the next mission header. Non-endless missions have no
// rotation headers; their rewards are collected under rotation "A".

const stripTags = (s) => s.replace(/<[^>]*>/g, '').trim();

/**
 * @param {string} html  full drop-table document
 * @returns {Array<{name, type, planet, node, isEvent, rotations}>}
 *   `type` is the trailing parenthetical (Spy, Survival, Defense, …).
 *   `rotations` maps "A"|"B"|"C"|… -> array of { item, chance } (chance 0..1).
 */
export function parseMissions(html) {
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

  return missions.map((m) => {
    // Type = trailing parenthetical, e.g. "Venus/Unda (Spy)" -> "Spy".
    const typeMatch = m.name.match(/\(([^)]+)\)\s*$/);
    const type = typeMatch ? typeMatch[1].trim() : '';
    let clean = m.name.replace(/\s*\([^)]+\)\s*$/, '').trim();
    const isEvent = /^Event:\s*/.test(clean);
    clean = clean.replace(/^Event:\s*/, '');
    const slash = clean.indexOf('/');
    const planet = slash === -1 ? clean : clean.slice(0, slash).trim();
    const node = slash === -1 ? '' : clean.slice(slash + 1).trim();
    return { name: m.name, type, planet, node, isEvent, rotations: m.rotations };
  });
}
