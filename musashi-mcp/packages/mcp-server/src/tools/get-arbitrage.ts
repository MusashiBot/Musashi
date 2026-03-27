import { z } from 'zod';
import type { ArbitrageOpportunity } from '../types/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for get_arbitrage
 */
export const GetArbitrageSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of arbitrage opportunities. Default: 20'),
  minProfit: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum profit margin (0-1). Default: 0.02 (2%)'),
});

export type GetArbitrageInput = z.infer<typeof GetArbitrageSchema>;

/**
 * get_arbitrage tool implementation
 *
 * Finds arbitrage opportunities between Polymarket and Kalshi.
 */
export class GetArbitrageTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the get_arbitrage tool
   */
  async execute(input: GetArbitrageInput): Promise<ArbitrageOpportunity[]> {
    const validated = GetArbitrageSchema.parse(input);
    const limit = validated.limit ?? 20;
    const minProfit = validated.minProfit ?? 0.02;

    // Find all arbitrage opportunities
    const opportunities = await this.marketAggregator.findArbitrage(limit * 2);

    // Filter by minimum profit
    const filtered = opportunities.filter((opp) => opp.profitMargin >= minProfit);

    return filtered.slice(0, limit);
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'get_arbitrage',
      description:
        'Find arbitrage opportunities between Polymarket and Kalshi. ' +
        'Returns cross-platform price discrepancies with profit margins, strategies, and risk factors.',
      inputSchema: GetArbitrageSchema,
    };
  }
}
