import { z } from 'zod';
import type { Market } from '../types/index.js';
import { NotFoundError } from '../types/errors.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for get_market
 */
export const GetMarketSchema = z.object({
  marketId: z
    .string()
    .describe('Market ID (format: polymarket_{id} or kalshi_{ticker})'),
});

export type GetMarketInput = z.infer<typeof GetMarketSchema>;

/**
 * get_market tool implementation
 *
 * Get detailed information about a specific market.
 */
export class GetMarketTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the get_market tool
   */
  async execute(input: GetMarketInput): Promise<Market> {
    const validated = GetMarketSchema.parse(input);

    const market = await this.marketAggregator.getMarket(validated.marketId);

    if (!market) {
      throw new NotFoundError(
        `Market not found: ${validated.marketId}`,
        'market',
        validated.marketId
      );
    }

    return market;
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'get_market',
      description:
        'Get detailed information about a specific prediction market by ID. ' +
        'Returns full market details including prices, liquidity, volume, and metadata.',
      inputSchema: GetMarketSchema,
    };
  }
}
