# Musashi - AI Trading Intelligence for Prediction Markets

**Transform social signals into profitable trades on Polymarket and Kalshi.**

Musashi is a complete prediction market intelligence platform with:
- 🎯 **Chrome Extension** - Overlay market odds on Twitter/X in real-time
- 🤖 **Agent SDK** - Build automated trading bots in TypeScript/JavaScript
- 🔌 **REST API** - Analyze text, detect arbitrage, track market movers
- ⚡ **Live Data** - Real Polymarket + Kalshi integration with 5-min refresh

---

## Quick Links

- **[Agent SDK Documentation](./README-AGENT.md)** - Build trading bots
- **[REST API Reference](./API-REFERENCE.md)** - API endpoints and examples
- **[Changelog](./CHANGELOG.md)** - Version history and updates

---

## Features

### 🎯 Chrome Extension

- **Automatic Detection**: Scans tweets for prediction market topics
- **Smart Matching**: AI-powered matching with entity extraction (people, tickers, organizations)
- **Trading Signals**: Sentiment analysis, edge calculation, urgency levels
- **Arbitrage Alerts**: Cross-platform price discrepancies (Polymarket vs Kalshi)
- **Market Movers**: Track markets with significant price changes
- **Beautiful Sidebar**: Clean UI with matched markets and live odds

### 🤖 Agent SDK

```typescript
import { MusashiAgent } from './src/sdk/musashi-agent';

const agent = new MusashiAgent();

// Analyze text for trading signals
const signal = await agent.analyzeText('Bitcoin just hit $100k!');
if (signal.urgency === 'critical') {
  console.log('TRADE NOW:', signal.suggested_action);
}

// Monitor arbitrage opportunities
agent.onArbitrage((opps) => {
  for (const arb of opps) {
    if (arb.spread > 0.05) {
      executeTrade(arb);  // 5%+ spread!
    }
  }
}, { minSpread: 0.03 }, 60000);  // Check every minute
```

See [README-AGENT.md](./README-AGENT.md) for full SDK documentation.

### 🔌 REST API

**Base URL**: `https://musashi-api.vercel.app`

```bash
# Analyze text
curl -X POST https://musashi-api.vercel.app/api/analyze-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Fed announces rate cut!"}'

# Get arbitrage opportunities
curl https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.05

# Get market movers
curl https://musashi-api.vercel.app/api/markets/movers?minChange=0.10
```

See [API-REFERENCE.md](./API-REFERENCE.md) for full API documentation.

---

## Installation

### Chrome Extension (End Users)

1. **Download the extension**:
   - Navigate to `C:\Users\rotciv\Desktop\Musashi ai\dist`

2. **Open Chrome Extensions**:
   - Go to `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `dist` folder
   - Musashi should appear in your extensions list

4. **Start using**:
   - Visit Twitter/X (twitter.com or x.com)
   - The sidebar will appear automatically
   - Scroll through your timeline to detect markets

### Agent SDK (Bot Developers)

```bash
# Clone repository
git clone https://github.com/VittorioC13/Musashi.git
cd Musashi

# Copy SDK into your project
cp src/sdk/musashi-agent.ts your-project/

