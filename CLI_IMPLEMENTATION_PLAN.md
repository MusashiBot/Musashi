# Musashi CLI Implementation Plan

**Goal:** Build PolyDepth-style terminal UI for Musashi without changing existing API/SDK

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Musashi CLI (blessed terminal UI)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Main App (cli/index.ts)                               │ │
│  │  - Creates blessed screen                              │ │
│  │  - Manages AppState                                    │ │
│  │  - Polls MusashiAgent SDK every 5s                     │ │
│  │  - Triggers component re-renders                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Components (cli/components/*.ts)                      │ │
│  │  - Header, Feed, Arbitrage, Movers, Stats, Logs       │ │
│  │  - Each implements render(state: AppState)            │ │
│  │  - Declarative: just display data from state          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
         Uses existing MusashiAgent SDK
                          ↓
         Calls existing API endpoints
```

---

## File Structure

```
cli/
├── index.ts                    # Main CLI app (200 lines)
├── app-state.ts               # Shared state interface (50 lines)
├── utils.ts                   # Formatting helpers (150 lines)
├── components/
│   ├── base.ts               # Abstract base component (20 lines)
│   ├── header.ts             # Top banner (40 lines)
│   ├── feed-panel.ts         # Latest tweets + matches (150 lines)
│   ├── arbitrage-panel.ts    # Cross-platform arbs (180 lines)
│   ├── movers-panel.ts       # Price changes (120 lines)
│   ├── stats-panel.ts        # Metrics dashboard (100 lines)
│   └── logs-panel.ts         # Activity logs (80 lines)
└── README.md                  # CLI usage docs

Total: ~1,090 lines of new code
```

---

## Data Flow

```
1. CLI starts → Initialize MusashiAgent SDK
2. Poll loop (every 5s):
   a. agent.getFeed({ limit: 10 })
   b. agent.getArbitrage({ minSpread: 0.02 })
   c. agent.getMovers({ timeframe: '1h' })
   d. agent.getFeedStats()

3. Update AppState with results
4. Trigger render() on all components
5. blessed updates terminal screen
```

---

## AppState Interface

```typescript
// cli/app-state.ts

import type {
  AnalyzedTweet,
  ArbitrageOpportunity,
  MarketMover,
  FeedStats
} from '../src/sdk/musashi-agent';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  message: string;
  level: LogLevel;
  time: string;
}

export interface AppState {
  // Feed data
  feed: AnalyzedTweet[];
  feedStats: FeedStats | null;

  // Arbitrage data
  arbitrage: ArbitrageOpportunity[];

  // Market movers
  movers: MarketMover[];

  // Metadata
  lastUpdate: string;
  isLoading: boolean;
  errors: string[];

  // Logs (last 20 entries)
  logs: LogEntry[];

  // Settings
  settings: {
    pollInterval: number;      // ms
    minArbSpread: number;      // 0.02 = 2%
    minMoverChange: number;    // 0.05 = 5%
    feedLimit: number;         // tweets to show
  };
}
```

---

## Component Layout (Terminal Grid)

```
┌─────────────────────────────────────────────────────────────┐
│  Musashi AI • Real-time Prediction Market Intelligence      │  ← Header (4 rows)
│  API: https://musashi-api.vercel.app • Press Q to quit      │
├────────────────────────┬────────────────────────────────────┤
│  FEED (Latest Tweets)  │  ARBITRAGE OPPORTUNITIES           │
│  ────────────────────  │  ───────────────────────           │  ← Feed (left)
│  @Reuters · 2m ago     │  Bitcoin Up/Down                   │     Arb (right)
│  Russia hits Ukraine   │  ┌─ UP ─────┬─ DOWN ──────┐        │  (18 rows)
│  • 5 markets matched   │  │ Ask: 0.37│ Ask:   0.64 │        │
│  • Urgency: HIGH       │  │ Bid: 0.36│ Bid:   0.63 │        │
│  ────────────────────  │  │ Spread:  │ Spread:     │        │
│  @zerohedge · 5m ago   │  │ VWAP:    │ VWAP:       │        │
│  Bitcoin mooning!      │  └──────────┴─────────────┘        │
│  • 2 markets matched   │  Spread: 5.2% • Edge: $42          │
│  • Urgency: MEDIUM     │  ───────────────────────           │
│  ────────────────────  │  Trump Admin Ends...               │
│  ...                   │  (2 more arbs shown)               │
├────────────────────────┴────────────────────────────────────┤
│  MARKET MOVERS (1h)    │  STATS                             │
│  ────────────────────  │  ─────                             │  ← Movers (left)
│  ↑ Trump Resigns       │  Tweets: 124 (last 24h)           │     Stats (right)
│     +12.3% → 67%       │  Categories:                       │  (8 rows)
│  ↓ BTC $100k by March  │    Politics: 45  Crypto: 31       │
│     -8.1% → 23%        │  Top Market: Iran Strikes (64)     │
├────────────────────────┴────────────────────────────────────┤
│  LOGS                                                        │
│  ─────                                                       │  ← Logs (6 rows)
│  [15:23:45] ✓ Feed updated: 3 new tweets                    │
│  [15:23:40] ⚠ KV quota low (95% used)                       │
│  [15:23:35] ✓ Found arbitrage: 5.2% spread                  │
└─────────────────────────────────────────────────────────────┘

Total height: 40 rows (fits standard 80x40 terminal)
```

---

## Component Specifications

### 1. Header Component

**Position:** Top, 4 rows
**Displays:**
- App title + tagline
- API base URL
- Last update timestamp
- Keyboard shortcuts

```typescript
// cli/components/header.ts
export class Header extends BaseComponent {
  render(state: AppState) {
    const lastUpdate = state.lastUpdate
      ? new Date(state.lastUpdate).toLocaleTimeString()
      : 'Never';

    this.box.setContent(`
{bold}{cyan-fg}Musashi AI{/cyan-fg}{/bold} • Real-time Prediction Market Intelligence
API: https://musashi-api.vercel.app • Last Update: ${lastUpdate} • Press {bold}Q{/bold} to quit
    `.trim());
  }
}
```

---

### 2. Feed Panel Component

**Position:** Left column, rows 4-22 (18 rows)
**Displays:**
- Last 5 tweets from feed
- Author, timestamp, text preview
- Number of matched markets
- Urgency level (color-coded)
- Confidence score

**Layout:**
```
┌─ FEED (Latest Tweets) ─────────────┐
│ @Reuters • 2m ago                   │
│ Russia hits Ukraine with dro...     │
│ → 5 markets • HIGH urgency • 95%   │
│ ────────────────────────────────   │
│ @zerohedge • 5m ago                │
│ Bitcoin just crossed $70k!          │
│ → 2 markets • MEDIUM • 78%         │
│ ...                                 │
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
// cli/components/feed-panel.ts
export class FeedPanel extends BaseComponent {
  render(state: AppState) {
    const tweets = state.feed.slice(0, 5);

    const lines = tweets.flatMap(tweet => {
      const timeAgo = formatTimeAgo(tweet.tweet.created_at);
      const urgencyColor = getUrgencyColor(tweet.urgency);
      const text = truncate(tweet.tweet.text, 40);

      return [
        `{bold}@${tweet.tweet.author}{/bold} • ${timeAgo}`,
        text,
        `→ ${tweet.matches.length} markets • {${urgencyColor}}${tweet.urgency.toUpperCase()}{/${urgencyColor}} • ${Math.round(tweet.confidence * 100)}%`,
        '────────────────────────────────',
      ];
    });

    this.box.setContent(lines.join('\n'));
  }
}
```

---

### 3. Arbitrage Panel Component

**Position:** Right column, rows 4-22 (18 rows)
**Displays:**
- Top 3 arbitrage opportunities
- Each shows: Market title, YES/NO prices (split like PolyDepth)
- Ask/Bid/Spread/VWAP for both sides
- Total spread percentage
- Profit potential

**Layout:**
```
┌─ ARBITRAGE OPPORTUNITIES ──────────┐
│ Bitcoin Up/Down - Feb 28           │
│ ┌─── UP ──────┬─── DOWN ──────┐    │
│ │ Ask:   0.37 │ Ask:     0.64 │    │
│ │ Bid:   0.36 │ Bid:     0.63 │    │
│ │ Spread: 1%  │ Spread:   1%  │    │
│ │ Imbal: -2%  │ Imbal:   +1%  │    │
│ │ VWAP: 0.338 │ VWAP:  0.605  │    │
│ └─────────────┴───────────────┘    │
│ Cross Spread: 5.2% • Profit: $42   │
│ Poly → Kalshi                      │
│ ────────────────────────────────   │
│ (2 more arbs...)                   │
└─────────────────────────────────────┘
```

**Key feature:** Mimic PolyDepth's boxed YES/NO layout

---

### 4. Movers Panel Component

**Position:** Bottom left, rows 22-30 (8 rows)
**Displays:**
- Markets with biggest price changes (1h)
- Direction (↑/↓)
- Percentage change
- Previous → Current price

**Layout:**
```
┌─ MARKET MOVERS (1h) ───────────────┐
│ ↑ Trump Resigns by March           │
│   +12.3% (55% → 67%)               │
│ ↓ Bitcoin $100k by March           │
│   -8.1% (31% → 23%)                │
│ ↑ Russia Ceasefire                 │
│   +6.7% (12% → 19%)                │
└─────────────────────────────────────┘
```

---

### 5. Stats Panel Component

**Position:** Bottom right, rows 22-30 (8 rows)
**Displays:**
- Total tweets in last 24h
- Category breakdown
- Top 3 markets by mentions
- System health (optional)

**Layout:**
```
┌─ STATS ────────────────────────────┐
│ Tweets (24h): 124                  │
│ Categories:                        │
│   Politics: 45  Crypto: 31        │
│   Finance: 28   Sports: 20        │
│                                    │
│ Top Markets:                       │
│   Iran Strikes (64 mentions)      │
│   Trump Admin (29 mentions)       │
└─────────────────────────────────────┘
```

---

### 6. Logs Panel Component

**Position:** Bottom, rows 30-36 (6 rows)
**Displays:**
- Last 5 log entries
- Timestamp + message
- Color-coded by level (info, warn, error, success)

**Layout:**
```
┌─ LOGS ─────────────────────────────┐
│ [15:23:45] ✓ Feed updated: 3 new  │
│ [15:23:40] ⚠ KV quota 95% used    │
│ [15:23:35] ✓ Found arb: 5.2%      │
│ [15:23:30] ✓ Connected to API     │
└─────────────────────────────────────┘
```

---

## Utility Functions (cli/utils.ts)

```typescript
// Time formatting
export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Color helpers
export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'red-fg';
    case 'high': return 'yellow-fg';
    case 'medium': return 'cyan-fg';
    default: return 'white-fg';
  }
}

export function getLogColor(level: LogLevel): string {
  switch (level) {
    case 'error': return 'red-fg';
    case 'warn': return 'yellow-fg';
    case 'success': return 'green-fg';
    default: return 'white-fg';
  }
}

// Number formatting
export function formatPrice(price: number): string {
  return (price * 100).toFixed(1) + '%';
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${Math.round(volume / 1_000)}K`;
  return `$${Math.round(volume)}`;
}

export function formatSpread(spread: number): string {
  return (spread * 100).toFixed(1) + '%';
}

// Text helpers
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

export function padRight(text: string, width: number): string {
  return text.padEnd(width, ' ');
}

export function padLeft(text: string, width: number): string {
  return text.padStart(width, ' ');
}
```

---

## Main App Implementation (cli/index.ts)

```typescript
import blessed from 'blessed';
import { MusashiAgent } from '../src/sdk/musashi-agent';
import { AppState, LogLevel } from './app-state';
import { BaseComponent } from './components/base';
import { Header } from './components/header';
import { FeedPanel } from './components/feed-panel';
import { ArbitragePanel } from './components/arbitrage-panel';
import { MoversPanel } from './components/movers-panel';
import { StatsPanel } from './components/stats-panel';
import { LogsPanel } from './components/logs-panel';

class MusashiCLI {
  private screen: blessed.Widgets.Screen;
  private agent: MusashiAgent;
  private state: AppState;
  private components: BaseComponent[] = [];
  private pollTimer?: NodeJS.Timeout;

  constructor() {
    // Initialize blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Musashi AI',
      fullUnicode: true,
    });

    // Initialize SDK
    this.agent = new MusashiAgent();

    // Initialize state
    this.state = {
      feed: [],
      feedStats: null,
      arbitrage: [],
      movers: [],
      lastUpdate: '',
      isLoading: false,
      errors: [],
      logs: [],
      settings: {
        pollInterval: 5000,      // 5 seconds
        minArbSpread: 0.02,      // 2%
        minMoverChange: 0.05,    // 5%
        feedLimit: 10,
      },
    };

    // Create components
    this.components = [
      new Header(this.screen),
      new FeedPanel(this.screen),
      new ArbitragePanel(this.screen),
      new MoversPanel(this.screen),
      new StatsPanel(this.screen),
      new LogsPanel(this.screen),
    ];

    // Keyboard shortcuts
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.addLog('Manual refresh triggered', 'info');
      this.poll();
    });
  }

  // Update state and trigger re-render
  updateState(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  // Render all components
  render() {
    this.components.forEach(c => c.render(this.state));
    this.screen.render();
  }

  // Add log entry
  addLog(message: string, level: LogLevel = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { message, level, time: timestamp };

    const newLogs = [...this.state.logs, entry].slice(-20); // Keep last 20
    this.updateState({ logs: newLogs });
  }

  // Poll API for updates
  async poll() {
    try {
      this.updateState({ isLoading: true });

      // Parallel fetch (fast!)
      const [feed, feedStats, arbitrage, movers] = await Promise.all([
        this.agent.getFeed({ limit: this.state.settings.feedLimit }),
        this.agent.getFeedStats(),
        this.agent.getArbitrage({
          minSpread: this.state.settings.minArbSpread,
          limit: 5,
        }),
        this.agent.getMovers({
          timeframe: '1h',
          minChange: this.state.settings.minMoverChange,
          limit: 5,
        }),
      ]);

      // Update state
      this.updateState({
        feed,
        feedStats,
        arbitrage,
        movers,
        lastUpdate: new Date().toISOString(),
        isLoading: false,
        errors: [],
      });

      // Log success
      const newTweets = feed.length;
      const newArbs = arbitrage.length;
      if (newTweets > 0 || newArbs > 0) {
        this.addLog(`Updated: ${newTweets} tweets, ${newArbs} arbs`, 'success');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({
        isLoading: false,
        errors: [errorMsg],
      });
      this.addLog(`Error: ${errorMsg}`, 'error');
    }
  }

  // Start polling loop
  start() {
    this.addLog('Musashi CLI started', 'success');
    this.addLog(`Polling every ${this.state.settings.pollInterval / 1000}s`, 'info');

    // Initial poll
    this.poll();

    // Start interval
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.state.settings.pollInterval);
  }

  // Stop polling
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.addLog('Musashi CLI stopped', 'info');
  }
}

// ===== Main Entry Point =====

async function main() {
  const cli = new MusashiCLI();
  cli.start();
}

main().catch(console.error);
```

---

## Optimizations

### 1. **Efficient Rendering**
- Only re-render when state changes
- Use blessed's `smartCSR` (reduces flicker)
- Debounce rapid updates

### 2. **Parallel Data Fetching**
```typescript
// ✅ FAST: Parallel (300ms total)
const [feed, arbs, movers] = await Promise.all([
  agent.getFeed(),
  agent.getArbitrage(),
  agent.getMovers(),
]);

// ❌ SLOW: Sequential (900ms total)
const feed = await agent.getFeed();    // 300ms
const arbs = await agent.getArbitrage(); // 300ms
const movers = await agent.getMovers();  // 300ms
```

### 3. **Smart Polling**
- Default 5s interval (balanced)
- Skip poll if previous still running
- Exponential backoff on errors

### 4. **Memory Management**
- Limit logs to last 20 entries
- Limit feed to last 10 tweets
- Clear old data on each poll

### 5. **Color Optimization**
- Pre-compute colors in utils
- Use blessed tags for fast rendering
- Minimize string operations in render loop

---

## Build Configuration

### package.json updates:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "agent": "tsx cli/index.ts",
    "agent:build": "esbuild cli/index.ts --bundle --platform=node --outfile=dist/agent.js",
    "agent:start": "node dist/agent.js"
  },
  "bin": {
    "musashi-agent": "./dist/agent.js"
  },
  "dependencies": {
    "blessed": "^0.1.81"
  },
  "devDependencies": {
    "@types/blessed": "^0.1.27",
    "esbuild": "^0.27.3"
  }
}
```

### Build process:
```bash
# Development (hot reload)
npm run agent

# Production build
npm run agent:build

# Run production
npm run agent:start

# Or install globally
npm install -g .
musashi-agent
```

---

## Testing Plan

### Manual Testing Checklist:
- [ ] CLI starts without errors
- [ ] All panels render correctly
- [ ] Feed shows latest tweets
- [ ] Arbitrage shows YES/NO split correctly
- [ ] Movers show price changes
- [ ] Stats display accurately
- [ ] Logs scroll properly
- [ ] Press 'Q' exits cleanly
- [ ] Press 'R' refreshes manually
- [ ] No memory leaks after 5 min
- [ ] Handles API errors gracefully
- [ ] Terminal resize works

### Performance Benchmarks:
- Initial render: < 500ms
- Poll interval: 5s
- Render time: < 50ms
- Memory usage: < 50MB
- No flickering or artifacts

---

## Future Enhancements (v2)

1. **Interactive Mode**
   - Arrow keys to navigate
   - Enter to open market URL
   - Filter by category

2. **Advanced Stats**
   - Candlestick charts (blessed-contrib)
   - Historical price trends
   - Sentiment heatmap

3. **Notifications**
   - Sound alerts on critical signals
   - Desktop notifications
   - Webhook integration

4. **Configuration**
   - CLI flags (--interval, --min-spread)
   - Config file (~/.musashirc)
   - Multiple profiles

5. **Export Data**
   - CSV export
   - JSON streaming
   - WebSocket server mode

---

## Success Metrics

**v1 Launch Goals:**
- ✅ 100% feature parity with PolyDepth layout
- ✅ < 500ms cold start
- ✅ < 5s poll interval
- ✅ 0 crashes in 1-hour test
- ✅ Clean terminal output (80x40)
- ✅ Intuitive keyboard shortcuts

---

## Timeline Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Setup + base component | 30 min |
| 2 | Header + Logs panels | 20 min |
| 3 | Feed panel | 40 min |
| 4 | Arbitrage panel (complex) | 60 min |
| 5 | Movers + Stats panels | 40 min |
| 6 | Main app + polling logic | 40 min |
| 7 | Utils + formatting | 30 min |
| 8 | Testing + bug fixes | 40 min |
| **Total** | | **~5 hours** |

---

## Key Design Decisions

1. **Why blessed?**
   - Mature, stable, PolyDepth uses it
   - Rich widget library
   - Cross-platform

2. **Why not Ink (React)?**
   - Heavier (~2MB bundle)
   - blessed more suitable for dashboards
   - PolyDepth proves blessed works well

3. **Why 5s poll interval?**
   - Balance freshness vs API load
   - Feed updates every 2 min (cron)
   - 5s feels responsive without spam

4. **Why parallel fetching?**
   - 4 endpoints × 300ms = 1.2s sequential
   - Parallel = 300ms (4x faster!)
   - Critical for smooth UX

---

## Dependencies

```json
{
  "blessed": "^0.1.81",           // Terminal UI framework
  "@types/blessed": "^0.1.27",    // TypeScript types
  "esbuild": "^0.27.3",           // Fast bundler
  "tsx": "^4.21.0"                // TS executor (dev)
}
```

**Total bundle size:** ~800KB (blessed) + ~50KB (our code) = **~850KB**

---

## Summary

This plan delivers a production-ready PolyDepth-style terminal UI for Musashi in ~5 hours with:

✅ **Zero changes** to existing API/SDK
✅ **1,090 lines** of clean, modular code
✅ **6 components** (Header, Feed, Arb, Movers, Stats, Logs)
✅ **Real-time updates** every 5s
✅ **Optimized rendering** with blessed
✅ **Professional layout** (80x40 terminal)
✅ **Error handling** + graceful degradation
✅ **Easy deployment** (npm run agent)

Ready to implement? 🚀
