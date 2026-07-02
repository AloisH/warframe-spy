# Mission Profit Index

**🌐 Live site: https://aloish.github.io/warframe-spy/**

Ranks Warframe missions by how much **platinum** they're worth to farm, by
combining the official drop table with live [warframe.market](https://warframe.market)
sell prices. Pick a mission type or open-world from the tab bar (Spy, Survival,
Defense, Capture, …, plus Cetus / Orb Vallis / Cambion Drift / Zariman /
Albrecht's Labs / Hex bounties) and that group's missions are ranked against
each other.

A small two-part app:

1. **`build.mjs`** — a Node script that downloads the drop table, parses the
   missions of the curated types, prices every tradable reward on warframe.market,
   and writes `public/data.json`.
2. **`public/`** — a static, dependency-free page that renders `data.json` as a
   tabbed, ranked leaderboard with a per-rotation drop breakdown.

The build runs server-side so visitors never hit warframe.market directly (which
avoids CORS issues and respects the API's 3 req/s rate limit). Pricing ~400 items
takes about **2.5 minutes**.

## How profitability is calculated

- **Item value** = the average of the up to **5 lowest live sell orders** from
  online sellers (`GET /v2/orders/item/{slug}/top`), discarding obvious
  troll/placeholder outliers (any order over 5× the cheapest), priced **as dropped**:
  - Mods & arcanes at **rank 0** (`rank=0`) — a dropped arcane is unranked; the
    maxed rank-5 copies (≈21 fused) sell for far more and would otherwise inflate it.
  - Relics as **intact** (`subtype=intact`).
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
  - **Sabotage Caches** — **plat per full cache run**: the classic star-chart
    sabotage nodes (Cervantes, Gradivus, …) appear in the drop table *only* as
    `<Node> (Caches)` tables, with Rotation A/B/C = the 1st/2nd/3rd hidden cache.
    Opening all three is one roll on each, so the score is `EV(A)+EV(B)+EV(C)`
    (the Spy model). Railjack/Proxima and event caches are excluded.
  - **Assassination** — **plat per boss kill**: the kill reward table *plus* the
    boss's mod drops (from "Mod Drops by Source"), folded into one per-kill source
    where each mod's odds = `item% × mod-table drop chance`. This matters a lot —
    e.g. the Jackal's near-guaranteed Blunderbuss, or Kela De Thaym's clan mods —
    and the assassination reward table alone (non-tradable Warframe parts) would
    badly undersell these missions. Node→boss mapping lives in `ASSASSIN_BOSSES`.
    Bosses whose **Steel Path** version drops a guaranteed Arcane (e.g. Captain
    Vor on SP Mercury) add that as a third source and the metric becomes *plat /
    SP boss kill*. These arcane tables aren't in DE's drop table — they're
    hardcoded from the [WARFRAME wiki](https://wiki.warframe.com/) in
    `SP_BOSS_ARCANES`; add a boss by pasting its table there.
  - **Open-world bounties** (Cetus, Orb Vallis, Cambion Drift, Zariman, Albrecht's
    Labs, Hex) — **plat per full bounty run**: each bounty (level tier, plus
    distinct variants like Ghoul / Isolation Vault / Arcana Vault) is a row. All of
    a rotation's stage rewards are flattened into one list; an item appearing in
    several stages gets its **probability of dropping at least once this run**
    (`1 − Π(1 − p_stage)`, so it never exceeds 100%). Rotations are then weighted by
    the A‑A‑B‑C cycle. Worlds that only list a final-stage reward use that table.
  - **Syndicates** — **plat resale** of each shop offering, with the item's
    **standing cost** shown. Two kinds:
    - the six relay syndicates (Steel Meridian, Arbiters of Hexis, Cephalon Suda,
      The Perrin Sequence, Red Veil, New Loka) sell Warframe/weapon **augment
      mods** at a flat 25,000 standing (offering lists from
      [WFCD warframe-items](https://github.com/WFCD/warframe-items));
    - the hub/relay syndicates (The Quills, Vox Solaris, The Holdfasts,
      Necraloid, Cephalon Simaris, The Hex) sell **arcanes / mods** at
      **variable** per-item standing (transcribed from each syndicate's wiki
      Offerings table).
    Offerings + costs are **hardcoded** in `lib/syndicates.mjs` (each is
    `[item, standing]`); the build only refreshes the warframe.market price and
    zeroes anything not tradable (e.g. Umbral/Sacrificial mods). Ranked by resale
    plat within each syndicate. DE's public manifest does **not** publish
    syndicate offerings or standing costs, hence the hardcoding.
  - **Corrupted Mods** — **plat per Dragon Key** (Orokin Derelict Vault): the
    official drop table's "Derelict Vault" table lists all 24 corrupted mods at
    a flat ~4.17% (1/24) each — it doesn't split the pool by key type (Corrupt
    Charge / Extractor / Isolator / …), so this is modelled as one guaranteed
    reward drawn from the whole pool. Unlike Syndicates, this is parsed directly
    from the drop table (no hardcoding needed).

The curated types and their tab order live in `CURATED_TYPES` / `TYPE_ORDER` in
`build.mjs`. PvP (Conclave), Railjack/Proxima, Duviri, and event one-offs are excluded.

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
lib/parse.mjs      drop-table HTML -> missions, bounties, and by-source drops
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
