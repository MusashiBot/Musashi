// Category Priority System
// Boosts confidence for high-priority categories (tech/AI/crypto)
// Target audience: tech circle wants MORE matches for these topics

import { Market } from '../types/market';

// High priority categories get confidence boost
const HIGH_PRIORITY_CATEGORIES = new Set([
  // AI & Tech (HIGHEST PRIORITY)
  'ai',
  'artificial intelligence',
  'tech',
  'technology',
  'ai safety',
  'agi',
  'llm',
  'machine learning',
  'ml',
  'software',
  'startups',
  'silicon valley',

  // Crypto & Web3 (HIGH PRIORITY)
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'ethereum',
  'defi',
  'web3',
  'blockchain',
  'nft',

  // Economics & Finance (MEDIUM-HIGH PRIORITY)
  'economics',
  'finance',
  'stocks',
  'fed',
  'interest rates',
  'inflation',
  'recession',
  'banking',
  'fintech',
]);

// Medium priority - politics, business, science
const MEDIUM_PRIORITY_CATEGORIES = new Set([
  'politics',
  'us politics',
  'elections',
  'policy',
  'business',
  'companies',
  'ipo',
  'science',
  'research',
  'climate',
  'energy',
]);

/**
 * Get confidence boost multiplier for market category
 * Returns value to ADD to confidence (not multiply)
 */
export function getCategoryPriorityBoost(market: Market): number {
  const category = market.category.toLowerCase().trim();

  // Check for exact or partial matches in high priority
  for (const highPri of HIGH_PRIORITY_CATEGORIES) {
    if (category === highPri || category.includes(highPri) || highPri.includes(category)) {
      // HIGH PRIORITY: +0.15 boost (significant)
      return 0.15;
    }
  }

  // Check for medium priority
  for (const medPri of MEDIUM_PRIORITY_CATEGORIES) {
    if (category === medPri || category.includes(medPri) || medPri.includes(category)) {
      // MEDIUM PRIORITY: +0.05 boost (moderate)
      return 0.05;
    }
  }

  // Low priority / other categories: no boost
  return 0.0;
}

/**
 * Check if market is in a high-priority category
 * Used for lowering effective threshold
 */
export function isHighPriorityCategory(market: Market): boolean {
  const category = market.category.toLowerCase().trim();

  for (const highPri of HIGH_PRIORITY_CATEGORIES) {
    if (category === highPri || category.includes(highPri) || highPri.includes(category)) {
      return true;
    }
  }

  return false;
}

/**
 * Get effective confidence threshold for a market
 * High-priority categories have lower threshold (easier to match)
 */
export function getEffectiveThreshold(market: Market, baseThreshold: number): number {
  if (isHighPriorityCategory(market)) {
    // Lower threshold by 33% for high-priority categories
    // e.g. 0.15 base → 0.10 for AI/crypto
    return baseThreshold * 0.67;
  }

  return baseThreshold;
}
