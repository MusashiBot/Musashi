// Category Filter - Filters markets to only relevant categories for tech audience
// Target audience: Tech circle (engineers, founders, VCs, crypto people)

import { Market } from '../types/market';

// Allowed categories for tech audience
const ALLOWED_CATEGORIES = new Set([
  // Tech & AI
  'ai',
  'artificial intelligence',
  'tech',
  'technology',
  'software',
  'silicon valley',
  'startups',
  'ai safety',
  'agi',
  'llm',
  'machine learning',
  'ml',

  // Crypto & Web3
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'ethereum',
  'defi',
  'web3',
  'blockchain',
  'nft',

  // Economics & Finance
  'economics',
  'finance',
  'stocks',
  'markets',
  'fed',
  'interest rates',
  'inflation',
  'recession',
  'economy',
  'banking',
  'fintech',

  // Politics & Policy
  'politics',
  'us politics',
  'elections',
  'congress',
  'president',
  'white house',
  'policy',
  'regulation',
  'government',
  'geopolitics',
  'international',
  'china',
  'trade',
  'tariffs',

  // Business & Startups
  'business',
  'companies',
  'ipo',
  'acquisitions',
  'm&a',
  'venture capital',
  'funding',

  // Science & Research
  'science',
  'research',
  'climate',
  'energy',
  'space',

  // General/Uncategorized
  'news',
  'current events',
  'world',
  'other',
  'miscellaneous',
  'trending',
]);

// Categories to explicitly EXCLUDE (entertainment, sports, pop culture)
const BLOCKED_CATEGORIES = new Set([
  // Sports
  'sports',
  'football',
  'soccer',
  'basketball',
  'baseball',
  'hockey',
  'nfl',
  'nba',
  'mlb',
  'nhl',
  'fifa',
  'uefa',
  'olympics',
  'tennis',
  'golf',
  'racing',
  'boxing',
  'mma',
  'ufc',
  'wrestling',
  'esports',
  'gaming tournaments',

  // Entertainment
  'entertainment',
  'movies',
  'film',
  'cinema',
  'box office',
  'hollywood',
  'tv',
  'television',
  'streaming',
  'netflix',
  'hulu',
  'disney',
  'tv shows',
  'series',
  'reality tv',
  'awards',
  'oscars',
  'emmys',
  'grammys',

  // Music
  'music',
  'concerts',
  'tours',
  'albums',
  'songs',
  'artists',
  'musicians',
  'bands',
  'hip hop',
  'rap',
  'pop',
  'rock',
  'country',
  'r&b',
  'edm',
  'festivals',
  'coachella',

  // Pop Culture
  'pop culture',
  'celebrities',
  'celebrity',
  'influencers',
  'tiktok',
  'youtube',
  'social media trends',
  'memes',
  'viral',

  // Gaming (not esports, just casual gaming)
  'gaming',
  'video games',
  'playstation',
  'xbox',
  'nintendo',
  'game releases',
  'gta',
  'minecraft',
  'fortnite',
  'zelda',
  'pokemon',

  // Anime & Manga
  'anime',
  'manga',
  'japanese animation',
  'cosplay',
  'conventions',

  // Fashion & Lifestyle
  'fashion',
  'style',
  'beauty',
  'makeup',
  'clothing',
  'brands',
  'luxury',
  'lifestyle',
  'food',
  'restaurants',
  'travel',
]);

/**
 * Filters markets to only include categories relevant to tech audience
 * Removes entertainment, sports, pop culture, etc.
 */
export function filterMarketsByCategory(markets: Market[]): Market[] {
  const filtered = markets.filter(market => {
    const category = market.category.toLowerCase().trim();

    // Check if explicitly blocked
    if (BLOCKED_CATEGORIES.has(category)) {
      return false;
    }

    // Check for partial matches in blocked categories
    // E.g. "nfl playoffs" should be blocked even if not exact match
    for (const blocked of BLOCKED_CATEGORIES) {
      if (category.includes(blocked) || blocked.includes(category)) {
        return false;
      }
    }

    // Check if allowed (or uncategorized)
    if (ALLOWED_CATEGORIES.has(category)) {
      return true;
    }

    // Check for partial matches in allowed categories
    for (const allowed of ALLOWED_CATEGORIES) {
      if (category.includes(allowed) || allowed.includes(category)) {
        return true;
      }
    }

    // If category is empty or unknown, allow it (better to show than miss)
    if (!category || category === '') {
      return true;
    }

    // Default: block unknown categories (safer for tech audience)
    console.log(`[Category Filter] Blocking unknown category: "${category}"`);
    return false;
  });

  const blockedCount = markets.length - filtered.length;
  if (blockedCount > 0) {
    console.log(`[Category Filter] Filtered out ${blockedCount} markets from blocked categories (${filtered.length} remaining)`);
  }

  return filtered;
}

/**
 * Check if a specific market category is allowed
 */
export function isCategoryAllowed(category: string): boolean {
  const lower = category.toLowerCase().trim();

  // Check if blocked
  if (BLOCKED_CATEGORIES.has(lower)) {
    return false;
  }

  // Check for partial match in blocked
  for (const blocked of BLOCKED_CATEGORIES) {
    if (lower.includes(blocked) || blocked.includes(lower)) {
      return false;
    }
  }

  // Check if allowed
  if (ALLOWED_CATEGORIES.has(lower)) {
    return true;
  }

  // Check for partial match in allowed
  for (const allowed of ALLOWED_CATEGORIES) {
    if (lower.includes(allowed) || allowed.includes(lower)) {
      return true;
    }
  }

  // Unknown categories blocked by default
  return false;
}
