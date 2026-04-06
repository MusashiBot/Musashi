import { z } from 'zod';
import type { MarketMover } from '../types/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for get_movers
 */
export const GetMoversSchema = z.object({
  timeframe: z
    .enum(['24h', '7d'])
    .optional()
    .describe('Timeframe for price movements. Default: "24h"'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of movers. Default: 20'),
  minMomentum: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum momentum score (0-1). Default: 0.3'),
});

export type GetMoversInput = z.infer<typeof GetMoversSchema>;

/**
 * get_movers tool implementation
 *
 * Returns markets with largest price movements and volume spikes.
 */
export class GetMoversTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the get_movers tool
   */
  async execute(input: GetMoversInput): Promise<MarketMover[]> {
    const validated = GetMoversSchema.parse(input);
    const timeframe = validated.timeframe ?? '24h';
    const limit = validated.limit ?? 20;
    const minMomentum = validated.minMomentum ?? 0.3;

    // Get movers
    const movers = await this.marketAggregator.getMovers(timeframe, limit * 2);

    // Filter by minimum momentum
    const filtered = movers.filter((m) => m.momentum >= minMomentum);

    return filtered.slice(0, limit);
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'get_movers',
      description:
        'Get markets with largest price movements and volume spikes. ' +
        'Useful for identifying trending topics and market sentiment shifts.',
      inputSchema: GetMoversSchema,
    };
  }
}
