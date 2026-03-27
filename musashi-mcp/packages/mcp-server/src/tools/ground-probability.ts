import { z } from 'zod';
import type { ProbabilityGrounding } from '../types/index.js';
import { MarketAggregator } from '../api/market-aggregator.js';
import { CacheManager } from '../cache/lru-cache.js';

/**
 * Tool schema for ground_probability
 */
export const GroundProbabilitySchema = z.object({
  question: z
    .string()
    .min(1)
    .max(1000)
    .describe('Question to ground probability for'),
  userEstimate: z
    .number()
    .min(0)
    .max(1)
    .describe('User estimated probability (0-1, e.g., 0.7 = 70%)'),
  maxMarkets: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum markets to use for consensus. Default: 5'),
});

export type GroundProbabilityInput = z.infer<typeof GroundProbabilitySchema>;

/**
 * ground_probability tool implementation
 *
 * Compare user probability estimate against market consensus.
 * Helps calibrate probability judgments.
 */
export class GroundProbabilityTool {
  private marketAggregator: MarketAggregator;

  constructor(cache: CacheManager) {
    this.marketAggregator = new MarketAggregator(cache);
  }

  /**
   * Execute the ground_probability tool
   */
  async execute(input: GroundProbabilityInput): Promise<ProbabilityGrounding> {
    const validated = GroundProbabilitySchema.parse(input);
    const maxMarkets = validated.maxMarkets ?? 5;

    // Search for related markets
    const results = await this.marketAggregator.searchMarkets(
      { query: validated.question },
      { offset: 0, limit: maxMarkets }
    );

    if (results.markets.length === 0) {
      // No markets found - provide generic calibration advice
      return {
        userEstimate: validated.userEstimate,
        marketConsensus: 0.5, // Neutral
        difference: validated.userEstimate - 0.5,
        interpretation: 'No related markets found for comparison.',
        calibrationAdvice:
          'Without market data, focus on base rates and reference class forecasting.',
        marketLiquidity: 0,
        sampleSize: 0,
      };
    }

    // Calculate weighted consensus
    let weightedSum = 0;
    let totalWeight = 0;
    let totalLiquidity = 0;

    for (const market of results.markets) {
      const weight = Math.log10(market.liquidity + 1); // Log scale weight
      weightedSum += market.yesPrice * weight;
      totalWeight += weight;
      totalLiquidity += market.liquidity;
    }

    const marketConsensus = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    const difference = validated.userEstimate - marketConsensus;
    const absDiff = Math.abs(difference);

    // Generate interpretation
    let interpretation = '';
    if (absDiff < 0.05) {
      interpretation = 'Your estimate aligns closely with market consensus.';
    } else if (absDiff < 0.15) {
      interpretation = `Your estimate is ${difference > 0 ? 'slightly higher' : 'slightly lower'} than market consensus.`;
    } else if (absDiff < 0.30) {
      interpretation = `Your estimate is ${difference > 0 ? 'significantly higher' : 'significantly lower'} than market consensus.`;
    } else {
      interpretation = `Your estimate diverges substantially from market consensus (${(absDiff * 100).toFixed(0)}% difference).`;
    }

    // Generate calibration advice
    let calibrationAdvice = '';
    if (absDiff < 0.10) {
      calibrationAdvice =
        'Good calibration! Continue refining your probability estimation skills.';
    } else if (difference > 0) {
      calibrationAdvice =
        'You may be too optimistic. Consider: What evidence would change your mind? ' +
        'Are you accounting for all failure modes? Review base rates for similar events.';
    } else {
      calibrationAdvice =
        'You may be too pessimistic. Consider: What evidence supports the positive case? ' +
        'Are you overweighting recent negative examples? Check if anchoring bias is affecting your estimate.';
    }

    // Add liquidity context
    const avgLiquidity = totalLiquidity / results.markets.length;
    if (avgLiquidity < 10000) {
      calibrationAdvice +=
        ' Note: Low market liquidity means this consensus may be less reliable.';
    }

    return {
      userEstimate: validated.userEstimate,
      marketConsensus,
      difference,
      interpretation,
      calibrationAdvice,
      marketLiquidity: totalLiquidity,
      sampleSize: results.markets.length,
    };
  }

  /**
   * Get tool metadata for MCP registration
   */
  static getMetadata() {
    return {
      name: 'ground_probability',
      description:
        'Compare user probability estimate against market consensus. ' +
        'Helps calibrate probability judgments by providing market-based feedback. ' +
        'Returns interpretation, calibration advice, and market data quality metrics.',
      inputSchema: GroundProbabilitySchema,
    };
  }
}
