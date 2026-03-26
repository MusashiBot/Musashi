# Musashi API Reference

**Base URL**: `https://musashi-api.vercel.app`

Musashi provides a REST API for AI agents and trading bots to analyze text, detect arbitrage opportunities, and track market movers across Polymarket and Kalshi prediction markets.

---

## Endpoints

### 1. POST /api/analyze-text

Analyze text (tweet, news article, etc.) and return matching prediction markets with trading signals.

**Request:**
```json
POST /api/analyze-text
Content-Type: application/json

{
  "text": "Bitcoin just hit $100k!",
  "minConfidence": 0.3,    // optional, default: 0.3
  "maxResults": 5          // optional, default: 5
}
```

**Response:**
```json
{
  "event_id": "evt_abc123_xyz",
  "signal_type": "news_event",        // arbitrage | news_event | sentiment_shift | user_interest
  "urgency": "high",                   // low | medium | high | critical
  "success": true,
  "data": {
    "markets": [
      {
        "market": {
          "id": "polymarket-0x123...",
          "platform": "polymarket",
          "title": "Will Bitcoin reach $100k by March 2026?",
          "yesPrice": 0.67,
          "noPrice": 0.33,
          "volume24h": 250000,
          "url": "https://polymarket.com/event/bitcoin-100k",
          "category": "crypto"
        },
        "confidence": 0.85,
        "matchedKeywords": ["bitcoin", "100k"]
      }
    ],
    "matchCount": 1,
    "timestamp": "2026-03-01T12:00:00.000Z",
    "suggested_action": {
      "direction": "YES",              // YES | NO | HOLD
      "confidence": 0.75,
      "edge": 0.12,
      "reasoning": "Bullish sentiment (85% confidence) suggests YES is underpriced at 67%"
    },
    "sentiment": {
      "sentiment": "bullish",          // bullish | bearish | neutral
      "confidence": 0.85
    },
    "arbitrage": null,                 // or ArbitrageOpportunity if detected
    "metadata": {
      "processing_time_ms": 124,
      "sources_checked": 2,
      "markets_analyzed": 1234,
      "model_version": "v2.0.0"
    }
  }
}
```

**Signal Types:**
- `arbitrage`: Cross-platform price discrepancy detected
- `news_event`: Breaking news with market impact
- `sentiment_shift`: Sentiment strongly disagrees with current price
- `user_interest`: General match without strong signal

**Urgency Levels:**
- `critical`: Strong edge (>15%) + high volume + expires soon OR arbitrage >5%
- `high`: Good edge (>10%) OR moderate arbitrage (>3%)
- `medium`: Decent edge (>5%)
- `low`: Match without clear edge

---

### 2. GET /api/markets/arbitrage

Get cross-platform arbitrage opportunities between Polymarket and Kalshi.

**Request:**
```
GET /api/markets/arbitrage?minSpread=0.03&minConfidence=0.5&limit=20&category=crypto
```

**Query Parameters:**
- `minSpread` (optional): Minimum price spread (default: 0.03 = 3%)
- `minConfidence` (optional): Minimum match confidence (default: 0.5 = 50%)
- `limit` (optional): Max results (default: 20, max: 100)
- `category` (optional): Filter by category (crypto, us_politics, economics, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "polymarket": {
          "id": "polymarket-0x123...",
          "title": "Will Bitcoin reach $100k by March 2026?",
          "yesPrice": 0.63,
          "volume24h": 450000,
          ...
        },
        "kalshi": {
          "id": "kalshi-KXBTC-...",
          "title": "Bitcoin $100k by Mar 2026",
          "yesPrice": 0.70,
          "volume24h": 200000,
          ...
        },
        "spread": 0.07,                // 7% spread
        "profitPotential": 0.07,       // Expected 7% profit
        "direction": "buy_poly_sell_kalshi",
        "confidence": 0.85,
        "matchReason": "High title similarity (85%)"
      }
    ],
    "count": 5,
    "timestamp": "2026-03-01T12:00:00.000Z",
    "filters": {
      "minSpread": 0.03,
      "minConfidence": 0.5,
      "limit": 20,
      "category": "crypto"
    },
    "metadata": {
      "processing_time_ms": 89,
      "markets_analyzed": 1234,
      "polymarket_count": 734,
      "kalshi_count": 500
    }
  }
}
```

**Trading Strategy:**
- `buy_poly_sell_kalshi`: Buy YES on Polymarket (cheaper), sell YES on Kalshi (expensive)
- `buy_kalshi_sell_poly`: Buy YES on Kalshi (cheaper), sell YES on Polymarket (expensive)

---

### 3. GET /api/markets/movers

Get markets with significant price changes.

**Request:**
```
GET /api/markets/movers?minChange=0.05&limit=20&category=us_politics
```

**Query Parameters:**
- `minChange` (optional): Minimum price change (default: 0.05 = 5%)
- `limit` (optional): Max results (default: 20, max: 100)
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "movers": [
      {
        "market": {
          "id": "polymarket-0x456...",
          "title": "Will Trump win 2024 election?",
          "yesPrice": 0.72,
          "volume24h": 5000000,
          ...
        },
        "priceChange1h": 0.08,         // +8% in last hour
        "priceChange24h": 0.12,        // +12% in last 24h (if available)
        "previousPrice": 0.64,
        "currentPrice": 0.72,
        "direction": "up",             // up | down
        "timestamp": 1709294400000
      }
    ],
    "count": 12,
    "timestamp": "2026-03-01T12:00:00.000Z",
    "filters": {
      "minChange": 0.05,
      "limit": 20,
      "category": "us_politics"
    },
    "metadata": {
      "processing_time_ms": 45,
      "markets_analyzed": 1234,
      "price_snapshots_stored": 4567,
      "storage": "Vercel KV (Redis)",
      "history_retention": "7 days"
    }
  }
}
```

