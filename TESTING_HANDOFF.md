# Musashi Testing Handoff - Engineer Guide

**Date**: March 7, 2026
**Version**: 2.0.0
**Status**: Production Ready (with Twitter API blocker - see below)

---

## What is Musashi?

Musashi is an **AI-powered prediction market intelligence platform** that converts social signals into actionable trades. Think of it as a Bloomberg Terminal for prediction market trading bots.

### Three Components to Test

1. **Chrome Extension** - Twitter overlay showing market odds and trading signals
2. **REST API** - Backend service for analyzing text and detecting arbitrage
3. **Feed Service** - Automated tweet collection system (currently blocked by Twitter API credits)

---

## Quick Start - What You'll Test

### ✅ Working Now (Test These First)
- Chrome extension UI and sidebar
- Text analysis endpoint
- Arbitrage detection
- Market movers tracking
- Health checks

### 🚨 Currently Blocked (Twitter API Credits Depleted)
- Automated tweet collection
- Feed endpoints (will return empty arrays)
- Real-time market matching on Twitter

**Note**: Everything works except the Twitter API integration needs payment ($100/month). You can still test 90% of functionality without it.

---

## Prerequisites

- **Node.js**: 20+ and pnpm
- **Google Chrome**: Latest version
- **Git**: For cloning/pulling updates
- **Optional**: Vercel CLI for local API testing

---

## Setup Instructions

### 1. Clone & Install

```bash
# Navigate to project
cd "C:\Users\rotciv\Desktop\Musashi ai"

# Install dependencies (if needed)
pnpm install

# Build the Chrome extension
pnpm run build
```

Expected output: `dist/` folder created with extension files

### 2. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `C:\Users\rotciv\Desktop\Musashi ai\dist` folder
5. Musashi should appear in your extensions list with version 2.0.0

**Verify**: Extension icon should appear in Chrome toolbar

### 3. Environment Check

The API is deployed at: `https://musashi-api.vercel.app`

You don't need to set up environment variables to test the deployed API. For local testing, you would need:
- `TWITTER_BEARER_TOKEN` (currently blocked - see section below)
- `KV_REST_API_URL` (auto-configured on Vercel)
- `KV_REST_API_TOKEN` (auto-configured on Vercel)

---

## Test Plan

### Test 1: Chrome Extension UI

**Objective**: Verify the extension loads and displays properly

**Steps**:
1. Go to https://twitter.com or https://x.com
2. Log in to your Twitter account
3. Look for the Musashi sidebar on the right side of the page

**Expected Behavior**:
- Sidebar appears on the right side of Twitter feed
- UI is clean with TailwindCSS styling
- No console errors in DevTools (F12)

**Known Issue**: Since Twitter API credits are depleted, you won't see matched markets yet. The sidebar will be empty or show a "No matches" message.

**How to Debug**:
- Open DevTools (F12) → Console tab
- Look for any error messages
- Check Network tab for failed API calls

---

### Test 2: Text Analysis Endpoint

**Objective**: Verify the core analysis pipeline works

**Steps**:

```bash
# Test with crypto-related text
curl -X POST "https://musashi-api.vercel.app/api/analyze-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Bitcoin just hit $100k! Ethereum follows. Major crypto rally happening now.\"}"
```

**Expected Response** (JSON):
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "market": {
          "id": "...",
          "title": "Bitcoin to $100k by end of 2026?",
          "platform": "polymarket",
          "current_odds": {...}
        },
        "confidence": 0.85,
        "keywords_matched": ["bitcoin", "100k", "crypto"]
      }
    ],
    "sentiment": {
      "label": "bullish",
      "confidence": 0.92
    },
    "suggested_action": {
      "direction": "YES",
      "confidence": 0.78,
      "edge": 0.15,
      "reasoning": "Strong bullish sentiment..."
    },
    "urgency": "high"
  }
}
```

**What to Verify**:
- ✅ Status 200 response
- ✅ Matches array contains relevant Polymarket/Kalshi markets
- ✅ Sentiment is classified (bullish/bearish/neutral)
- ✅ Confidence scores are between 0-1
- ✅ Suggested action includes direction (YES/NO/HOLD)

**Try These Test Cases**:

```bash
# Test 1: Politics
curl -X POST "https://musashi-api.vercel.app/api/analyze-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Trump announces 2024 presidential campaign. Polls show strong support.\"}"

