import { z } from 'zod';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for get_categories
 */
export const GetCategoriesSchema = z.object({});

export type GetCategoriesInput = z.infer<typeof GetCategoriesSchema>;

/**
 * get_categories tool implementation
 *
 * Returns all available market categories.
 */
export class GetCategoriesTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the get_categories tool
   */
  async execute(_input: GetCategoriesInput): Promise<string[]> {
    const categories = await this.marketAggregator.getCategories();
    return categories;
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'get_categories',
      description:
        'Get all available market categories across Polymarket and Kalshi. ' +
        'Useful for discovering what topics are covered and filtering searches.',
      inputSchema: GetCategoriesSchema,
    };
  }
}
