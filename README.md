# Mission Profit Index

**🌐 Live site: https://aloish.github.io/warframe-spy/**

Ranks Warframe missions by how much **platinum** they're worth to farm, by
combining the official drop table with live [warframe.market](https://warframe.market)
sell prices. Pick a mission type from the tab bar (Spy, Survival, Defense,
Capture, …) and missions of that type are ranked against each other.

A small two-part app:

1. **`build.mjs`** — a Node script that downloads the drop table, parses the
   missions of the curated types, prices every tradable reward on warframe.market,
   and writes `public/data.json`.
2. **`public/`** — a static, dependency-free page that renders `data.json` as a
   tabbed, ranked leaderboard with a per-rotation drop breakdown.

The build runs server-side so visitors never hit warframe.market directly (which
avoids CORS issues and respects the API's 3 req/s rate limit). Pricing ~220 items
takes about **1.5 minutes**.

## How profitability is calculated

- **Item value** = the average of the up to **5 lowest live sell orders** from
  online sellers (`GET /v2/orders/item/{slug}/top`). Relics are priced as
  **intact** (`subtype=intact`), since that's what missions drop.
- Items that aren't tradable on warframe.market (credit/endo/resource caches,
  specter & non-prime Warframe blueprints) count as **0**.
- A **minimum-value filter** (slider on the page) ignores any reward selling below
  *X* platinum — because daily trades are limited, low-value drops aren't worth a
  trade slot. Filtered rewards count as **0**. The default is **3p**.
- **Rotation EV** = Σ (drop chance × item value) for the rewards in that rotation.
- **Mission score** depends on the type, so the number is comparable *within* each
  tab (the unit it represents is shown under the figure):
  - **Spy** — `EV(A) + EV(B) + EV(C)` (you get one reward per vault, 3 per clear).
  - **Endless** (Survival, Defense, Interception, Excavation, Disruption, Defection)
    — expected plat **per reward**, weighting rotations by their A‑A‑B‑C drop
    frequency: `0.5·EV(A) + 0.25·EV(B) + 0.25·EV(C)`.
  - **Single-completion** (Capture, Exterminate, Rescue, Sabotage, Mobile Defense,
    Arena) — `EV` of the single reward you get.
  - **Assassination** — **plat per boss kill**: the kill reward table *plus* the
    boss's mod drops (from "Mod Drops by Source"), folded into one per-kill source
    where each mod's odds = `item% × mod-table drop chance`. This matters a lot —
    e.g. the Jackal's near-guaranteed Blunderbuss, or Kela De Thaym's clan mods —
    and the assassination reward table alone (non-tradable Warframe parts) would
    badly undersell these missions. Node→boss mapping lives in `ASSASSIN_BOSSES`.

The curated types and their tab order live in `CURATED_TYPES` in `build.mjs`.
PvP (Conclave), Railjack, Duviri, sabotage caches and event one-offs are excluded.

`build.mjs` stores **raw** market values, so the slider re-thresholds and re-ranks
everything live in the browser. The slider's starting value is set by the `MIN_PLAT`
env var at build time (default 3).

## Usage

```bash
npm run build      # fetch + price everything -> public/data.json  (~30s)
npm run serve      # serve public/ at http://localhost:8080
# or:
npm start          # build, then serve
```

Re-run `npm run build` whenever you want fresh prices. The drop-table HTML and item
catalogue are cached in `.cache/` for 24h (override with `CACHE_TTL` seconds);
prices are always fetched fresh.

## Layout

```
build.mjs          orchestrator: parse -> price -> write data.json
serve.mjs          tiny zero-dependency static file server
lib/parse.mjs      drop-table HTML -> all missions (type, rotations, drop chances)
lib/wfm.mjs        warframe.market client (rate-limited) + item pricing
public/            index.html, styles.css, app.js, data.json (generated)
```

## Deploy to GitHub Pages

The site is fully static, so GitHub Pages works well. Because `data.json` is a
snapshot, the included workflow (`.github/workflows/deploy.yml`) rebuilds it with
fresh prices and deploys `public/` automatically:

- on every push to `main`,
- every 6 hours (so prices stay current), and
- on demand via **Actions → Run workflow**.

One-time setup after pushing to GitHub: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. All asset paths are relative, so it works under a project
subpath like `https://<user>.github.io/warframe-spy/`.

## Data sources

- Drop table: Digital Extremes' official export
  (`warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/.../...html`).
- Prices: warframe.market v2 API (PC, crossplay enabled).

Not affiliated with Digital Extremes. Drop rates and prices change over time;
re-run the build to refresh.
