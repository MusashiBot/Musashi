# Musashi CLI

Terminal UI for real-time prediction market intelligence. Inspired by PolyDepth.

## Features

- **Real-time Feed**: Latest analyzed tweets from Twitter
- **Arbitrage Opportunities**: Cross-platform price differences (YES/NO split view)
- **Market Movers**: Significant price changes (1h timeframe)
- **Stats Dashboard**: Tweet counts, category breakdown, top markets
- **Activity Logs**: System events and updates

## Installation

```bash
npm install
```

## Usage

### Development (with hot reload)

```bash
npm run agent
```

### Production Build

```bash
npm run agent:build
npm run agent:start
```

## Keyboard Shortcuts

- **Q** or **Ctrl+C**: Quit
- **R**: Manual refresh

## Layout

```
┌─ Header ────────────────────────────────────────┐  4 rows
│  Musashi AI • Real-time Intelligence            │
├─ Feed ──────────────┬─ Arbitrage ───────────────┤  18 rows
│  Latest tweets      │  YES/NO split view        │
│  + matches          │  (PolyDepth style)        │
├─ Movers ────────────┼─ Stats ───────────────────┤  8 rows
│  Price changes      │  Metrics & counts         │
├─ Logs ──────────────────────────────────────────┤  6 rows
│  Activity logs                                   │
└──────────────────────────────────────────────────┘
```

## Configuration

Edit settings in `cli/index.ts`:

```typescript
settings: {
  pollInterval: 5000,      // 5 seconds
  minArbSpread: 0.02,      // 2% minimum spread
  minMoverChange: 0.05,    // 5% minimum price change
  feedLimit: 10,           // tweets to fetch
}
```

## API Endpoints Used

- `GET /api/feed` - Latest analyzed tweets
- `GET /api/feed/stats` - Feed statistics
- `GET /api/markets/arbitrage` - Cross-platform opportunities
- `GET /api/markets/movers` - Price movers

## Requirements

- Terminal with 80x40 minimum size
- Node.js 18+
- Internet connection to Musashi API

## Troubleshooting

**Terminal too small:**
```
Resize your terminal to at least 80 columns x 40 rows
```

**API errors:**
```
Check logs panel for error messages
Press R to retry
```

**No data showing:**
```
Wait ~5 seconds for first poll
Check if API is accessible: https://musashi-api.vercel.app/api/health
```

## Architecture

```
cli/
├── index.ts              # Main app
├── app-state.ts         # State interface
├── utils.ts             # Formatting helpers
└── components/
    ├── base.ts          # Abstract component
    ├── header.ts        # Top banner
    ├── feed-panel.ts    # Tweets
    ├── arbitrage-panel.ts # Cross-platform arbs
    ├── movers-panel.ts  # Price changes
    ├── stats-panel.ts   # Metrics
    └── logs-panel.ts    # Activity logs
```

## Tech Stack

- **blessed**: Terminal UI framework
- **MusashiAgent SDK**: API client
- **TypeScript**: Type safety
- **esbuild**: Fast bundler

## License

MIT
