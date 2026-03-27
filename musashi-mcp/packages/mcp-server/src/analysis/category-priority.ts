import type { Market } from '../types/index.js';

/**
 * High priority categories get boosted confidence and lower thresholds
 */
const HIGH_PRIORITY_CATEGORIES = new Set([
  'ai',
  'artificial intelligence',
  'tech',
  'technology',
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'ethereum',
  'defi',
  'blockchain',
  'web3',
]);

/**
 * Medium priority categories get slight boost
 */
const MEDIUM_PRIORITY_CATEGORIES = new Set([
  'politics',
  'election',
  'economics',
  'finance',
  'business',
  'science',
  'climate',
  'energy',
]);

/**
 * Get category priority boost for a market
 * High priority: +0.15 confidence boost
 * Medium priority: +0.05 confidence boost
 * Low priority: +0.00
 */
export function getCategoryPriorityBoost(market: Market): number {
  const category = market.category.toLowerCase().trim();
  const tags = market.tags.map((t) => t.toLowerCase());

  // Check exact matches
  if (HIGH_PRIORITY_CATEGORIES.has(category)) {
    return 0.15;
  }

  if (MEDIUM_PRIORITY_CATEGORIES.has(category)) {
    return 0.05;
  }

  // Check partial matches
  for (const highPri of HIGH_PRIORITY_CATEGORIES) {
    if (category.includes(highPri) || tags.some((t) => t.includes(highPri))) {
      return 0.15;
    }
  }

  for (const medPri of MEDIUM_PRIORITY_CATEGORIES) {
    if (category.includes(medPri) || tags.some((t) => t.includes(medPri))) {
      return 0.05;
    }
  }

  return 0.0;
}

/**
 * Get effective threshold for a market based on category priority
 * High priority: 67% of base threshold (0.15 → 0.10)
 * Medium priority: 90% of base threshold (0.15 → 0.135)
 * Low priority: 100% of base threshold
 */
export function getEffectiveThreshold(market: Market, baseThreshold: number): number {
  const boost = getCategoryPriorityBoost(market);

  if (boost >= 0.15) {
    // High priority
    return baseThreshold * 0.67;
  } else if (boost >= 0.05) {
    // Medium priority
    return baseThreshold * 0.90;
  }

  return baseThreshold;
}

/**
 * Check if market is high priority category
 */
export function isHighPriorityCategory(market: Market): boolean {
  return getCategoryPriorityBoost(market) >= 0.15;
}

/**
 * Get all priority categories for documentation
 */
export function getPriorityCategories(): {
  high: string[];
  medium: string[];
} {
  return {
    high: Array.from(HIGH_PRIORITY_CATEGORIES).sort(),
    medium: Array.from(MEDIUM_PRIORITY_CATEGORIES).sort(),
  };
}
