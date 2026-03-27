import type { Market } from '../types/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Markets resource implementation
 *
 * Provides access to market data via URI patterns:
 * - musashi://markets/all
 * - musashi://markets/category/{category}
 * - musashi://markets/trending
 */
export class MarketsResource {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Read resource by URI
   */
  async read(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
    }>;
  }> {
    const parsed = this.parseURI(uri);

    if (!parsed) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    let markets: Market[] = [];
    let description = '';

    switch (parsed.type) {
      case 'all':
        markets = await this.marketAggregator.getAllMarkets();
        description = 'All active prediction markets';
        break;

      case 'category':
        if (!parsed.category) {
          throw new Error('Category parameter required');
        }
        markets = await this.marketAggregator.getAllMarkets();
        markets = markets.filter((m) =>
          m.category.toLowerCase().includes(parsed.category!.toLowerCase())
        );
        description = `Markets in category: ${parsed.category}`;
        break;

      case 'trending':
        const movers = await this.marketAggregator.getMovers('24h', 50);
        markets = movers.map((m) => m.market);
        description = 'Trending markets (highest momentum)';
        break;

      default:
        throw new Error(`Unknown resource type: ${parsed.type}`);
    }

    // Format as readable text
    const text = this.formatMarketsAsText(markets, description);

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text,
        },
      ],
    };
  }

  /**
   * List available resources
   */
  async list(): Promise<
    Array<{
      uri: string;
      name: string;
      description: string;
      mimeType: string;
    }>
  > {
    const categories = await this.marketAggregator.getCategories();

    const resources = [
      {
        uri: 'musashi://markets/all',
        name: 'All Markets',
        description: 'All active prediction markets from Polymarket and Kalshi',
        mimeType: 'text/plain',
      },
      {
        uri: 'musashi://markets/trending',
        name: 'Trending Markets',
        description: 'Markets with highest price movement and volume',
        mimeType: 'text/plain',
      },
    ];

    // Add category resources
    for (const category of categories.slice(0, 20)) {
      // Limit to top 20
      resources.push({
        uri: `musashi://markets/category/${encodeURIComponent(category)}`,
        name: `${category} Markets`,
        description: `Markets in the ${category} category`,
        mimeType: 'text/plain',
      });
    }

    return resources;
  }

  /**
   * Parse resource URI
   */
  private parseURI(uri: string): {
    type: 'all' | 'category' | 'trending';
    category?: string;
  } | null {
    if (uri === 'musashi://markets/all') {
      return { type: 'all' };
    }

    if (uri === 'musashi://markets/trending') {
      return { type: 'trending' };
    }

    const categoryMatch = uri.match(/^musashi:\/\/markets\/category\/(.+)$/);
    if (categoryMatch) {
      return {
        type: 'category',
        category: decodeURIComponent(categoryMatch[1]!),
      };
    }

    return null;
  }

  /**
   * Format markets as human-readable text
   */
  private formatMarketsAsText(markets: Market[], description: string): string {
    const lines: string[] = [];

    lines.push(`# ${description}`);
    lines.push('');
    lines.push(`Total markets: ${markets.length}`);
    lines.push('');

    for (const market of markets.slice(0, 100)) {
      // Limit output
      lines.push(`## ${market.question}`);
      lines.push(`- **ID**: ${market.id}`);
      lines.push(`- **Source**: ${market.source}`);
      lines.push(`- **Category**: ${market.category}`);
      lines.push(`- **YES Price**: ${(market.yesPrice * 100).toFixed(1)}%`);
      lines.push(`- **NO Price**: ${(market.noPrice * 100).toFixed(1)}%`);
      lines.push(`- **Liquidity**: $${market.liquidity.toLocaleString()}`);
      lines.push(`- **24h Volume**: $${market.volume24h.toLocaleString()}`);
      lines.push(`- **Status**: ${market.status}`);
      if (market.closeDate) {
        lines.push(`- **Closes**: ${new Date(market.closeDate).toLocaleDateString()}`);
      }
      lines.push(`- **URL**: ${market.url}`);
      lines.push('');
    }

    if (markets.length > 100) {
      lines.push(`... and ${markets.length - 100} more markets`);
    }

    return lines.join('\n');
  }
}
