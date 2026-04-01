#!/usr/bin/env node

/**
 * Musashi MCP Server
 * Provides prediction market intelligence tools via MCP protocol
 * Supports both stdio (local) and HTTP+SSE (remote) transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from './server/session-manager.js';
import { HttpServer } from './server/http-server.js';

// REST API base URL
const API_BASE_URL = process.env.MUSASHI_API_BASE_URL || 'https://musashi-api.vercel.app';

/**
 * MCP Server with 8 prediction market tools
 */
class MusashiMCPServer {
  private server: Server;
  private httpServer: HttpServer | null = null;
  private sessionManager: SessionManager | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'musashi',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // Register tools/list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_text',
          description: 'Match text to relevant prediction markets across Polymarket and Kalshi. Returns top markets with prices, volume, and confidence scores.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to analyze (e.g., "Bitcoin $100k", "Trump wins election")',
              },
              minConfidence: {
                type: 'number',
                description: 'Minimum match confidence (0-1). Default: 0.3',
                minimum: 0,
                maximum: 1,
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results. Default: 10',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'get_arbitrage',
          description: 'Find cross-platform arbitrage opportunities where the same market has different prices on Polymarket vs Kalshi. Returns opportunities sorted by spread.',
          inputSchema: {
            type: 'object',
            properties: {
              minSpread: {
                type: 'number',
                description: 'Minimum price spread (0-1). Default: 0.03 (3%)',
                minimum: 0,
                maximum: 1,
              },
              minConfidence: {
                type: 'number',
                description: 'Minimum match confidence (0-1). Default: 0.5',
                minimum: 0,
                maximum: 1,
              },
              limit: {
                type: 'number',
                description: 'Maximum number of opportunities. Default: 20',
                minimum: 1,
                maximum: 100,
              },
              category: {
                type: 'string',
                description: 'Filter by category (e.g., "crypto", "politics")',
              },
            },
          },
        },
        {
          name: 'get_movers',
          description: 'Track markets with significant price movements in the last hour. Shows direction (up/down), magnitude, and previous price.',
          inputSchema: {
            type: 'object',
            properties: {
              minChange: {
                type: 'number',
                description: 'Minimum price change (0-1). Default: 0.05 (5%)',
                minimum: 0,
                maximum: 1,
              },
              limit: {
                type: 'number',
                description: 'Maximum number of movers. Default: 20',
                minimum: 1,
                maximum: 100,
              },
              category: {
                type: 'string',
                description: 'Filter by category',
              },
            },
          },
        },
        {
          name: 'get_feed',
          description: 'Real-time Twitter feed of analyzed tweets from prediction market traders and analysts. Each tweet is matched to relevant markets.',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by category: politics, economics, crypto, technology, geopolitics, sports, breaking_news, finance',
              },
              minUrgency: {
                type: 'string',
                description: 'Minimum urgency level: low, medium, high, critical. Default: low',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              limit: {
                type: 'number',
                description: 'Maximum number of tweets. Default: 20',
                minimum: 1,
                maximum: 100,
              },
              since: {
                type: 'string',
                description: 'ISO 8601 timestamp to get tweets after this time',
              },
            },
          },
        },
        {
          name: 'get_feed_stats',
          description: 'Statistics about the Twitter feed: total tweets, category breakdown, urgency distribution, and recent activity.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_feed_accounts',
          description: 'List of tracked Twitter accounts (traders, analysts, journalists) for the prediction market feed.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_health',
          description: 'API health check with uptime, response time, and data source status (Polymarket, Kalshi).',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_market_trends',
          description: 'NOT YET IMPLEMENTED - Will analyze market trends over time',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Register tools/call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_text':
            return await this.handleAnalyzeText(args);

          case 'get_arbitrage':
            return await this.handleGetArbitrage(args);

          case 'get_movers':
            return await this.handleGetMovers(args);

          case 'get_feed':
            return await this.handleGetFeed(args);

          case 'get_feed_stats':
            return await this.handleGetFeedStats();

          case 'get_feed_accounts':
            return await this.handleGetFeedAccounts();

          case 'get_health':
            return await this.handleGetHealth();

          case 'get_market_trends':
            return {
              content: [
                {
                  type: 'text',
                  text: 'ERROR: get_market_trends is not yet implemented',
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        console.error(`[MCP] Tool ${name} failed:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `ERROR: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleAnalyzeText(args: any) {
    const { text, minConfidence = 0.3, maxResults = 10 } = args;

    const response = await fetch(`${API_BASE_URL}/api/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, minConfidence, maxResults }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze text');
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid API response');
    }

    const markets = data.data.markets;
    const metadata = data.data.metadata;

    let result = `Found ${markets.length} matching markets:\n\n`;

    markets.forEach((market: any, i: number) => {
      result += `${i + 1}. **${market.title}**\n`;
      result += `   Platform: ${market.platform}\n`;
      result += `   Yes Price: ${(market.yesPrice * 100).toFixed(1)}%\n`;
      result += `   Volume 24h: $${market.volume24h.toLocaleString()}\n`;
      result += `   Match Score: ${(market.relevanceScore * 100).toFixed(1)}%\n`;
      result += `   URL: ${market.url}\n\n`;
    });

    result += `\nData Age: ${metadata.data_age_seconds}s | Sources: Polymarket (${metadata.sources.polymarket.available ? '✓' : '✗'}), Kalshi (${metadata.sources.kalshi.available ? '✓' : '✗'})`;

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetArbitrage(args: any) {
    const { minSpread = 0.03, minConfidence = 0.5, limit = 20, category } = args;

    const params = new URLSearchParams({
      minSpread: minSpread.toString(),
      minConfidence: minConfidence.toString(),
      limit: limit.toString(),
    });

    if (category) params.append('category', category);

    const response = await fetch(`${API_BASE_URL}/api/markets/arbitrage?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get arbitrage opportunities');
    }

    const data = await response.json();
    const opportunities = data.data.opportunities;

    if (opportunities.length === 0) {
      return {
        content: [{ type: 'text', text: 'No arbitrage opportunities found with current filters.' }],
      };
    }

    let result = `Found ${opportunities.length} arbitrage opportunities:\n\n`;

    opportunities.forEach((opp: any, i: number) => {
      result += `${i + 1}. **${opp.polymarket.title}**\n`;
      result += `   Spread: ${(opp.spread * 100).toFixed(2)}%\n`;
      result += `   Polymarket: ${(opp.polymarket.yesPrice * 100).toFixed(1)}% ($${opp.polymarket.volume24h.toLocaleString()} vol)\n`;
      result += `   Kalshi: ${(opp.kalshi.yesPrice * 100).toFixed(1)}% ($${opp.kalshi.volume24h.toLocaleString()} vol)\n`;
      result += `   Match Confidence: ${(opp.confidence * 100).toFixed(1)}%\n\n`;
    });

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetMovers(args: any) {
    const { minChange = 0.05, limit = 20, category } = args;

    const params = new URLSearchParams({
      minChange: minChange.toString(),
      limit: limit.toString(),
    });

    if (category) params.append('category', category);

    const response = await fetch(`${API_BASE_URL}/api/markets/movers?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get market movers');
    }

    const data = await response.json();
    const movers = data.data.movers;

    if (movers.length === 0) {
      return {
        content: [{ type: 'text', text: 'No significant market movements in the last hour.' }],
      };
    }

    let result = `Found ${movers.length} significant market movements:\n\n`;

    movers.forEach((mover: any, i: number) => {
      const direction = mover.direction === 'up' ? '📈' : '📉';
      const change = (mover.priceChange1h * 100).toFixed(2);

      result += `${i + 1}. ${direction} **${mover.market.title}**\n`;
      result += `   Change: ${change}% (${(mover.previousPrice * 100).toFixed(1)}% → ${(mover.currentPrice * 100).toFixed(1)}%)\n`;
      result += `   Platform: ${mover.market.platform}\n`;
      result += `   Volume: $${mover.market.volume24h.toLocaleString()}\n\n`;
    });

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetFeed(args: any) {
    const { category, minUrgency = 'low', limit = 20, since } = args;

    const params = new URLSearchParams({ limit: limit.toString() });

    if (category) params.append('category', category);
    if (minUrgency) params.append('minUrgency', minUrgency);
    if (since) params.append('since', since);

    const response = await fetch(`${API_BASE_URL}/api/feed?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get feed');
    }

    const data = await response.json();
    const tweets = data.data.tweets;

    if (tweets.length === 0) {
      return {
        content: [{ type: 'text', text: 'No tweets found matching criteria.' }],
      };
    }

    let result = `Found ${tweets.length} recent tweets:\n\n`;

    tweets.forEach((tweet: any, i: number) => {
      result += `${i + 1}. **@${tweet.author_username}** (${tweet.urgency} urgency)\n`;
      result += `   ${tweet.tweet_text}\n`;
      result += `   Markets: ${tweet.matched_markets.length} matched\n`;
      result += `   Posted: ${new Date(tweet.created_at).toLocaleString()}\n\n`;
    });

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetFeedStats() {
    const response = await fetch(`${API_BASE_URL}/api/feed/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get feed stats');
    }

    const data = await response.json();
    const stats = data.data;

    let result = `**Feed Statistics**\n\n`;
    result += `Total Tweets: ${stats.total_tweets}\n`;
    result += `Last 24h: ${stats.tweets_last_24h}\n`;
    result += `Last Hour: ${stats.tweets_last_hour}\n\n`;

    result += `**By Category:**\n`;
    Object.entries(stats.by_category).forEach(([cat, count]) => {
      result += `  ${cat}: ${count}\n`;
    });

    result += `\n**By Urgency:**\n`;
    Object.entries(stats.by_urgency).forEach(([urg, count]) => {
      result += `  ${urg}: ${count}\n`;
    });

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetFeedAccounts() {
    const response = await fetch(`${API_BASE_URL}/api/feed/accounts`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get feed accounts');
    }

    const data = await response.json();
    const accounts = data.data.accounts;

    let result = `**Tracked Twitter Accounts (${accounts.length})**\n\n`;

    accounts.forEach((account: any, i: number) => {
      result += `${i + 1}. @${account.username}\n`;
      if (account.description) {
        result += `   ${account.description}\n`;
      }
    });

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private async handleGetHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data = await response.json();
    const health = data.data;

    let result = `**API Health Check**\n\n`;
    result += `Status: ${health.status}\n`;
    result += `Uptime: ${Math.floor(health.uptime_ms / 1000 / 60)} minutes\n`;
    result += `Response Time: ${health.response_time_ms}ms\n\n`;

    result += `**Data Sources:**\n`;
    result += `  Polymarket: ${health.services.polymarket.status} (${health.services.polymarket.markets} markets)\n`;
    result += `  Kalshi: ${health.services.kalshi.status} (${health.services.kalshi.markets} markets)\n`;

    return {
      content: [{ type: 'text', text: result }],
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP] Server error:', error);
    };

    process.on('SIGINT', async () => {
      console.log('\n[MCP] Received SIGINT, shutting down...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[MCP] Received SIGTERM, shutting down...');
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    if (this.httpServer) {
      await this.httpServer.stop();
    }

    if (this.sessionManager) {
      this.sessionManager.destroy();
    }
  }

  /**
   * Start server with stdio transport (local mode)
   */
  async startStdio(): Promise<void> {
    console.log('[MCP] Starting server in stdio mode (local)');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[MCP] Server ready (stdio transport)');
  }

  /**
   * Start server with HTTP+SSE transport (remote mode)
   */
  async startHttp(port: number): Promise<void> {
    console.log('[MCP] Starting server in HTTP mode (remote)');

    // Validate API keys configured
    if (!process.env.MCP_API_KEYS) {
      throw new Error('MCP_API_KEYS environment variable required for HTTP transport');
    }

    this.sessionManager = new SessionManager();

    this.httpServer = new HttpServer({
      port,
      sessionManager: this.sessionManager,
      onMessage: (sessionId, message) => {
        // Route message to MCP server and send response via SSE
        this.handleHttpMessage(sessionId, message);
      },
    });

    await this.httpServer.start(port);
    console.log('[MCP] Server ready (HTTP+SSE transport)');
  }

  private async handleHttpMessage(sessionId: string, message: any): Promise<void> {
    try {
      // Process message through MCP server
      // This is a simplified version - full implementation would need proper JSON-RPC handling
      const { method, params, id } = message;

      let result;

      if (method === 'tools/list') {
        result = await this.server.request({ method: 'tools/list' }, ListToolsRequestSchema);
      } else if (method === 'tools/call') {
        result = await this.server.request({ method: 'tools/call', params }, CallToolRequestSchema);
      } else {
        throw new Error(`Unknown method: ${method}`);
      }

      // Send response via SSE
      const response = {
        jsonrpc: '2.0',
        id,
        result,
      };

      this.sessionManager?.sendSSEMessage(sessionId, response);
    } catch (error: any) {
      // Send error via SSE
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error.message,
        },
      };

      this.sessionManager?.sendSSEMessage(sessionId, errorResponse);
    }
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const transportType = args.includes('--transport=http') ? 'http' : 'stdio';

  const mcpServer = new MusashiMCPServer();

  if (transportType === 'http') {
    const port = parseInt(process.env.PORT || '3000', 10);
    await mcpServer.startHttp(port);
  } else {
    await mcpServer.startStdio();
  }
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