# Test 2: Economics
curl -X POST "https://musashi-api.vercel.app/api/analyze-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Fed announces 50 basis point rate cut. Inflation concerns easing.\"}"

# Test 3: Sports
curl -X POST "https://musashi-api.vercel.app/api/analyze-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Lakers win NBA championship! LeBron MVP performance.\"}"

# Test 4: Generic text (should return low confidence or no matches)
curl -X POST "https://musashi-api.vercel.app/api/analyze-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"I love pizza and ice cream.\"}"
```

---

### Test 3: Arbitrage Detection

**Objective**: Find price discrepancies between Polymarket and Kalshi

**Steps**:

```bash
# Get arbitrage opportunities with 5%+ spread
curl "https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.05"

# Lower threshold to 3% to see more opportunities
curl "https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.03"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "polymarket_market": {...},
        "kalshi_market": {...},
        "spread": 0.07,
        "profit_potential": "7% spread",
        "direction": "Buy YES on Polymarket, Buy NO on Kalshi",
        "confidence": 0.85
      }
    ],
    "count": 5,
    "timestamp": "2026-03-07T..."
  }
}
```

**What to Verify**:
- ✅ Returns array of arbitrage opportunities
- ✅ Each opportunity has both Polymarket and Kalshi markets
- ✅ Spread is a positive number (e.g., 0.05 = 5%)
- ✅ Direction suggests which platform to buy/sell on
- ✅ Response time < 1 second (markets are cached)

**Note**: There might be 0 opportunities if markets are efficient. This is normal.

---

### Test 4: Market Movers

**Objective**: Track markets with significant price changes

**Steps**:

```bash
# Get markets with 10%+ price change
curl "https://musashi-api.vercel.app/api/markets/movers?minChange=0.10"

# Lower threshold to 5%
curl "https://musashi-api.vercel.app/api/markets/movers?minChange=0.05"

# Get movers from last hour
curl "https://musashi-api.vercel.app/api/markets/movers?minChange=0.05&timeframe=1h"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "movers": [
      {
        "market": {...},
        "price_change": 0.12,
        "direction": "up",
        "old_price": 0.45,
        "new_price": 0.57,
        "timeframe": "1h"
      }
    ],
    "count": 3,
    "timestamp": "2026-03-07T..."
  }
}
```

**What to Verify**:
- ✅ Returns markets with price changes
- ✅ Price change is accurate (new_price - old_price)
- ✅ Direction is "up" or "down"
- ✅ Timeframe matches query parameter

**Possible Issue**: First request after deployment might return empty array (no price history yet). This is normal - price tracking needs 2+ snapshots at least 1 hour apart.

---

### Test 5: Health Check

**Objective**: Verify API is running

**Steps**:

```bash
curl "https://musashi-api.vercel.app/api/health"
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T12:00:00Z",
  "markets": {
    "polymarket": 490,
    "kalshi": 169,
    "total": 659
  }
}
```

**What to Verify**:
- ✅ Status is "healthy"
- ✅ Markets count > 0
- ✅ Response time < 500ms

---

### Test 6: Feed Endpoints (Currently Blocked)

**Objective**: Test automated tweet collection system

**⚠️ IMPORTANT**: These endpoints will return empty arrays until Twitter API credits are added.

**Steps**:

```bash
# Get latest analyzed tweets
curl "https://musashi-api.vercel.app/api/feed?limit=10"

# Get feed statistics
curl "https://musashi-api.vercel.app/api/feed/stats"

