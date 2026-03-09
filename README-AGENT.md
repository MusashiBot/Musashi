# Musashi Agent Guide

Single source of truth for building and running agents with Musashi.

This guide covers:
- TypeScript SDK (`src/sdk/musashi-agent.ts`)
- Terminal CLI (`npm run agent`)
- Agent-facing API behavior and troubleshooting

## What Musashi Provides

Musashi provides structured prediction-market intelligence from live market + social data:
- Feed of analyzed tweets (`/api/feed`)
- Cross-platform arbitrage opportunities (`/api/markets/arbitrage`)
- Market movers (`/api/markets/movers`)
- Text-to-signal analysis (`/api/analyze-text`)

The Chrome extension is optional UI. Agent integrations should use the SDK or direct API.

## Quick Start

### 1) Install

```bash
npm install
```

### 2) SDK Example

```ts
import { MusashiAgent } from './src/sdk/musashi-agent';

const agent = new MusashiAgent('https://musashi-api.vercel.app');

const [feed, arbs, movers] = await Promise.all([
  agent.getFeed({ limit: 10 }),
  agent.getArbitrage({ minSpread: 0.02, limit: 5 }),
  agent.getMovers({ timeframe: '1h', minChange: 0.05, limit: 5 }),
]);

console.log({ feed: feed.length, arbs: arbs.length, movers: movers.length });
```

### 3) Run Terminal CLI

```bash
npm run agent
```

Build/start variant:

```bash
npm run agent:build
npm run agent:start
```

## SDK Usage

SDK source: `src/sdk/musashi-agent.ts`

### Core methods

- `analyzeText(text, options?)`
- `getArbitrage(options?)`
- `getMovers(options?)`
- `getFeed(options?)`
- `getFeedStats()`
- `getFeedAccounts()`
- `checkHealth()`

### Polling helpers

- `onSignal(callback, text, options?, intervalMs?)`
- `onArbitrage(callback, options?, intervalMs?)`
- `onMovers(callback, options?, intervalMs?)`
- `onFeed(callback, options?, intervalMs?)`

Each returns an unsubscribe function.

## CLI Usage

CLI entry: `cli/index.ts`

### Environment variables

```bash
# Poll every 15s (default: 10000)
MUSASHI_CLI_POLL_MS=15000 npm run agent

# Log lines to show in panel (default: 10)
MUSASHI_CLI_LOG_LINES=20 npm run agent

# Feed page size (default: 10)
MUSASHI_CLI_FEED_LIMIT=20 npm run agent

# Threshold tuning
MUSASHI_CLI_MIN_ARB_SPREAD=0.01 MUSASHI_CLI_MIN_MOVER_CHANGE=0.03 npm run agent
```

### Keyboard

- `Q` / `Ctrl+C`: quit
- `R`: manual refresh

### Behavior notes

- Endpoint failures are not swallowed; each endpoint logs success/failure explicitly.
- Logs panel line count follows `MUSASHI_CLI_LOG_LINES`.
- Poll interval defaults to 10s (increased from older 5s behavior).

## Endpoint Expectations

### `/api/feed`

Returns analyzed tweets. Can be empty (`200`) when no recent matching tweets.

### `/api/feed/stats`

Returns aggregate feed metrics. If this fails while others work, suspect KV/backing-store issues.

### `/api/markets/arbitrage`

`200` with `[]` is valid (no opportunities at current thresholds).

### `/api/markets/movers`

Requires enough price history to produce movers; may be empty even when healthy.

## Troubleshooting

### CLI shows "No data"

Run direct checks:

```bash
curl -i https://musashi-api.vercel.app/api/health
curl -i "https://musashi-api.vercel.app/api/feed?limit=5"
curl -i https://musashi-api.vercel.app/api/feed/stats
curl -i "https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.02"
curl -i "https://musashi-api.vercel.app/api/markets/movers?minChange=0.05"
```

Interpretation:
- `200 + empty array`: healthy but no qualifying data.
- `503/500` with quota-related text: backend storage quota issue.
- local DNS/network failures: client connectivity issue.

### `ts-node` not found

Use:

```bash
npx tsx test-sdk.ts
```

## Repository Pointers

- SDK: `src/sdk/musashi-agent.ts`
- CLI: `cli/`
- Feed API: `api/feed.ts`, `api/feed/stats.ts`, `api/feed/accounts.ts`
- Arbitrage API: `api/markets/arbitrage.ts`
- Movers API: `api/markets/movers.ts`
- Cron collector: `api/cron/collect-tweets.ts`

## Related Docs

- Main project overview: `README.md`
- API details: `API-REFERENCE.md`
- Examples: `docs/examples/python-agent.md`, `docs/examples/nodejs-agent.md`
- Testing checklist: `TESTING_HANDOFF.md`