# Or use the REST API directly
curl https://musashi-api.vercel.app/api/analyze-text
```

See [README-AGENT.md](./README-AGENT.md) for bot developer guide.

---

## How It Works

### 1. Text Analysis Pipeline

```
Tweet Text → Keyword Extraction → Entity Recognition → Market Matching → Sentiment Analysis → Edge Calculation → Trading Signal
```

- **Keyword Extraction**: Extract meaningful keywords from text
- **Entity Recognition**: Identify people, organizations, tickers, dates (2x weight boost)
- **Market Matching**: Jaccard similarity + keyword overlap across 1000+ markets
- **Sentiment Analysis**: Bullish/bearish/neutral classification with confidence
- **Edge Calculation**: Compare implied probability vs market price
- **Trading Signal**: Direction (YES/NO/HOLD), confidence, urgency, reasoning

### 2. Arbitrage Detection

```
Polymarket Markets → Match with Kalshi Markets → Calculate Spread → Confidence Filtering → Arbitrage Opportunities
```

- Matches markets across platforms using title similarity + keyword overlap
- Detects price discrepancies (e.g., BTC $100k: 63% on Poly, 70% on Kalshi = 7% spread)
- Returns actionable opportunities with profit potential

### 3. Market Movers Tracking

```
Price Snapshots (hourly) → Historical Comparison → Price Change Detection → Significant Movers
```

- Tracks price history for 7 days (Chrome extension) or 24 hours (API)
- Detects markets with >5% price change in last hour
- Useful for momentum trading and alert systems

---

## Supported Markets

- 🏛️ **US Politics** - Elections, Congress, Presidential actions
- 💰 **Economics** - Fed policy, inflation, unemployment, recession
- 💻 **Technology** - AI regulation, tech earnings, market caps
- ₿ **Crypto** - Bitcoin, Ethereum, ETFs, price predictions
- ⚽ **Sports** - Super Bowl, NBA, major championships
- 🌍 **Geopolitics** - International conflicts, peace deals
- 🎬 **Entertainment** - Oscars, major cultural events
- 🌡️ **Climate** - Temperature records, climate policy

**Total Markets**: 1000+ markets from Polymarket (500+) and Kalshi (400+)

---

## Project Structure

```
Musashi/
├── manifest.json                   # Chrome extension config
├── package.json                    # Dependencies
├── webpack.config.js               # Build configuration
├── vercel.json                     # Vercel API deployment
│
├── README.md                       # This file (project overview)
├── README-AGENT.md                 # Agent SDK documentation
├── API-REFERENCE.md                # REST API documentation
├── CHANGELOG.md                    # Version history
│
├── public/
│   ├── icons/                      # Extension icons
│   └── popup.html                  # Extension popup
│
├── src/
│   ├── sdk/
│   │   └── musashi-agent.ts       # Agent SDK (TypeScript/JavaScript client)
│   │
│   ├── api/
│   │   ├── polymarket-client.ts   # Polymarket Gamma API client
│   │   ├── kalshi-client.ts       # Kalshi REST API client
│   │   ├── arbitrage-detector.ts  # Cross-platform arbitrage detection
│   │   └── price-tracker.ts       # Market movers tracking (Chrome storage)
│   │
│   ├── analysis/
│   │   ├── keyword-matcher.ts     # Keyword extraction and matching
│   │   ├── entity-extractor.ts    # Named entity recognition
│   │   ├── sentiment-analyzer.ts  # Sentiment classification
│   │   ├── signal-generator.ts    # Trading signal generation
│   │   └── analyze-text.ts        # Full analysis pipeline
│   │
│   ├── content/
│   │   ├── content-script.tsx     # Twitter/X content script
│   │   ├── twitter-extractor.ts   # Tweet extraction logic
│   │   └── inject-sidebar.tsx     # Sidebar injection
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx            # Main sidebar UI (React)
│   │   └── MarketCard.tsx         # Market card component
│   │
│   ├── background/
│   │   └── service-worker.ts      # Service worker (messaging, caching, price polling)
│   │
│   └── types/
│       └── market.ts              # TypeScript type definitions
│
├── api/                            # Vercel serverless functions
│   ├── lib/
│   │   └── market-cache.ts        # Shared market cache (5-min TTL)
│   │
│   ├── analyze-text.ts            # POST /api/analyze-text
│   ├── health.ts                  # GET /api/health
│   │
│   └── markets/
│       ├── arbitrage.ts           # GET /api/markets/arbitrage
│       └── movers.ts              # GET /api/markets/movers
│
└── dist/                           # Built extension (generated)
```

---

## Development

### Prerequisites

- Node.js 20+ and npm
- Google Chrome
- Git

### Build Commands

```bash
# Install dependencies
npm install

# Build Chrome extension for production
npm run build

# Build and watch for changes (development)
npm run dev

# Clean build folder
npm run clean
```

### Local API And Matcher Debugging

When you want to debug market fetching or arbitrage matching locally, use the built-in scripts instead of `api:dev`. `npm run api:dev` starts the backend database service on `127.0.0.1:8787`; it does not serve the Vercel-style market endpoints.

```bash
# Local market fetch + cache + arbitrage summary
npm run agent:test:local:markets

# Local arbitrage near-miss debugging
npm run agent:test:local:arbitrage-debug
```

Helpful local-only variants:

```bash
# Expand source coverage
POLYMARKET_TARGET_COUNT=1200 POLYMARKET_MAX_PAGES=24 \
KALSHI_TARGET_COUNT=1000 KALSHI_MAX_PAGES=30 \
npm run agent:test:local:markets

# Only load / inspect selected categories or topic aliases
MARKET_CATEGORIES=bitcoin,jesus npm run agent:test:local:markets

# Include broader Kalshi shapes in local debugging
ALLOW_KALSHI_NON_BINARY=1 EXCLUDE_KALSHI_MVE=0 \
npm run agent:test:local:arbitrage-debug
```

What each script is for:
- `agent:test:local:markets`: verifies Polymarket/Kalshi fetchers, shared cache counts, and local arbitrage output
- `agent:test:local:arbitrage-debug`: prints the strongest near-match pairs and explains why they failed the current matcher

### Making Changes to Extension

1. Edit source files in `src/`
2. Run `npm run build` to rebuild
3. Go to `chrome://extensions`
4. Click reload icon on Musashi card
5. Refresh Twitter/X tab to see changes

### Testing API Endpoints Locally

```bash
# Install Vercel CLI
npm install -g vercel

# Run local development server
vercel dev

# Endpoints available at:
# http://localhost:3000/api/analyze-text
# http://localhost:3000/api/markets/arbitrage
# http://localhost:3000/api/markets/movers
# http://localhost:3000/api/health
```

### Deploying API to Vercel

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Build**: Webpack 5
- **Extension**: Chrome Manifest V3
- **API**: Vercel Serverless Functions
- **Data Sources**: Polymarket Gamma API, Kalshi REST API
- **Caching**: In-memory (5-min TTL), Chrome storage (7-day history)

