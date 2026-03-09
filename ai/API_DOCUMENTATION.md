# Musashi API - Intelligence for AI Trading Agents

**Build prediction market trading agents powered by real-time social intelligence.**

The Musashi API provides multiple endpoints for analyzing text, detecting arbitrage, tracking market movers, and accessing a curated feed of analyzed tweets from 71 high-signal accounts across 8 categories.

---

## Why Musashi API?

**For AI Trading Agents:**
- ⚡ **Sub-200ms analysis** - Get market matches in <200ms
- 🎯 **900+ markets** - 500+ Polymarket + 400+ Kalshi markets
- 📊 **Structured JSON output** - Machine-readable, agent-friendly format
- 🔄 **Real-time intelligence** - Live CLOB API price updates every 60s
- 🤖 **Agent-first design** - Built for programmatic access
- 📡 **Automated feed** - 71 monitored accounts, updates every 2 minutes
- 🎲 **Trading signals** - Sentiment, confidence, urgency levels

**Use Cases:**
- Agent monitors Twitter feed → Detects opportunities → Trades automatically
- Arbitrage detector → Find price discrepancies across platforms
- Market movers tracker → Identify markets with significant price changes
- Feed aggregator → Access pre-analyzed tweets with market matches
- Chatbot → Suggests relevant markets based on conversation

---

## API Endpoints

### Text Analysis

#### POST /api/analyze-text
Analyzes text and returns matching markets with trading signals.

**Request Body:**
```json
{
  "text": "The Fed is likely to cut interest rates in March after inflation cooled to 2.9%",
  "minConfidence": 0.25,
  "maxResults": 5
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | ✅ Yes | - | Text to analyze (tweet, article, message, etc.) |
| `minConfidence` | number | ❌ No | 0.25 | Minimum confidence threshold (0.0-1.0) |
| `maxResults` | number | ❌ No | 5 | Maximum number of markets to return |

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [
      {
        "market": {
          "id": "kalshi-fed-rate-cut",
          "platform": "kalshi",
          "title": "Will the Fed cut interest rates in March 2026?",
          "description": "Resolves Yes if the Federal Reserve cuts the federal funds rate at their March 2026 meeting.",
          "keywords": ["fed", "federal reserve", "interest rate", "rate cut", "fomc", "jerome powell"],
          "yesPrice": 0.72,
          "noPrice": 0.28,
          "volume24h": 389000,
          "url": "https://kalshi.com/markets",
          "category": "economics",
          "lastUpdated": "2026-03-08T10:30:00Z"
        },
        "confidence": 0.87,
        "matchedKeywords": ["fed", "interest rate", "rate cut", "inflation"],
        "sentiment": "bullish",
        "signal": {
          "direction": "YES",
          "confidence": 0.87,
          "edge": 0.12,
          "urgency": "high",
          "type": "news_event",
          "reasoning": "Strong keyword match + bullish sentiment on rate cut"
        }
      }
    ],
    "matchCount": 1,
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}
```

---

### Arbitrage Detection

#### GET /api/markets/arbitrage
Detects price discrepancies between Polymarket and Kalshi for the same events.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minSpread` | number | 0.03 | Minimum price spread (0.03 = 3%) |
| `minConfidence` | number | 0.50 | Minimum match confidence |
| `limit` | number | 10 | Maximum results to return |
| `category` | string | - | Filter by category (optional) |

**Example:**
```
GET /api/markets/arbitrage?minSpread=0.05&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "polymarketMarket": {
          "id": "poly-btc-100k",
          "title": "Will Bitcoin reach $100k in 2026?",
          "yesPrice": 0.63,
          "volume24h": 450000
        },
        "kalshiMarket": {
          "id": "kalshi-btc-100k",
          "title": "BTC above $100k by Dec 2026?",
          "yesPrice": 0.70,
          "volume24h": 280000
        },
        "spread": 0.07,
        "direction": "buy_poly_sell_kalshi",
        "profitPotential": "7%",
        "matchConfidence": 0.82,
        "category": "crypto"
      }
    ],
    "count": 1,
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}
```

---

### Market Movers

#### GET /api/markets/movers
Returns markets with significant price changes in the last 1h or 24h.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeframe` | string | "1h" | Time window ("1h" or "24h") |
| `minChange` | number | 0.05 | Minimum price change (0.05 = 5%) |
| `limit` | number | 20 | Maximum results to return |
| `platform` | string | - | Filter by platform ("polymarket" or "kalshi") |

