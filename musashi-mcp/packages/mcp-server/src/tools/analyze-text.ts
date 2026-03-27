import { z } from 'zod';
import type { SignalBatch } from '../types/index.js';
import { SignalGenerator } from '../analysis/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for analyze_text
 */
export const AnalyzeTextSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(10000)
    .describe('Text to analyze (tweet, article, statement, etc.)'),
  minConfidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum confidence threshold (0-1). Default: 0.15'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of signals to return. Default: 10'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Filter markets by categories (e.g., ["ai", "crypto"])'),
});

export type AnalyzeTextInput = z.infer<typeof AnalyzeTextSchema>;

/**
 * analyze_text tool implementation
 *
 * Analyzes text and returns relevant prediction market signals.
 * This is the core tool that powers contextual market discovery.
 */
export class AnalyzeTextTool {
  private signalGenerator: SignalGenerator;
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.signalGenerator = new SignalGenerator({
      minConfidence: 0.15,
      maxSignals: 10,
      includeAllMatches: false,
    });
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the analyze_text tool
   */
  async execute(input: AnalyzeTextInput): Promise<SignalBatch> {
    // Validate input
    const validated = AnalyzeTextSchema.parse(input);

    // Update generator config if provided
    if (validated.minConfidence !== undefined || validated.maxResults !== undefined) {
      this.signalGenerator.updateConfig({
        minConfidence: validated.minConfidence,
        maxSignals: validated.maxResults,
      });
    }

    // Fetch markets
    let markets = await this.marketAggregator.getAllMarkets();

    // Filter by categories if provided
    if (validated.categories && validated.categories.length > 0) {
      const categorySet = new Set(validated.categories.map((c) => c.toLowerCase()));
      markets = markets.filter((m) =>
        categorySet.has(m.category.toLowerCase()) ||
        m.tags.some((t) => categorySet.has(t.toLowerCase()))
      );
    }

    // Generate signals
    const result = await this.signalGenerator.analyzeText(validated.text, markets);

    return result;
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'analyze_text',
      description:
        'Analyze text (tweets, articles, statements) and find relevant prediction markets. ' +
        'Returns signals with confidence scores, sentiment analysis, and context understanding. ' +
        'Core tool for contextual market discovery.',
      inputSchema: AnalyzeTextSchema,
    };
  }
}
