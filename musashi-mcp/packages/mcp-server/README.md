# Musashi MCP Server

> **Prediction Market Intelligence for AI Agents**

Musashi MCP Server brings prediction market data and analysis to AI agent frameworks through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). Access real-time market odds, sentiment analysis, and probability grounding from Polymarket and Kalshi directly in Claude Desktop, Cursor, and other MCP-compatible tools.

## Features

### 🎯 Core Intelligence

- **Smart Text Analysis**: AI-powered matching between text and prediction markets with context understanding
- **Sentiment Analysis**: Bullish/bearish detection with 2-word negation window and phrase-level analysis
- **Context Scoring**: Understands if text is ABOUT markets vs casual mentions
- **Category Priority**: AI/tech/crypto topics get 2-3x higher matching rates

### 🛠️ 8 Powerful Tools

1. **analyze_text** - Find relevant markets for any text (tweets, articles, statements)
2. **get_arbitrage** - Cross-platform arbitrage opportunities between Polymarket & Kalshi
3. **get_movers** - Markets with biggest price movements and volume spikes
4. **search_markets** - Advanced filtering by category, liquidity, volume, dates
5. **get_market** - Detailed market information by ID
6. **ground_probability** - Calibrate probability estimates against market consensus
7. **get_categories** - Discover all available market categories
8. **get_signal_stream** - Real-time market updates (SSE streaming)

### 📚 Resources

- `musashi://markets/all` - All active markets
- `musashi://markets/trending` - Top movers
- `musashi://markets/category/{category}` - Category-specific markets

### 📝 Prompt Templates

- **analyze** - Guided market analysis workflow
- **brief** - Daily market briefing generation

## Installation

### Option 1: NPM Package (Recommended)

```bash
npm install -g @musashi/mcp-server
```

### Option 2: From Source

```bash
git clone https://github.com/MusashiBot/musashi-mcp.git
cd musashi-mcp
pnpm install
pnpm build
```

## Quick Start

### 1. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "musashi": {
      "command": "npx",
      "args": ["-y", "@musashi/mcp-server"]
    }
  }
}
```

Or if installed locally:

```json
{
  "mcpServers": {
    "musashi": {
      "command": "node",
      "args": ["/path/to/musashi-mcp/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Restart Claude Desktop

The Musashi tools will now be available in Claude Desktop's tool palette.

### 3. Try It Out

Ask Claude:

```
What prediction markets are related to "AI agents are getting autonomous"?
```

Claude will use the `analyze_text` tool to find relevant markets!

## Usage Examples

### Analyze Text

```typescript
// In your AI agent code
const result = await callTool('analyze_text', {
  text: 'Bitcoin will hit $100K by end of 2024',
  minConfidence: 0.15,
  maxResults: 10
});

// Returns Signal objects with confidence scores, sentiment, matched keywords
```

### Find Arbitrage

```typescript
const opportunities = await callTool('get_arbitrage', {
  limit: 20,
  minProfit: 0.02 // 2% minimum profit
});

// Returns arbitrage opportunities with strategy and risk analysis
```

### Search Markets

```typescript
const markets = await callTool('search_markets', {
  filters: {
    query: 'AI',
    categories: ['tech', 'crypto'],
    minLiquidity: 100000,
    status: ['active']
  },
  pagination: { offset: 0, limit: 20 }
});
```

### Ground Probability

```typescript
const grounding = await callTool('ground_probability', {
  question: 'Will GPT-5 be released in 2024?',
  userEstimate: 0.7, // Your estimate: 70%
  maxMarkets: 5
});

// Returns market consensus, difference, interpretation, and calibration advice
```

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Optional API keys for rate limit tiers
MUSASHI_API_KEYS=key1:pro,key2:free

# Free tier: 100 requests/hour
# Pro tier: 1000 requests/hour

NODE_ENV=production
```

### Rate Limits

| Tier | Hourly | Per Minute | Burst (10s) |
|------|--------|------------|-------------|
| Free | 100    | 10         | 5           |
| Pro  | 1000   | 50         | 20          |

## Architecture

```
┌─────────────────────────────────────────────┐
│          MCP Protocol Layer                 │
│  (stdio transport, tools, resources)        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Analysis Engine                     │
│  • Keyword Matching (SYNONYM_MAP)           │
│  • Sentiment Analysis (bullish/bearish)     │
│  • Context Scoring (prediction detection)   │
│  • Category Priority (AI/tech boost)        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          API Client Layer                   │
│  • Polymarket Client (gamma-api)            │
│  • Kalshi Client (elections API)            │
│  • Market Aggregator (cross-platform)       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Cache + Auth Layers                   │
│  • LRU Cache (5min markets, 30s API)        │
│  • Rate Limiting (token bucket)             │
│  • API Key Management                       │
└─────────────────────────────────────────────┘
```

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Setup

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Development mode (watch)
pnpm dev

# Run locally
node dist/index.js
```

### Project Structure

```
src/
├── analysis/          # Matching and analysis engine
│   ├── keyword-extractor.ts
│   ├── sentiment-analyzer.ts
│   ├── context-scorer.ts
│   ├── category-priority.ts
│   └── signal-generator.ts
├── api/               # External API clients
│   ├── base-client.ts
│   ├── polymarket-client.ts
│   ├── kalshi-client.ts
│   └── market-aggregator.ts
├── auth/              # Authentication and rate limiting
│   ├── auth-manager.ts
│   └── rate-limiter.ts
├── cache/             # Caching layer
│   └── lru-cache.ts
├── tools/             # MCP tool implementations
│   ├── analyze-text.ts
│   ├── get-arbitrage.ts
│   ├── get-movers.ts
│   ├── search-markets.ts
│   ├── get-market.ts
│   ├── ground-probability.ts
│   ├── get-categories.ts
│   └── get-signal-stream.ts
├── resources/         # MCP resources
│   └── markets-resource.ts
├── prompts/           # Prompt templates
│   ├── analyze-prompt.ts
│   └── brief-prompt.ts
├── types/             # TypeScript types
│   ├── market.ts
│   ├── signal.ts
│   └── errors.ts
├── server.ts          # Main MCP server
└── index.ts           # Entry point
```

### Testing

```bash
# Run tests
pnpm test

# Test specific tool
node dist/index.js <<EOF
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "analyze_text", "arguments": {"text": "Bitcoin going to moon"}}}
EOF
```

## Integration Examples

### Cursor IDE

Add to Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "musashi": {
        "command": "npx",
        "args": ["-y", "@musashi/mcp-server"]
      }
    }
  }
}
```

### Custom AI Agent

```typescript
import { MusashiMCPServer } from '@musashi/mcp-server';

const server = new MusashiMCPServer();
await server.start();

// Now use MCP protocol to call tools
```

## Related Projects

- **[Musashi Chrome Extension](https://github.com/MusashiBot/Musashi)** - Twitter integration with card overlays
- **[Musashi Website](https://musashi.bot)** - Web dashboard and API

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md).

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Build: `pnpm build`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/MusashiBot/musashi-mcp/issues)
- **Discord**: [Join our community](https://discord.gg/musashi)
- **Twitter**: [@MusashiBot](https://twitter.com/MusashiBot)

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- Market data from [Polymarket](https://polymarket.com) and [Kalshi](https://kalshi.com)
- Inspired by the need for AI agents to reason about probabilities

---

**Made with ❤️ by the Musashi team**

[Website](https://musashi.bot) • [GitHub](https://github.com/MusashiBot) • [Twitter](https://twitter.com/MusashiBot)