---

## Performance

- **Tweet Extraction**: <50ms
- **Text Analysis**: <200ms (keyword matching + entity extraction + sentiment)
- **Market Matching**: <100ms (1000+ markets)
- **API Latency**: <500ms (includes market fetching + analysis)
- **Cache Hit Rate**: ~90% (5-min TTL on markets)
- **Price Polling**: ~10 seconds for top 50 markets (5 concurrent requests)

---

## Architecture Highlights

### Signal Quality Improvements (V2)

1. **Entity Extraction**: 2x weight for people/orgs/tickers/dates
2. **Sentiment Analysis**: Bullish/bearish/neutral with confidence scoring
3. **Edge Calculation**: Implied probability vs market price
4. **Urgency Levels**: Critical/high/medium/low based on edge + volume + expiry
5. **HOLD Threshold**: Requires 10%+ edge to suggest trades (reduces false signals)

### Arbitrage Detection

- Matches markets across platforms using title similarity (Jaccard) + keyword overlap
- Configurable thresholds: `minSpread` (default 3%), `minConfidence` (default 50%)
- Returns profit potential and trading direction

### Real-Time Price Polling (Chrome Extension)

- **Lightweight Updates**: Fetches only price data via Polymarket CLOB API (not full market objects)
- **Top Markets**: Polls top 50 markets by volume every 60 seconds
- **Parallel Fetching**: 5 concurrent requests for fast updates (~10 seconds total)
- **Cache Integration**: Updates cached markets with fresh prices
- **Price History**: Snapshots stored in chrome.storage for 7 days
- **Movers Detection**: Real-time detection with actual price changes

**CLOB API**: `GET https://clob.polymarket.com/price?token_id={numericId}`

### Scalability Considerations

- **Market Fetching**: Shared cache across API endpoints (5-min TTL)
- **Arbitrage Matching**: O(n×m) currently, future: category-based filtering for 5-10x speedup
- **Price History**: Chrome storage (7 days), Vercel KV (7 days)
- **Rate Limiting**: None currently, future: Vercel Edge Config

---

## Known Limitations

1. **Sentiment Accuracy**: Naive linear formula (future: scale by source credibility)
2. **Arbitrage Speed**: O(n×m) matching (future: pre-index by category)
3. **No Rate Limiting**: Open API with `Access-Control-Allow-Origin: *` (future: API keys)
4. **Vercel KV Required**: Movers endpoint requires Vercel KV setup (see [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md))

---

## Troubleshooting

### Chrome Extension

**Extension not appearing**
- Ensure Developer mode is enabled
- Load the `dist` folder, not the root folder
- Check for errors in `chrome://extensions`

**Sidebar not showing**
- Open browser console (F12) for errors
- Verify you're on twitter.com or x.com
- Try reloading the extension

**No matches found**
- Tweets must contain relevant keywords
- Try searching for "Bitcoin", "Trump election", or "Fed rates"
- Check console logs to see detection status

### API

**Empty movers response**
- First request after deployment (no price history yet)
- Need 2+ snapshots at least 1 hour apart for movers detection
- Ensure Vercel KV is configured (see [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md))
- Lower `minChange` threshold: `?minChange=0.01`

**Slow arbitrage detection**
- First request fetches markets from Polymarket/Kalshi (~500ms)
- Subsequent requests use cache (<100ms)

**KV connection errors**
- Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set in Vercel dashboard
- Check Vercel logs for detailed error messages

---

## Roadmap

### Completed ✅

- [x] Cross-platform arbitrage detection
- [x] Trading signal generation with sentiment analysis
- [x] Entity extraction (people, orgs, tickers, dates)
- [x] Price tracking and movers detection
- [x] REST API for bot developers
- [x] Agent SDK with polling callbacks
- [x] Real Polymarket + Kalshi integration
- [x] **Vercel KV for movers persistence** (7-day persistent storage)
- [x] **Polymarket CLOB price polling** (real-time price updates every 60s)

### Next Iterations
- [ ] **Category-based arbitrage filtering** (5-10x speedup)
- [ ] **API rate limiting** (Vercel Edge Config or API keys)
- [ ] **Sentiment credibility scaling** (verified accounts, follower count)
- [ ] **Browser notifications** for critical signals
- [ ] **Multi-platform support** (Reddit, news sites, Discord)

---

## Contributing

Currently a solo project by rotciv. Contributions welcome!

---

## License

MIT License

---

## Credits

- **Markets**: Polymarket (https://polymarket.com), Kalshi (https://kalshi.com)
- **Built by**: rotciv + Claude Code
- **Tech**: React, TypeScript, TailwindCSS, Webpack, Vercel

---

**Version**: 2.0.0
**Last Updated**: March 1, 2026
**Status**: ✅ Production Ready

**Get Started**: [Agent SDK Docs](./README-AGENT.md) | [API Reference](./API-REFERENCE.md)