**Storage**: The API uses Vercel KV (Redis) to persist price snapshots across serverless invocations. Snapshots are stored for 7 days with automatic TTL expiration. See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for setup instructions.

---

### 4. GET /api/health

Check API health and service status.

**Request:**
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",               // healthy | degraded | down
  "timestamp": "2026-03-01T12:00:00.000Z",
  "uptime_ms": 123456,
  "response_time_ms": 45,
  "version": "2.0.0",
  "services": {
    "polymarket": {
      "status": "healthy",
      "markets": 734
    },
    "kalshi": {
      "status": "healthy",
      "markets": 500
    }
  },
  "endpoints": {
    "/api/analyze-text": {
      "method": "POST",
      "description": "Analyze text and return matching markets with trading signals",
      "status": "healthy"
    },
    "/api/markets/arbitrage": {
      "method": "GET",
      "description": "Get cross-platform arbitrage opportunities",
      "status": "healthy"
    },
    "/api/markets/movers": {
      "method": "GET",
      "description": "Get markets with significant price changes",
      "status": "healthy"
    },
    "/api/health": {
      "method": "GET",
      "description": "API health check",
      "status": "healthy"
    }
  },
  "limits": {
    "max_markets_per_request": 5,
    "cache_ttl_seconds": 300,
    "rate_limit": "none (currently)"
  }
}
```

---

## Example Usage

### Python

```python
import requests

# Analyze text
response = requests.post(
    'https://musashi-api.vercel.app/api/analyze-text',
    json={'text': 'Bitcoin mooning! $100k inevitable!'}
)
signal = response.json()

if signal['urgency'] in ['high', 'critical']:
    action = signal['data']['suggested_action']
    print(f"TRADE SIGNAL: {action['direction']} with {action['confidence']*100}% confidence")
    print(f"Edge: {action['edge']*100}%")
    print(f"Reasoning: {action['reasoning']}")

# Get arbitrage opportunities
response = requests.get(
    'https://musashi-api.vercel.app/api/markets/arbitrage',
    params={'minSpread': 0.05, 'limit': 10}
)
arb = response.json()

for opportunity in arb['data']['opportunities']:
    print(f"Arbitrage: {opportunity['spread']*100}% spread")
    print(f"  Buy on {opportunity['direction'].split('_')[1]}")
    print(f"  Profit potential: {opportunity['profitPotential']*100}%")
```

### JavaScript

```javascript
// Analyze text
const response = await fetch(
  'https://musashi-api.vercel.app/api/analyze-text',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Fed announces rate cut!'
    })
  }
);

const signal = await response.json();

if (signal.urgency === 'critical') {
  console.log('CRITICAL SIGNAL:', signal.signal_type);
  console.log('Action:', signal.data.suggested_action);
}

// Get movers
const moversRes = await fetch(
  'https://musashi-api.vercel.app/api/markets/movers?minChange=0.05&limit=10'
);

const movers = await moversRes.json();
movers.data.movers.forEach(mover => {
  console.log(`${mover.market.title}: ${mover.direction === 'up' ? '↑' : '↓'} ${mover.priceChange1h * 100}%`);
});
```

---

## Rate Limits

Currently: **No rate limits** (subject to change)

Future plans:
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "event_id": "evt_error",
  "signal_type": "user_interest",
  "urgency": "low"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (invalid parameters)
- `405`: Method not allowed
- `500`: Internal server error
- `503`: Service unavailable

---

## Categories

Supported market categories:
- `crypto` - Cryptocurrency markets
- `us_politics` - US political events
- `economics` - Economic indicators, Fed policy
- `technology` - Tech companies, AI, innovation
- `sports` - Sports events, championships
- `geopolitics` - International conflicts, diplomacy
- `climate` - Climate change, weather events
- `other` - Uncategorized markets

---

## Caching & Storage

- **Markets**: Cached for **20 seconds** in-memory (shared across endpoints, configurable via `MARKET_CACHE_TTL_SECONDS`)
- **Arbitrage**: Cached for **15 seconds** (configurable via `ARBITRAGE_CACHE_TTL_SECONDS`)
- **Movers**: Price snapshots stored in **Vercel KV (Redis)** for **7 days**

> **Trading Update**: Cache TTLs reduced from 5 minutes to 15-20 seconds for fresher pricing data. See environment variables section for configuration options.

### Vercel KV Setup

The movers endpoint requires Vercel KV to persist price history across serverless invocations. See [VERCEL_KV_SETUP.md](./VERCEL_KV_SETUP.md) for setup instructions.

**Environment Variables Required**:
- `KV_REST_API_URL` - KV REST API endpoint
- `KV_REST_API_TOKEN` - Authentication token

**Cache Configuration (Optional)**:
- `MARKET_CACHE_TTL_SECONDS` - Market data cache duration (default: **20 seconds**, was 5 minutes)
- `ARBITRAGE_CACHE_TTL_SECONDS` - Arbitrage cache duration (default: **15 seconds**, was 5 minutes)

**Note for Trading Agents**: Cache TTLs have been reduced from 5 minutes to 15-20 seconds by default to provide fresher data for trading decisions. You can adjust these values based on your trading strategy:
- **High-frequency trading**: Set to 10-15 seconds for maximum freshness
- **Cost optimization**: Set to 60-300 seconds to reduce external API calls
- **Production recommended**: Keep at 15-30 seconds for balance

---

## Support

- **GitHub**: https://github.com/VittorioC13/Musashi
- **Issues**: https://github.com/VittorioC13/Musashi/issues
- **Email**: [Create issue on GitHub]

---

**Built with ❤️ by rotciv + Claude Code**
