# Musashi MCP Integration Guide

Connect Musashi's prediction market intelligence to Claude on the web or Claude Desktop.

## Quick Start (Remote - claude.ai website)

**Coming Soon:** Remote MCP server deployment

Once deployed, you'll be able to:

1. Go to https://claude.ai/settings/integrations
2. Click "Add MCP Server"
3. Enter URL: `https://musashi-mcp.yoursite.com`
4. Enter API key: Contact us for access
5. Click "Connect"

## Quick Start (Local - Claude Desktop)

For local use with Claude Desktop app:

1. **Install Musashi MCP Server:**

```bash
git clone https://github.com/MusashiBot/Musashi.git
cd Musashi/mcp-server
npm install
npm run build
```

2. **Configure Claude Desktop:**

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "musashi": {
      "command": "node",
      "args": ["/full/path/to/Musashi/mcp-server/dist/index.js"]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Verify Connection:**

Ask Claude: "What tools do you have access to?"

You should see 8 Musashi tools listed.

## Available Tools

### analyze_text
**Purpose:** Match text to relevant prediction markets

**Example Usage:**
```
User: "Analyze: Will Bitcoin hit $100k by end of 2026?"

Claude will use the analyze_text tool to:
- Search across 1200+ markets on Polymarket and Kalshi
- Return top 10 matches with current prices
- Show volume, liquidity, and match confidence
- Provide market URLs for further research
```

**Best For:**
- Finding markets for specific events
- Checking current prices for predictions
- Discovering related markets

### get_arbitrage
**Purpose:** Find cross-platform arbitrage opportunities

**Example Usage:**
```
User: "Find arbitrage opportunities in crypto markets"

Claude will:
- Compare prices between Polymarket and Kalshi
- Identify markets with >3% price spread
- Calculate potential profit (accounting for platform fees)
- Show volume and liquidity for each opportunity
```

**Best For:**
- Trading bots looking for arbitrage
- Market makers
- Understanding price discrepancies

### get_movers
**Purpose:** Track significant price movements

**Example Usage:**
```
User: "What markets moved significantly in the last hour?"

Claude will:
- Return markets with >5% price change
- Show direction (up/down) and magnitude
- Provide context: previous price → current price
- Include volume data
```

**Best For:**
- Catching breaking news impact
- Monitoring portfolio markets
- Identifying trending events

### get_feed
**Purpose:** Real-time Twitter feed from prediction market experts

**Example Usage:**
```
User: "Show me recent high-urgency crypto tweets"

Claude will:
- Return tweets from tracked accounts (traders, analysts)
- Match each tweet to relevant markets
- Filter by category and urgency level
- Show timestamp and author
```

**Best For:**
- Staying updated on market-moving events
- Finding alpha from expert traders
- Understanding market sentiment

### get_feed_stats
**Purpose:** Feed statistics and distribution

Shows total tweets, category breakdown, and urgency distribution.

### get_feed_accounts
**Purpose:** List tracked Twitter accounts

See which traders, analysts, and journalists are monitored.

### get_health
**Purpose:** API health check

Verify data source status (Polymarket, Kalshi) and response times.

## Example Workflows

### Workflow 1: Research a Prediction

```
User: "I heard Trump might run for president in 2028. What do prediction markets think?"

Claude:
1. Uses analyze_text to find relevant markets
2. Returns top markets with current prices
3. Uses get_movers to check if prices changed recently
4. Uses get_feed to find related tweets from experts
```

### Workflow 2: Find Trading Opportunities

```
User: "Find me arbitrage opportunities in political markets with good liquidity"

Claude:
1. Uses get_arbitrage with category filter
2. Shows price spreads >3%
3. Filters for markets with >$100k volume
4. Calculates potential profit after fees
```

### Workflow 3: Breaking News Monitoring

```
User: "What markets are moving right now?"

Claude:
1. Uses get_movers to find active markets
2. Cross-references with get_feed for news context
3. Explains why prices are moving
4. Suggests related markets to watch
```

## Authentication (Remote Deployment)

To get an API key for remote access:

1. **Free Tier** (Coming Soon):
   - Email: musashi@yoursite.com
   - GitHub: Create issue at github.com/MusashiBot/Musashi/issues
   - Rate Limits: 60 requests/min, 1000 requests/hour

2. **Pro Tier** (Future):
   - Higher rate limits
   - Guaranteed uptime
   - Priority support
   - Custom webhooks

## Rate Limits

**Free Tier:**
- 60 tool calls per minute
- 1000 tool calls per hour
- 5 concurrent Claude conversations
- 10 new sessions per hour

**Why rate limits?**
- Ensure fair access for all users
- Prevent abuse and API costs
- Maintain service reliability

## Data Freshness

All market data includes freshness metadata:

```
Data Age: 12s
Sources: Polymarket (✓), Kalshi (✓)
```

- **Data Age:** How old the cached data is (typically 0-20 seconds)
- **Source Status:** Which platforms are currently available
- **Graceful Degradation:** One source failing doesn't break the tool

## Troubleshooting

### "No tools available"

**Cause:** MCP server not connected

**Fix:**
- Verify Claude Desktop config path is correct
- Check absolute path to index.js is valid
- Restart Claude Desktop
- Check Console for error messages

### "Tool call failed: 429 Rate Limit"

**Cause:** Exceeded rate limits

**Fix:**
- Wait 60 seconds for per-minute limit reset
- Wait 1 hour for hourly limit reset
- Consider upgrading to Pro tier

### "Source unavailable: Kalshi"

**Cause:** Kalshi API is down or rate-limited

**Impact:** No impact - Polymarket data still available

**Fix:** None needed - graceful degradation working as designed

### "Data age: 45 seconds"

**Cause:** Cache is serving slightly stale data

**Impact:** Minimal - market prices don't change every second

**Fix:** None needed - next fetch will refresh data (cache TTL: 20s)

## Technical Details

### Architecture

```
You (claude.ai)
  ↓
Claude (Anthropic API)
  ↓
Musashi MCP Server (HTTP+SSE)
  ↓
Musashi REST API (Vercel)
  ↓
Data Sources (Polymarket, Kalshi, Twitter)
```

### Data Flow

1. You ask Claude a question
2. Claude decides to use Musashi tool
3. MCP server calls REST API
4. REST API fetches fresh data (or serves from cache)
5. Response flows back to Claude
6. Claude presents results in natural language

### Security

- **API Keys:** `mcp_sk_` prefix format
- **HTTPS Only:** All communication encrypted
- **Rate Limiting:** Per-key limits prevent abuse
- **CORS:** Restricted to claude.ai domain
- **No Data Storage:** No personal data stored

### Privacy

- **What we collect:** Tool usage metrics, error logs
- **What we DON'T collect:** Your conversations, personal data, trading activity
- **Data retention:** Logs deleted after 30 days
- **Third parties:** None - we don't share data

## Support

### Documentation
- Main README: github.com/MusashiBot/Musashi
- API Reference: github.com/MusashiBot/Musashi/blob/main/API-REFERENCE.md
- MCP Server README: github.com/MusashiBot/Musashi/blob/main/mcp-server/README.md

### Issues
- Bug reports: github.com/MusashiBot/Musashi/issues
- Feature requests: github.com/MusashiBot/Musashi/discussions

### Community
- Twitter: @MusashiBot (coming soon)
- Discord: (coming soon)

## Roadmap

**Phase 1 (Current):** Local stdio transport ✅
**Phase 2 (Next):** Remote HTTP+SSE deployment 🚧
**Phase 3 (Future):** Anthropic MCP directory listing 📅
**Phase 4 (Future):** Pro tier with webhooks and alerts 💡

## FAQ

**Q: Is this free?**
A: Yes, free tier with rate limits. Pro tier coming soon.

**Q: Do I need a Polymarket/Kalshi account?**
A: No, Musashi provides read-only market data. No account needed.

**Q: Can I use this for automated trading?**
A: Yes! The REST API is designed for trading bots. MCP server is for Claude integration.

**Q: How often is data updated?**
A: Every 20 seconds. Real-time events may have slightly longer latency.

**Q: What if one platform goes down?**
A: Graceful degradation - you'll still get data from the other platform.

**Q: Can I self-host?**
A: Yes! See mcp-server/README.md for deployment instructions.

**Q: Is the code open source?**
A: Yes, MIT license. Fork, modify, contribute!

## Getting Help

1. **Check documentation** (README, API-REFERENCE, this guide)
2. **Search GitHub issues** (someone may have had the same problem)
3. **Create new issue** (include error messages, steps to reproduce)
4. **Email support** (musashi@yoursite.com)

---

**Built with ❤️ by the Musashi team**

*Making prediction markets accessible to everyone, everywhere.*
