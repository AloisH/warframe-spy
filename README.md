# Spy Profit Index

Ranks every Warframe **Spy** mission by how much **platinum** it's worth to farm, by
combining the official drop table with live [warframe.market](https://warframe.market)
sell prices.

A small two-part app:

1. **`build.mjs`** — a Node script that downloads the drop table, parses the Spy
   missions, prices every tradable reward on warframe.market, and writes
   `public/data.json`.
2. **`public/`** — a static, dependency-free page that renders `data.json` as a
   ranked leaderboard with a per-rotation drop breakdown.

The build runs server-side so visitors never hit warframe.market directly (which
avoids CORS issues and respects the API's 3 req/s rate limit).

## How profitability is calculated

- **Item value** = the average of the up to **5 lowest live sell orders** from
  online sellers (`GET /v2/orders/item/{slug}/top`). Relics are priced as
  **intact** (`subtype=intact`), since that's what Spy missions drop.
- Items whose value is **under 3 platinum**, or that aren't tradable on
  warframe.market (credit/endo caches, non-prime Warframe blueprints), count as **0**.
- **Rotation EV** = Σ (drop chance × item value) for the rewards in that rotation.
  Each rotation's chances sum to ~100%, so this is the expected plat from one reward.
- **Mission score** = `EV(A) + EV(B) + EV(C)` — the platinum you'd expect from a
  **full 3-vault clear** (you get one A, one B, and one C reward).

The 3-plat threshold is tunable via the `MIN_PLAT` env var.

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
lib/parse.mjs      drop-table HTML -> Spy missions + rotations + drop chances
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
