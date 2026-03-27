import { z } from 'zod';
import type { SignalEvent } from '../types/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for get_signal_stream
 */
export const GetSignalStreamSchema = z.object({
  categories: z
    .array(z.string())
    .optional()
    .describe('Filter signals by categories'),
  minConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum confidence threshold. Default: 0.5'),
  heartbeatInterval: z
    .number()
    .int()
    .min(1000)
    .max(60000)
    .optional()
    .describe('Heartbeat interval in milliseconds. Default: 30000'),
});

export type GetSignalStreamInput = z.infer<typeof GetSignalStreamSchema>;

/**
 * get_signal_stream tool implementation
 *
 * Stream real-time signals as markets update.
 * Returns an async generator that yields SignalEvent objects.
 */
export class GetSignalStreamTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the get_signal_stream tool
   * Returns an async generator for SSE streaming
   */
  async *execute(input: GetSignalStreamInput): AsyncGenerator<SignalEvent> {
    const validated = GetSignalStreamSchema.parse(input);
    const heartbeatInterval = validated.heartbeatInterval ?? 30000;
    // Note: minConfidence would be used for filtering signals if we had live signal generation
    // For now, we're just streaming market updates
    // const minConfidence = validated.minConfidence ?? 0.5;

    let lastCheck = Date.now();

    // Main streaming loop
    while (true) {
      try {
        // Fetch latest markets
        const markets = await this.marketAggregator.getAllMarkets();

        // Filter by categories if provided
        const filteredMarkets = validated.categories
          ? markets.filter(
              (m) =>
                validated.categories!.some((cat) =>
                  m.category.toLowerCase().includes(cat.toLowerCase())
                ) ||
                m.tags.some((t) =>
                  validated.categories!.some((cat) =>
                    t.toLowerCase().includes(cat.toLowerCase())
                  )
                )
            )
          : markets;

        // Check for updated markets (compare lastUpdated timestamps)
        const now = Date.now();
        const recentlyUpdated = filteredMarkets.filter((m) => {
          const marketTime = new Date(m.lastUpdated).getTime();
          return marketTime > lastCheck;
        });

        // Emit market update events
        for (const market of recentlyUpdated) {
          yield {
            type: 'market_update',
            marketId: market.id,
            timestamp: new Date().toISOString(),
          };
        }

        lastCheck = now;

        // Send heartbeat
        yield {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        };

        // Wait before next check
        await this.sleep(heartbeatInterval);
      } catch (error) {
        console.error('[GetSignalStreamTool] Error in stream:', error);
        // Continue streaming even on errors
        await this.sleep(heartbeatInterval);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'get_signal_stream',
      description:
        'Stream real-time market updates and signals. ' +
        'Returns a continuous stream of events via Server-Sent Events (SSE). ' +
        'Useful for building real-time dashboards and monitoring systems.',
      inputSchema: GetSignalStreamSchema,
    };
  }
}