# Get monitored accounts
curl "https://musashi-api.vercel.app/api/feed/accounts"
```

**Current Expected Response** (Empty):
```json
{
  "success": true,
  "data": {
    "tweets": [],
    "count": 0,
    "timestamp": "2026-03-07T12:00:00Z"
  }
}
```

**After Twitter API Credits Added** (Expected):
```json
{
  "success": true,
  "data": {
    "tweets": [
      {
        "tweet": {
          "id": "123456789",
          "author": "VitalikButerin",
          "text": "...",
          "created_at": "2026-03-07T12:00:00Z"
        },
        "matches": [...],
        "sentiment": {...},
        "suggested_action": {...},
        "urgency": "high"
      }
    ],
    "count": 15
  }
}
```

**Feed Stats Endpoint**:
```bash
curl "https://musashi-api.vercel.app/api/feed/stats"
```

Should return:
```json
{
  "success": true,
  "data": {
    "tweets": {
      "total": 0,
      "last_1h": 0,
      "last_24h": 0
    },
    "last_collection": "2026-03-02T11:46:06Z",
    "by_category": {...},
    "by_urgency": {...}
  }
}
```

**Feed Accounts Endpoint**:
```bash
curl "https://musashi-api.vercel.app/api/feed/accounts"
```

Should return 71 monitored accounts across 8 categories.

---

### Test 7: Agent SDK (TypeScript/JavaScript)

**Objective**: Test the SDK for bot developers

**Steps**:

1. Create a test file `test-sdk.ts`:

```typescript
import { MusashiAgent } from './src/sdk/musashi-agent';

async function testSDK() {
  const agent = new MusashiAgent('https://musashi-api.vercel.app');

  // Test 1: Analyze text
  console.log('Testing text analysis...');
  const signal = await agent.analyzeText('Bitcoin hits $100k!');
  console.log('Sentiment:', signal.sentiment);
  console.log('Suggested action:', signal.suggested_action);

  // Test 2: Get arbitrage
  console.log('\nTesting arbitrage detection...');
  const arbs = await agent.getArbitrage({ minSpread: 0.05 });
  console.log(`Found ${arbs.length} arbitrage opportunities`);

  // Test 3: Get movers
  console.log('\nTesting market movers...');
  const movers = await agent.getMovers({ minChange: 0.05 });
  console.log(`Found ${movers.length} market movers`);

  // Test 4: Get feed (will be empty until Twitter API credits added)
  console.log('\nTesting feed...');
  const tweets = await agent.getFeed({ limit: 10 });
  console.log(`Feed contains ${tweets.length} tweets`);
}

testSDK().catch(console.error);
```

2. Run it:
```bash
npx ts-node test-sdk.ts
```

**Expected Output**:
- All methods execute without errors
- Sentiment and suggested action are returned
- Arbitrage/movers arrays may be empty (normal)
- Feed will be empty until Twitter API credits added

---

### Test 8: Chrome Extension on Live Twitter

**Objective**: See how extension behaves on real tweets

**Steps**:

1. Open Twitter/X in Chrome
2. Search for: `"Bitcoin" OR "Ethereum" OR "crypto"`
3. Scroll through results

**Expected Behavior** (After Twitter API Credits Added):
- Musashi sidebar appears on right
- Market cards appear below relevant tweets
- Cards show:
  - Matched market title
  - Current odds (YES/NO percentages)
  - Sentiment indicator (bullish/bearish)
  - Confidence score
  - Trading signal

**Current Behavior** (Twitter API Blocked):
- Sidebar appears but shows "No matches"
- No market cards below tweets
- Console may show API errors (402 Payment Required)

---

## Performance Benchmarks

Test these and verify performance:

| Endpoint | Expected Response Time | Notes |
|----------|----------------------|-------|
| `/api/health` | < 500ms | Cold start: ~2s |
| `/api/analyze-text` | < 200ms | With cached markets |
| `/api/markets/arbitrage` | < 1s | First request slower (cache miss) |
| `/api/markets/movers` | < 500ms | Requires price history |
| `/api/feed` | < 200ms | Returns from KV |

**How to Test**:
```bash
# Add -w to see response time
curl -w "\nTime: %{time_total}s\n" "https://musashi-api.vercel.app/api/health"

curl -i https://musashi-api.vercel.app/api/health
curl -i "https://musashi-api.vercel.app/api/feed?limit=5"
curl -i https://musashi-api.vercel.app/api/feed/stats
curl -i "https://musashi-api.vercel.app/api/markets/arbitrage?minSpread=0.02"
curl -i "https://musashi-api.vercel.app/api/markets/movers?minChange=0.05"

