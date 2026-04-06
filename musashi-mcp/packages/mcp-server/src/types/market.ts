import { z } from 'zod';

/**
 * Market outcome type - binary (YES/NO) or scalar (numerical value)
 */
export const MarketOutcomeSchema = z.enum(['binary', 'scalar']);
export type MarketOutcome = z.infer<typeof MarketOutcomeSchema>;

/**
 * Market status - active markets can be traded, closed markets are settled
 */
export const MarketStatusSchema = z.enum(['active', 'closed', 'resolved']);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

/**
 * Liquidity tier - affects matching confidence and trust score
 */
export const LiquidityTierSchema = z.enum(['high', 'medium', 'low']);
export type LiquidityTier = z.infer<typeof LiquidityTierSchema>;

/**
 * Source platform for the market
 */
export const MarketSourceSchema = z.enum(['polymarket', 'kalshi']);
export type MarketSource = z.infer<typeof MarketSourceSchema>;

/**
 * Core Market schema - represents a prediction market from any source
 */
export const MarketSchema = z.object({
  // Identifiers
  id: z.string().describe('Unique market identifier from source platform'),
  platformId: z.string().describe('Original ID from source (may differ from normalized id)'),
  source: MarketSourceSchema.describe('Platform where this market exists'),

  // Basic Information
  question: z.string().describe('The prediction question being asked'),
  description: z.string().optional().describe('Detailed market description'),
  category: z.string().describe('Market category (e.g., crypto, politics, tech)'),
  tags: z.array(z.string()).default([]).describe('Additional classification tags'),

  // Market Mechanics
  outcomeType: MarketOutcomeSchema.describe('Type of outcome (binary YES/NO or scalar)'),
  status: MarketStatusSchema.describe('Current market status'),

  // Pricing & Liquidity
  yesPrice: z.number().min(0).max(1).describe('Current YES outcome probability (0-1)'),
  noPrice: z.number().min(0).max(1).describe('Current NO outcome probability (0-1)'),
  volume24h: z.number().min(0).describe('24-hour trading volume in USD'),
  volumeTotal: z.number().min(0).describe('Total lifetime trading volume in USD'),
  liquidity: z.number().min(0).describe('Available liquidity in USD'),
  liquidityTier: LiquidityTierSchema.describe('Categorized liquidity level'),

  // Temporal Information
  createdAt: z.string().datetime().describe('Market creation timestamp (ISO 8601)'),
  closeDate: z.string().datetime().optional().describe('Market close/resolution date (ISO 8601)'),
  resolvedAt: z.string().datetime().optional().describe('Resolution timestamp (ISO 8601)'),

  // Platform-Specific
  url: z.string().url().describe('Direct link to market on source platform'),
  imageUrl: z.string().url().optional().describe('Market thumbnail/image'),

  // Metadata
  lastUpdated: z.string().datetime().describe('Last data refresh timestamp (ISO 8601)'),
});

export type Market = z.infer<typeof MarketSchema>;

/**
 * Arbitrage opportunity between two markets
 */
export const ArbitrageOpportunitySchema = z.object({
  marketA: MarketSchema.describe('First market in the arbitrage pair'),
  marketB: MarketSchema.describe('Second market in the arbitrage pair'),
  profitMargin: z.number().min(0).describe('Expected profit margin (0-1, e.g., 0.05 = 5%)'),
  strategy: z.string().describe('Arbitrage strategy description'),
  confidence: z.number().min(0).max(1).describe('Confidence in this arbitrage signal (0-1)'),
  riskFactors: z.array(z.string()).describe('Identified risk factors'),
});

export type ArbitrageOpportunity = z.infer<typeof ArbitrageOpportunitySchema>;

/**
 * Market price movement over time
 */
export const MarketMoverSchema = z.object({
  market: MarketSchema.describe('The market that moved'),
  priceChange: z.number().describe('Price change magnitude (e.g., 0.15 = +15%)'),
  direction: z.enum(['up', 'down']).describe('Direction of price movement'),
  timeframe: z.string().describe('Timeframe of movement (e.g., "24h", "7d")'),
  volumeSpike: z.number().min(0).describe('Volume increase factor (e.g., 2.5 = 250% increase)'),
  momentum: z.number().min(0).max(1).describe('Momentum score (0-1)'),
});

export type MarketMover = z.infer<typeof MarketMoverSchema>;

/**
 * Search filters for markets
 */
export const MarketSearchFiltersSchema = z.object({
  query: z.string().optional().describe('Search query for question/description'),
  categories: z.array(z.string()).optional().describe('Filter by categories'),
  sources: z.array(MarketSourceSchema).optional().describe('Filter by source platforms'),
  status: z.array(MarketStatusSchema).optional().describe('Filter by market status'),
  minLiquidity: z.number().min(0).optional().describe('Minimum liquidity in USD'),
  minVolume24h: z.number().min(0).optional().describe('Minimum 24h volume in USD'),
  closeDateAfter: z.string().datetime().optional().describe('Only markets closing after this date'),
  closeDateBefore: z.string().datetime().optional().describe('Only markets closing before this date'),
});

export type MarketSearchFilters = z.infer<typeof MarketSearchFiltersSchema>;

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  offset: z.number().int().min(0).default(0).describe('Number of results to skip'),
  limit: z.number().int().min(1).max(100).default(20).describe('Maximum results to return'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Paginated search results
 */
export const PaginatedMarketsSchema = z.object({
  markets: z.array(MarketSchema).describe('Array of markets'),
  total: z.number().int().min(0).describe('Total matching markets'),
  offset: z.number().int().min(0).describe('Current offset'),
  limit: z.number().int().min(1).describe('Current limit'),
  hasMore: z.boolean().describe('Whether more results exist'),
});

export type PaginatedMarkets = z.infer<typeof PaginatedMarketsSchema>;