**Example:**
```
GET /api/markets/movers?timeframe=1h&minChange=0.10&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "movers": [
      {
        "market": {
          "id": "poly-trump-2024",
          "platform": "polymarket",
          "title": "Trump wins 2024 election?",
          "yesPrice": 0.89,
          "previousPrice": 0.77,
          "volume24h": 2400000,
          "url": "https://polymarket.com/market/...",
          "category": "politics"
        },
        "priceChange1h": 0.12,
        "priceChange24h": 0.23,
        "percentChange1h": "15.6%",
        "percentChange24h": "34.8%",
        "direction": "up"
      }
    ],
    "count": 1,
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}
```

---

### Feed System

#### GET /api/feed
Returns analyzed tweets from 71 monitored high-signal accounts.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of tweets to return |
| `category` | string | - | Filter by category |
| `minUrgency` | string | - | Filter by minimum urgency level |
| `since` | string | - | ISO timestamp for tweets after this time |
| `cursor` | string | - | Pagination cursor |

**Categories:** `crypto`, `politics`, `economics`, `tech`, `sports`, `geopolitics`, `finance`, `breaking_news`

**Urgency Levels:** `critical`, `high`, `medium`, `low`

**Example:**
```
GET /api/feed?limit=10&category=crypto&minUrgency=high
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tweets": [
      {
        "id": "1234567890",
        "text": "Bitcoin just crossed $100k for the first time in history",
        "author": {
          "username": "BitcoinMagazine",
          "category": "crypto"
        },
        "timestamp": "2026-03-08T10:25:00Z",
        "analysis": {
          "markets": [
            {
              "market": {
                "id": "poly-btc-100k",
                "title": "Will Bitcoin reach $100k in 2026?",
                "yesPrice": 0.95,
                "platform": "polymarket"
              },
              "confidence": 0.98,
              "sentiment": "bullish",
              "signal": {
                "direction": "YES",
                "urgency": "critical",
                "type": "news_event"
              }
            }
          ],
          "sentiment": "bullish",
          "urgency": "critical"
        }
      }
    ],
    "count": 1,
    "nextCursor": "eyJpZCI6MTIzNDU2Nzg5MH0=",
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}
```

---

#### GET /api/feed/stats
Returns statistics about the feed system.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTweets": 1247,
    "last24h": 342,
    "lastHour": 15,
    "byCategory": {
      "crypto": 523,
      "politics": 398,
      "economics": 201,
      "tech": 89,
      "sports": 24,
      "geopolitics": 8,
      "finance": 3,
      "breaking_news": 1
    },
    "topMarkets": [
      {
        "marketId": "poly-trump-2024",
        "mentions": 67,
        "title": "Trump wins 2024 election?"
      }
    ],
    "topAccounts": [
      {
        "username": "elonmusk",
        "category": "crypto",
        "tweets": 23
      }
    ],
    "lastUpdate": "2026-03-08T10:30:00Z"
  }
}
```

---

#### GET /api/feed/accounts
Returns the list of 71 monitored Twitter accounts.

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "username": "elonmusk",
        "category": "crypto",
        "description": "Tesla, SpaceX, crypto commentary"
      },
      {
        "username": "vitalikbuterin",
        "category": "crypto",
        "description": "Ethereum founder"
      },
      {
        "username": "federalreserve",
        "category": "economics",
        "description": "Official Fed announcements"
      }
    ],
    "count": 71,
    "categories": ["crypto", "politics", "economics", "tech", "sports", "geopolitics", "finance", "breaking_news"]
  }
}
```

---

### Health Check

