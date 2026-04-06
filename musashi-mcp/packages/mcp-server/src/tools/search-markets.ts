import { z } from 'zod';
import type { PaginatedMarkets } from '../types/index.js';
import { MarketSearchFiltersSchema, PaginationSchema } from '../types/market.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for search_markets
 */
export const SearchMarketsSchema = z.object({
  filters: MarketSearchFiltersSchema.describe('Search filters'),
  pagination: PaginationSchema.optional().describe('Pagination options'),
});

export type SearchMarketsInput = z.infer<typeof SearchMarketsSchema>;

/**
 * search_markets tool implementation
 *
 * Search and filter prediction markets across all sources.
 */
export class SearchMarketsTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the search_markets tool
   */
  async execute(input: SearchMarketsInput): Promise<PaginatedMarkets> {
    const validated = SearchMarketsSchema.parse(input);

    const pagination = validated.pagination ?? { offset: 0, limit: 20 };

    const results = await this.marketAggregator.searchMarkets(
      validated.filters,
      pagination
    );

    return results;
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'search_markets',
      description:
        'Search and filter prediction markets across Polymarket and Kalshi. ' +
        'Supports filtering by query, categories, sources, status, liquidity, volume, and close dates. ' +
        'Returns paginated results.',
      inputSchema: SearchMarketsSchema,
    };
  }
}
