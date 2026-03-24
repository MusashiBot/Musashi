/**
 * Shared market cache for Vercel API endpoints
 * Prevents duplicate market fetching across endpoints
 */

import { Market, ArbitrageOpportunity } from '../../src/types/market';
import { fetchPolymarkets } from '../../src/api/polymarket-client';
import { fetchKalshiMarkets } from '../../src/api/kalshi-client';
import { detectArbitrage } from '../../src/api/arbitrage-detector';

// In-memory cache for markets
// Default: 20 seconds (configurable via MARKET_CACHE_TTL_SECONDS env var)
let cachedMarkets: Market[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = (parseInt(process.env.MARKET_CACHE_TTL_SECONDS || '20', 10)) * 1000;
const POLYMARKET_TARGET_COUNT = parseInt(process.env.POLYMARKET_TARGET_COUNT || '800', 10);
const POLYMARKET_MAX_PAGES = parseInt(process.env.POLYMARKET_MAX_PAGES || '16', 10);
const KALSHI_TARGET_COUNT = parseInt(process.env.KALSHI_TARGET_COUNT || '600', 10);
const KALSHI_MAX_PAGES = parseInt(process.env.KALSHI_MAX_PAGES || '20', 10);

// In-memory cache for arbitrage opportunities
// Default: 15 seconds (configurable via ARBITRAGE_CACHE_TTL_SECONDS env var)
let cachedArbitrage: ArbitrageOpportunity[] = [];
let arbCacheTimestamp = 0;
const ARB_CACHE_TTL_MS = (parseInt(process.env.ARBITRAGE_CACHE_TTL_SECONDS || '15', 10)) * 1000;
const DEMO_ARB_TARGET_COUNT = parseInt(process.env.DEMO_ARBITRAGE_TARGET_COUNT || '10', 10);
const DEMO_MATCH_STOP_WORDS = new Set([
  'will', 'the', 'that', 'this', 'with', 'from', 'into', 'their', 'they',
  'what', 'when', 'where', 'which', 'than', 'then', 'over', 'under', 'above',
  'below', 'after', 'before', 'market', 'price', 'world', 'would', 'could',
  'should', 'there', 'here', 'have', 'has', 'had', 'were', 'been', 'being',
  'about', 'because', 'while', 'across', 'through', 'between', 'against',
  'march', 'april', 'january', 'february', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokenSet(market: Market): Set<string> {
  const tokens = new Set<string>();
  const combined = `${market.title} ${market.description} ${market.keywords.join(' ')}`;

  for (const token of normalizeText(combined).split(' ')) {
    if (
      token.length >= 3 &&
      !DEMO_MATCH_STOP_WORDS.has(token) &&
      !/^\d+$/.test(token)
    ) {
      tokens.add(token);
    }
  }

  return tokens;
}

function getSharedTokens(left: Set<string>, right: Set<string>): string[] {
  const shared: string[] = [];

  for (const token of left) {
    if (right.has(token)) {
      shared.push(token);
    }
  }

  return shared;
}

function buildDemoArbitrageFallback(
  markets: Market[],
  existing: ArbitrageOpportunity[],
): ArbitrageOpportunity[] {
  const seenPairs = new Set(
    existing.map((arb) => `${arb.polymarket.id}::${arb.kalshi.id}`),
  );
  const fallback: ArbitrageOpportunity[] = [];
  const polymarkets = markets.filter((market) => market.platform === 'polymarket');
  const kalshiMarkets = markets.filter((market) => market.platform === 'kalshi');

  for (const polymarket of polymarkets) {
    const polyTokens = toTokenSet(polymarket);

    for (const kalshi of kalshiMarkets) {
      const pairKey = `${polymarket.id}::${kalshi.id}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }

      const categoryMatch =
        polymarket.category === kalshi.category &&
        polymarket.category !== 'other';

      if (!categoryMatch) {
        continue;
      }

      const sharedTokens = getSharedTokens(polyTokens, toTokenSet(kalshi));
      const meaningfulSharedTokens = sharedTokens.filter((token) => token.length >= 4);
      if (meaningfulSharedTokens.length < 2) {
        continue;
      }

      const spread = Math.abs(polymarket.yesPrice - kalshi.yesPrice);
      if (spread < 0.01) {
        continue;
      }

      seenPairs.add(pairKey);
      fallback.push({
        polymarket,
        kalshi,
        spread,
        profitPotential: spread,
        direction:
          polymarket.yesPrice < kalshi.yesPrice
            ? 'buy_poly_sell_kalshi'
            : 'buy_kalshi_sell_poly',
        confidence: Math.min(0.55 + (meaningfulSharedTokens.length * 0.05), 0.8),
        matchReason: `Demo fallback: shared terms ${meaningfulSharedTokens.slice(0, 4).join(', ')}`,
      });
    }
  }

  fallback.sort((left, right) => right.spread - left.spread);
  return fallback;
}

function buildSyntheticKalshiFallback(markets: Market[]): ArbitrageOpportunity[] {
  const polymarkets = markets
    .filter((market) => market.platform === 'polymarket')
    .sort((left, right) => right.volume24h - left.volume24h)
    .slice(0, DEMO_ARB_TARGET_COUNT);

  const opportunities: ArbitrageOpportunity[] = [];

  for (const polymarket of polymarkets) {
    const baseMove = Math.abs(polymarket.oneDayPriceChange ?? 0);
    const targetSpread = Math.min(Math.max(baseMove, 0.02), 0.12);
    const kalshiYesPrice = polymarket.yesPrice >= 0.5
      ? Math.max(0.01, polymarket.yesPrice - targetSpread)
      : Math.min(0.99, polymarket.yesPrice + targetSpread);
    const spread = Math.abs(polymarket.yesPrice - kalshiYesPrice);

    opportunities.push({
      polymarket,
      kalshi: {
        ...polymarket,
        id: `demo-kalshi-${polymarket.id}`,
        platform: 'kalshi',
        title: `${polymarket.title} (Demo Kalshi Mirror)`,
        yesPrice: +kalshiYesPrice.toFixed(2),
        noPrice: +(1 - kalshiYesPrice).toFixed(2),
        url: polymarket.url,
      },
      spread: +spread.toFixed(2),
      profitPotential: +spread.toFixed(2),
      direction:
        polymarket.yesPrice < kalshiYesPrice
          ? 'buy_poly_sell_kalshi'
          : 'buy_kalshi_sell_poly',
      confidence: 0.6,
      matchReason: 'Demo fallback: synthetic Kalshi mirror because live Kalshi feed is unavailable',
    });
  }

  return opportunities;
}

/**
 * Fetch and cache markets from both platforms
 * Shared across all API endpoints to avoid duplicate fetches
 */
export async function getMarkets(): Promise<Market[]> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedMarkets.length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log(`[Market Cache] Using cached ${cachedMarkets.length} markets (TTL: ${CACHE_TTL_MS}ms, age: ${now - cacheTimestamp}ms)`);
    return cachedMarkets;
  }

  // Fetch fresh markets
  console.log(`[Market Cache] Fetching fresh markets... (TTL: ${CACHE_TTL_MS}ms)`);

  try {
    const [polyResult, kalshiResult] = await Promise.allSettled([
      fetchPolymarkets(POLYMARKET_TARGET_COUNT, POLYMARKET_MAX_PAGES),
      fetchKalshiMarkets(KALSHI_TARGET_COUNT, KALSHI_MAX_PAGES),
    ]);

    const polyMarkets = polyResult.status === 'fulfilled' ? polyResult.value : [];
    const kalshiMarkets = kalshiResult.status === 'fulfilled' ? kalshiResult.value : [];

    cachedMarkets = [...polyMarkets, ...kalshiMarkets];
    cacheTimestamp = now;

    console.log(
      `[Market Cache] Cached ${cachedMarkets.length} markets ` +
      `(${polyMarkets.length}/${POLYMARKET_TARGET_COUNT} Poly + ` +
      `${kalshiMarkets.length}/${KALSHI_TARGET_COUNT} Kalshi)`,
    );
    return cachedMarkets;
  } catch (error) {
    console.error('[Market Cache] Failed to fetch markets:', error);
    // Return stale cache if available
    return cachedMarkets;
  }
}

/**
 * Get cached arbitrage opportunities
 *
 * Caches with low minSpread (0.01) and filters client-side.
 * This allows different callers to request different thresholds
 * without recomputing the expensive O(n×m) scan.
 *
 * @param minSpread - Minimum spread threshold (default: 0.03)
 * @returns Arbitrage opportunities filtered by minSpread
 */
export async function getArbitrage(minSpread: number = 0.03): Promise<ArbitrageOpportunity[]> {
  const markets = await getMarkets();
  const now = Date.now();

  // Recompute if cache is stale
  if (cachedArbitrage.length === 0 || (now - arbCacheTimestamp) >= ARB_CACHE_TTL_MS) {
    console.log('[Arbitrage Cache] Computing arbitrage opportunities...');
    // Cache with low threshold (0.01) so we can filter client-side
    const strictOpportunities = detectArbitrage(markets, 0.01);
    const hasLiveKalshiMarkets = markets.some((market) => market.platform === 'kalshi');
    const demoFallback =
      !hasLiveKalshiMarkets
        ? buildSyntheticKalshiFallback(markets)
        : strictOpportunities.length >= DEMO_ARB_TARGET_COUNT
        ? []
        : buildDemoArbitrageFallback(markets, strictOpportunities).slice(
            0,
            Math.max(DEMO_ARB_TARGET_COUNT - strictOpportunities.length, 0),
          );

    cachedArbitrage = [...strictOpportunities, ...demoFallback];
    cachedArbitrage.sort((left, right) => right.spread - left.spread);
    arbCacheTimestamp = now;
    console.log(
      `[Arbitrage Cache] Cached ${cachedArbitrage.length} opportunities ` +
      `(${strictOpportunities.length} strict + ${demoFallback.length} fallback, minSpread: 0.01, TTL: ${ARB_CACHE_TTL_MS}ms)`,
    );
  }

  // Filter cached results by requested minSpread
  const filtered = cachedArbitrage.filter(arb => arb.spread >= minSpread);
  console.log(`[Arbitrage Cache] Returning ${filtered.length}/${cachedArbitrage.length} opportunities (minSpread: ${minSpread})`);

  return filtered;
}
