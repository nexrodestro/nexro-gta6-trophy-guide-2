[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/nexrodestro/nexro-gta6-trophy-guide-2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/nexrodestro/nexro-gta6-trophy-guide-2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# GTA VI — Trophy Guide & Tracker

An offline web app: a guide + tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Official name, description and grade per trophy, a guide in our own words for each (with sources cited), a saved checklist, export/import, filters, a spoiler setting, a platinum roadmap, and the missable flags.

## What it does

- **All 55 trophies:** 1 Platinum, 2 Gold, 6 Silver, 46 Bronze — names, descriptions and grades match the official list exactly (verified against the kit's reference list). 28 are flagged hidden, 1 is flagged missable.
- **A real guide per trophy:** what to do, where, and when it can be missed — written in our own words, each citing its sources (KeenGamer, PowerPyx, ofzenandcomputing, plus the official descriptions). Trophies whose method is still unconfirmed at launch say so plainly instead of inventing a walkthrough.
- **Tracker:** tick a trophy off and it stays ticked (localStorage). Progress bar + per-grade counts + per-phase counts. Export progress as JSON, import it back, reset when starting over.
- **Filters:** search, grade, kind (story / chapter / mission / side character / activity / collectible / robbery / combat / exploration / misc), roadmap phase, earned vs remaining.
- **Spoiler setting:** on by default — story (hidden) trophies show as "Hidden Trophy" until you earn them, then the guide reveals itself.
- **Platinum roadmap:** Phase 1 story (60–80h) → Phase 2 100% completion (~100h) → Phase 3 cleanup (10–20h). About 200 hours total, difficulty 4/10. One playthrough, no mission replay, no online trophies.
- **The missable one:** Positive Mental Attitude — the Chapter 1 balcony meditation with Lucia. Flagged in the guide and in a warning banner, with the exact steps.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no external fonts or libraries — system fonts only. Screenshots were taken at 1280×800 with a demo checklist (see `shots.py`).

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/dossier.json` plus `out/app` and `out/screenshots`. `main.ts` validates `app/data/trophies.json` (55 trophies, grade split 1/2/6/46, 28 hidden, every guide non-blank and sourced) and the screenshots (3–4, each ≤ 256 KiB) before handing anything in.

## License

MIT — see [LICENSE](LICENSE). No Rockstar Games logo, artwork, or fonts are used.
