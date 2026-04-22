# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

**Morning Brief** is a single-page financial dashboard deployed on Vercel. It has no build step — the repo is essentially static.

- `public/index.html` — the entire frontend: all HTML, CSS, and JS in one file. This is the main file you'll edit.
- `public/today.json` — daily content written by an external Cowork job each morning. Contains today's architecture feature (building name, writeup, images, coordinates).
- `api/arch.js` — a Vercel serverless function that serves `today.json` with CORS headers. Only exists for cross-origin access.
- `vercel.json` — sets `public/` as the output directory; no rewrites or functions config needed beyond that.

## Data flow

All data fetches happen client-side in `index.html` on page load:

| Section | Source | Notes |
|---|---|---|
| Equities | Twelve Data API (key: `TD_KEY`) | Single shared fetch for 8 symbols, reused for rates context |
| Crypto | CoinGecko `/coins/markets` | BTC, ETH, SOL, DOGE, HYPE |
| Rates | Pensford `quotes.xml` | 5Y/10Y Treasury + 1M Term SOFR |
| News | rss2json.com proxy | Bloomberg, CNBC, FT RSS feeds |
| Architecture | `/api/arch` → `public/today.json` | Written externally each morning |
| Daily quote | Hardcoded array in JS | Seeded by date for consistent daily display |

## Deployment

Push to `main` → Vercel auto-deploys. No build command. The `public/` directory is served directly.

## Key API keys in the frontend

`TD_KEY` (Twelve Data) and `SUPA_KEY`/`SUPA_URL` (Supabase) are embedded directly in `index.html`. These are public/anon keys appropriate for client-side use.