```

---

## Known Issues & Limitations

### 🚨 Critical
1. **Twitter API Credits Depleted** (HTTP 402)
   - Impact: Feed endpoints return empty arrays
   - Fix: Add payment to Twitter Developer Portal (~$100/month)
   - Verification guide: `verify-twitter-credits.md`

### ⚠️ Non-Critical
2. **First Request Slow** (Cold Start)
   - Vercel serverless functions take ~2s on first request
   - Subsequent requests are fast (< 500ms)
   - Normal behavior for free tier

3. **Empty Movers on First Run**
   - Requires 2+ price snapshots at least 1 hour apart
   - Wait 1-2 hours after deployment for data

4. **No Matches for Generic Text**
   - Text must be relevant to prediction markets
   - Try market-specific keywords (Bitcoin, Trump, Fed, etc.)

5. **Arbitrage Opportunities Rare**
   - Markets are often efficient
   - Try lowering `minSpread` to 0.01 (1%) to see more

---

## Debugging Guide

### Chrome Extension Issues

**Sidebar not showing:**
```javascript
// Open DevTools (F12) → Console
// Look for errors like:
// ❌ Failed to inject sidebar: ...
// ❌ Content script not loaded
```

**Fix**:
1. Go to `chrome://extensions`
2. Click reload button on Musashi card
3. Refresh Twitter tab (Ctrl+R)

**No market cards appearing:**
- This is expected until Twitter API credits are added
- Test with `/api/analyze-text` to verify matching logic works

### API Errors

**Error: "Network request failed"**
- Check internet connection
- Verify API URL: `https://musashi-api.vercel.app`
- Check Vercel deployment status

**Error: "CORS blocked"**
- Should not happen (CORS configured in `vercel.json`)
- If it does, check browser console for exact error

**Error: 402 Payment Required (Twitter)**
- This is the known blocker
- See `verify-twitter-credits.md` for resolution

### Vercel Logs

View live logs:
```bash
cd "C:\Users\rotciv\Desktop\Musashi ai"
vercel logs --follow
```

Filter for specific endpoint:
```bash
vercel logs --follow | grep "collect-tweets"
```

---

## Success Criteria

After testing, you should verify:

- ✅ Chrome extension loads without console errors
- ✅ `/api/health` returns 200 with market counts
- ✅ `/api/analyze-text` returns matches for relevant text
- ✅ `/api/markets/arbitrage` returns 200 (even if empty array)
- ✅ `/api/markets/movers` returns 200 (even if empty array)
- ✅ `/api/feed` returns 200 (will be empty until Twitter credits added)
- ✅ `/api/feed/accounts` returns 71 accounts
- ✅ SDK methods execute without errors
- ✅ Extension sidebar displays on Twitter/X

---

## After Twitter API Credits Added

Once payment is processed (~2-5 minutes):

1. **Verify Credits Active**:
   ```bash
   curl "https://musashi-api.vercel.app/api/feed/stats"
   ```
   Look for `last_collection` timestamp updating every 2 minutes

2. **Check Feed**:
   ```bash
   curl "https://musashi-api.vercel.app/api/feed?limit=5"
   ```
   Should return analyzed tweets within 2-10 minutes

3. **Test Chrome Extension**:
   - Go to Twitter/X
   - Find tweets from monitored accounts (e.g., @VitalikButerin, @elonmusk)
   - Market cards should appear below relevant tweets

4. **Monitor Logs**:
   ```bash
   vercel logs --follow
   ```
   Look for:
   - ✅ `[Twitter Client] Successfully fetched @username`
   - ✅ `[Cron] Complete: X tweets stored`
   - ❌ No more 402 errors

---

## Documentation References

- **Main README**: `README.md` (project overview)
- **Agent SDK Guide**: `README-AGENT.md` (for bot developers)
- **API Reference**: `API-REFERENCE.md` (endpoint documentation)
- **Deployment Status**: `DEPLOYMENT_STATUS.md` (current blocker details)
- **Twitter Setup**: `verify-twitter-credits.md` (how to fix 402 error)

---

## Questions or Issues?

If you encounter any issues during testing:

1. Check console/logs for error messages
2. Review `DEPLOYMENT_STATUS.md` for known issues
3. Test with `curl` commands to isolate frontend vs backend issues
4. Verify environment variables in Vercel dashboard
5. Contact me with specific error messages/screenshots

---

## Summary

**What Works**: Text analysis, arbitrage detection, market movers, health checks, Chrome extension UI
**What's Blocked**: Automated tweet collection (needs Twitter API payment)
**Estimated Testing Time**: 30-60 minutes
**Critical Path**: Test analyze-text endpoint → Test arbitrage → Test extension UI → Wait for Twitter credits

Good luck! 🚀