#### GET /api/health
Returns the status of the API and all services.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": "99.8%",
    "endpoints": [
      {
        "path": "/api/analyze-text",
        "status": "operational",
        "avgLatency": "187ms"
      },
      {
        "path": "/api/markets/arbitrage",
        "status": "operational",
        "avgLatency": "142ms"
      },
      {
        "path": "/api/markets/movers",
        "status": "operational",
        "avgLatency": "98ms"
      },
      {
        "path": "/api/feed",
        "status": "operational",
        "avgLatency": "56ms"
      }
    ],
    "services": {
      "polymarket": "connected",
      "kalshi": "connected",
      "vercelKV": "connected",
      "twitterAPI": "limited"
    },
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}
```

---

## Code Examples

### cURL - Analyze Text
```bash
curl -X POST https://musashi-api.vercel.app/api/analyze-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bitcoin just crossed $100k!",
    "maxResults": 3
  }'
```

### Python - Full Agent Example
```python
import requests
import time

class MusashiAgent:
    def __init__(self, base_url="https://musashi-api.vercel.app"):
        self.base_url = base_url

    def analyze_text(self, text, min_confidence=0.25):
        response = requests.post(
            f"{self.base_url}/api/analyze-text",
            json={"text": text, "minConfidence": min_confidence}
        )
        return response.json()

    def get_arbitrage(self, min_spread=0.05):
        response = requests.get(
            f"{self.base_url}/api/markets/arbitrage",
            params={"minSpread": min_spread}
        )
        return response.json()

    def get_movers(self, timeframe="1h", min_change=0.05):
        response = requests.get(
            f"{self.base_url}/api/markets/movers",
            params={"timeframe": timeframe, "minChange": min_change}
        )
        return response.json()

    def get_feed(self, category=None, min_urgency=None, limit=20):
        params = {"limit": limit}
        if category:
            params["category"] = category
        if min_urgency:
            params["minUrgency"] = min_urgency

        response = requests.get(
            f"{self.base_url}/api/feed",
            params=params
        )
        return response.json()

    def poll_feed(self, callback, interval=120, **filters):
        """Poll feed every interval seconds and call callback with new tweets"""
        while True:
            data = self.get_feed(**filters)
            if data['success']:
                callback(data['data']['tweets'])
            time.sleep(interval)

# Usage
agent = MusashiAgent()

# Analyze a tweet
result = agent.analyze_text("The Fed just cut rates by 50 basis points")
for match in result['data']['markets']:
    print(f"{match['confidence']:.0%} - {match['market']['title']}")
    print(f"  Signal: {match['signal']['direction']} ({match['signal']['urgency']})")

# Find arbitrage opportunities
arb = agent.get_arbitrage(min_spread=0.07)
for opp in arb['data']['opportunities']:
    print(f"Arbitrage: {opp['spread']*100:.1f}% spread")
    print(f"  {opp['direction']}")

# Track market movers
movers = agent.get_movers(timeframe="1h", min_change=0.10)
for mover in movers['data']['movers']:
    print(f"{mover['market']['title']}: {mover['percentChange1h']}")

# Get high-urgency crypto tweets
feed = agent.get_feed(category="crypto", min_urgency="high", limit=10)
for tweet in feed['data']['tweets']:
    print(f"@{tweet['author']['username']}: {tweet['text']}")
```

### JavaScript / TypeScript SDK
```typescript
class MusashiAgent {
  private baseUrl: string;

  constructor(baseUrl = "https://musashi-api.vercel.app") {
    this.baseUrl = baseUrl;
  }

