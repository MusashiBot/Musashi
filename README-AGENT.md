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

### 2) Verify The SDK And API

Use the built-in smoke test first. It exercises `analyze-text`, `arbitrage`, `movers`, and `feed` in one pass.

```bash
npx tsx test-sdk.ts
```

If `tsx` is already available through your package manager setup, this also works:

```bash
npm exec tsx test-sdk.ts
```

### 3) SDK Example

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

### 4) Run Terminal CLI

```bash
npm run agent
```

Build/start variant:

```bash
npm run agent:build
npm run agent:start
```

### 5) Run The Contract Test Suite

Run the broader API contract test when you want a stronger regression check:

```bash
npm run agent:test:api
```

Common variants:

```bash
# Local API
MUSASHI_API_BASE_URL=http://127.0.0.1:3000 npm run agent:test:api

# Performance coverage
npm run agent:test:api:perf

# Stress coverage
npm run agent:test:api:stress

# Contract + perf + stress
npm run agent:test:api:full
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

## Verification And Testing

### Smoke test

Use this first when you want a quick confidence check:

```bash
npx tsx test-sdk.ts
```

### Contract test

Use this for regular regression checks:

```bash
npm run agent:test:api
```

### Local market-source test

Use this when you want to debug market fetching and cached arbitrage inputs locally without running `vercel dev`:

```bash
npm run agent:test:local:markets
```

What it does:
- Fetches a smaller local sample from Polymarket and Kalshi first
- Loads the shared market cache path used by the API
- Prints combined Polymarket/Kalshi counts
- Runs local arbitrage detection and prints the top few matches

Useful environment variables:

```bash
# Increase source coverage
POLYMARKET_TARGET_COUNT=1200 POLYMARKET_MAX_PAGES=24 \
KALSHI_TARGET_COUNT=1000 KALSHI_MAX_PAGES=30 \
npm run agent:test:local:markets

# Restrict output to one or more category aliases/topics
MARKET_CATEGORIES=bitcoin,jesus npm run agent:test:local:markets

# Local-only Kalshi experiments
ALLOW_KALSHI_NON_BINARY=1 npm run agent:test:local:markets
ALLOW_KALSHI_NON_BINARY=1 EXCLUDE_KALSHI_MVE=0 npm run agent:test:local:markets
```

How to read it:
- `Polymarket fetch: OK (...)` / `Kalshi fetch: OK (...)`: direct client calls are working
- `Combined markets`: the merged count used by the API cache path
- `Kalshi count: 0`: Kalshi fetch failed or returned no retained partial data
- `Arbitrage count: 0`: data loaded, but the matcher did not find valid cross-platform pairs

### Local arbitrage debug

Use this when arbitrage is empty and you want to inspect the best near-miss candidates:

```bash
npm run agent:test:local:arbitrage-debug
```

Useful variants:

```bash
# Include more Kalshi market shapes in local-only debugging
ALLOW_KALSHI_NON_BINARY=1 EXCLUDE_KALSHI_MVE=0 npm run agent:test:local:arbitrage-debug

# Reduce output volume
ARBITRAGE_DEBUG_LIMIT=10 npm run agent:test:local:arbitrage-debug

# Ignore tiny spreads
ARBITRAGE_DEBUG_MIN_SPREAD=0.02 npm run agent:test:local:arbitrage-debug
```

What it prints for each candidate:
- `spread`: absolute YES-price difference
- `titleSim`: title/entity similarity score
- `keywordOverlap`: count of shared filtered keywords
- `sharedEntities`: count of shared extracted entities
- `categoryMatch`: whether both markets landed in the same category
- `blocker`: the main reason the pair did not pass the current matcher

This is the fastest way to distinguish:
- source-coverage problems
- category-mapping problems
- noisy entity overlaps such as common first names
- matcher thresholds that are too strict for the current market mix

Common scenarios:

```bash
# 1) Regular regression check against production.
npm run agent:test:api

# 2) Test a local API before deploy.
MUSASHI_API_BASE_URL=http://127.0.0.1:3000 npm run agent:test:api

# 3) Run performance checks.
# Includes warm-latency sampling and the best-effort cold-start probe.
npm run agent:test:api:perf

# 4) Run stress checks.
# Includes concurrency and burst traffic coverage.
npm run agent:test:api:stress

# 5) Run everything in one pass.
npm run agent:test:api:full