  async analyzeText(text: string, minConfidence = 0.25) {
    const response = await fetch(`${this.baseUrl}/api/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, minConfidence })
    });
    return response.json();
  }

  async getArbitrage(minSpread = 0.05) {
    const response = await fetch(
      `${this.baseUrl}/api/markets/arbitrage?minSpread=${minSpread}`
    );
    return response.json();
  }

  async getMarketMovers(timeframe = "1h", minChange = 0.05) {
    const response = await fetch(
      `${this.baseUrl}/api/markets/movers?timeframe=${timeframe}&minChange=${minChange}`
    );
    return response.json();
  }

  async getFeed(options: {
    limit?: number;
    category?: string;
    minUrgency?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.category) params.set('category', options.category);
    if (options.minUrgency) params.set('minUrgency', options.minUrgency);

    const response = await fetch(`${this.baseUrl}/api/feed?${params}`);
    return response.json();
  }

  onFeed(
    callback: (tweets: any[]) => void,
    filters: { category?: string; minUrgency?: string } = {},
    interval = 120000
  ) {
    setInterval(async () => {
      const { data } = await this.getFeed({ ...filters, limit: 20 });
      callback(data.tweets);
    }, interval);
  }
}

// Usage
const agent = new MusashiAgent();

// Poll crypto feed every 2 minutes
agent.onFeed(
  (tweets) => {
    tweets.forEach(tweet => {
      console.log(`@${tweet.author.username}: ${tweet.text}`);
      tweet.analysis.markets.forEach(match => {
        if (match.signal.urgency === 'critical') {
          console.log(`  🚨 CRITICAL: ${match.market.title}`);
        }
      });
    });
  },
  { category: 'crypto', minUrgency: 'high' },
  120000
);
```

---

## Rate Limits

**Current (Beta):**
- ✅ No rate limits
- ✅ No authentication required
- ✅ Free for all users

**Future:**
- Free tier: 100 requests/day
- Pro tier: 10,000 requests/day ($29/month)
- Enterprise: Custom limits

---

## Supported Markets

Currently tracking **900+ markets** across 8 categories:

- 🏛️ **Politics** (250+ markets) - Elections, Congress, Executive actions
- 💰 **Economics** (180+ markets) - Fed policy, inflation, recession, unemployment
- ₿ **Crypto** (200+ markets) - Bitcoin, Ethereum, ETFs, regulations
- 💻 **Technology** (120+ markets) - AI, earnings, IPOs, valuations
- ⚽ **Sports** (80+ markets) - NFL, NBA, Soccer, Tennis
- 🌍 **Geopolitics** (40+ markets) - Conflicts, peace deals, international relations
- 🎬 **Entertainment** (20+ markets) - Movies, music, streaming, gaming
- 🌡️ **Climate** (10+ markets) - Temperature records, policy, energy

**Platforms:**
- **Polymarket** - 500+ markets via Gamma API + CLOB API
- **Kalshi** - 400+ markets via Elections API

Price updates every 60 seconds via CLOB API for top 50 markets.

---

## Performance

Average latency by endpoint:
- **POST /api/analyze-text:** ~187ms
- **GET /api/markets/arbitrage:** ~142ms
- **GET /api/markets/movers:** ~98ms
- **GET /api/feed:** ~56ms

Uptime: 99.8% (hosted on Vercel)

---

## Error Handling

**Common Errors:**
```json
// Missing text field
{
  "success": false,
  "error": "Missing or invalid \"text\" field in request body."
}

// Invalid parameters
{
  "success": false,
  "error": "minConfidence must be between 0.0 and 1.0"
}

// No matches found
{
  "success": true,
  "data": {
    "markets": [],
    "matchCount": 0,
    "timestamp": "2026-03-08T10:30:15.234Z"
  }
}

// Server error
{
  "success": false,
  "error": "Internal server error"
}
```

**Best Practices:**
- Always check `success` field before accessing `data`
- Implement retry logic with exponential backoff
- Cache results for identical queries (TTL: 5 minutes recommended)
- Handle empty results gracefully
- Monitor `/api/health` for service status

---

## Deployment

**Production API:**
- URL: https://musashi-api.vercel.app
- Platform: Vercel Serverless Functions
- Database: Vercel KV (Upstash Redis)
- CDN: Vercel Edge Network
- Region: US-East-1 (primary)

**Data Sources:**
- Polymarket Gamma API: `https://gamma-api.polymarket.com`
- Polymarket CLOB API: `https://clob.polymarket.com`
- Kalshi Elections API: `https://api.elections.kalshi.com`
- Twitter API v2: Rate limited (currently blocked - credits depleted)

---

## Support

**Issues & Feedback:**
- GitHub: [github.com/VittorioC13/Musashi](https://github.com/VittorioC13/Musashi)
- Email: support@musashi.bot
- Twitter: [@musashimarket](https://twitter.com/musashimarket)

**For AI Agents:**
- This API is **agent-friendly by design**
- Structured JSON responses
- No authentication required (beta)
- Build cool stuff! 🚀

---

**Built for agents. Powered by prediction markets.**

*Last updated: March 8, 2026*