# 6) Performance tuning.
# Increase idle time or sample count for a less noisy cold-start estimate.
MUSASHI_TEST_COLD_IDLE_MS=65000 MUSASHI_TEST_COLD_SAMPLES=3 npm run agent:test:api:perf

# 7) Stress tuning.
# Raise concurrency and burst size when you intentionally want a heavier load.
MUSASHI_TEST_CONCURRENCY=20 MUSASHI_TEST_BURST_REQUESTS=50 npm run agent:test:api:stress

# 8) Slower environments or deployed usage-audit checks.
MUSASHI_TEST_TIMEOUT_MS=30000 npm run agent:test:api
API_USAGE_ADMIN_KEY=your-key npm run agent:test:api
```

What it covers:
- Happy-path checks for `health`, `analyze-text`, `arbitrage`, `movers`, `feed`, `feed/stats`, and `feed/accounts`
- SDK smoke test via `MusashiAgent`
- Public endpoint method matrix checks for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`
- Schema validation for response payloads, array item shapes, timestamps, enums, counts, and filter echoing
- Validation failures such as bad numeric thresholds, invalid categories, invalid urgency, malformed timestamps, duplicate query params, and oversize text
- Hostile-input coverage for empty strings, whitespace-only text, HTML payloads, injection-like payloads, Unicode, control characters, malformed JSON, and wrong content types
- Feed-specific behavior such as cursor pagination, repeated-request stability, cache headers, and oversized or special `x-client-id` values
- Optional usage-audit verification when `API_USAGE_ADMIN_KEY` is present
- Optional performance mode that includes both warm-latency benchmarks and best-effort cold-start probing
- Optional concurrency and burst traffic checks when stress mode is enabled

How to read results:
- `PASS`: endpoint behavior matches the expected contract
- `WARN`: behavior is usable but degraded or environment-dependent (for example upstream `503`)
- `FAIL`: contract mismatch, bad status code, malformed payload, timeout, or network failure

Cold-start note:
- `npm run agent:test:api:perf` includes both warm benchmarks and a best-effort cold-start probe
- The cold-start probe is still a client-side approximation, not proof that the serverless runtime truly cold-started
- The probe waits idle, measures one request, then immediately measures a follow-up request on the same endpoint
- Useful outputs are `cold_avg`, `warm_avg`, and `delta`
- Increase `MUSASHI_TEST_COLD_IDLE_MS` if you want to bias more strongly toward cold-start behavior
- Increase `MUSASHI_TEST_COLD_SAMPLES` for a less noisy average, at the cost of longer runtime

Recommended workflow:
- Use plain `npm run agent:test:api` for regular regression checks
- Use `npm run agent:test:local:markets` before changing fetch limits, cache behavior, or Kalshi filters
- Use `npm run agent:test:local:arbitrage-debug` when `/api/markets/arbitrage` is empty but market counts look healthy
- Use `npm run agent:test:api:perf` when you want both warm-latency and cold-start measurements
- Use `npm run agent:test:api:stress` only when you intentionally want concurrency and burst coverage
- Use `npm run agent:test:api:full` when you want contract, perf, and stress in one run
- Treat repeated `WARN`/`FAIL` results as contract gaps in the deployed API, not as flaky test noise

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

CI / deployment automation:
- GitHub Actions automatically runs `agent:test:api` on `testing` branch pushes and on pull requests
- Successful Vercel preview deployments also trigger `agent:test:api` against the preview `environment_url`, so the deployed build is tested instead of only the default API base URL
- A weekly scheduled workflow runs `agent:test:api:perf`
- `stress` and `full` remain manual-only through workflow dispatch
- Workflow file: `.github/workflows/agent-api-tests.yml`
- If Vercel Deployment Protection is enabled for previews, configure the GitHub secret `VERCEL_AUTOMATION_BYPASS_SECRET` so preview-triggered API tests can bypass the protection layer and hit the deployed API routes directly

Preview vs production deployment notes:
- In GitHub Deployments or Vercel Deployments, look at the deployment environment label: `Preview` means preview, `Production` means production
- To verify whether a specific commit from `main` reached production, match the deployment SHA to the commit SHA on `main`
- Vercel preview deployment success triggers the preview API test automatically
- Production deployments are not auto-tested by the `deployment_status` hook in the current workflow
- To confirm which branch goes to production, check the Vercel project setting for `Production Branch`

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
