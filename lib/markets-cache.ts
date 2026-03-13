import type { Market } from './types';
import { fetchKalshiMarkets } from './kalshi/client';
import { fetchPolymarkets } from './polymarket/client';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  markets: Market[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

export async function getAllMarkets(): Promise<Market[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache] Returning ${cache.markets.length} cached markets`);
    return cache.markets;
  }

  console.log('[Cache] Fetching fresh markets from Polymarket + Kalshi...');

  try {
    const [polyResult, kalshiResult] = await Promise.allSettled([
      fetchPolymarkets(500, 10),
      fetchKalshiMarkets(400, 15),
    ]);

    const polyMarkets = polyResult.status === 'fulfilled' ? polyResult.value : [];
    const kalshiMarkets = kalshiResult.status === 'fulfilled' ? kalshiResult.value : [];

    if (polyResult.status === 'rejected') {
      console.warn('[Cache] Polymarket fetch failed:', polyResult.reason);
    }
    if (kalshiResult.status === 'rejected') {
      console.warn('[Cache] Kalshi fetch failed:', kalshiResult.reason);
    }

    // Merge and dedupe by id
    const seen = new Set<string>();
    const markets = [...polyMarkets, ...kalshiMarkets].filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    console.log(
      `[Cache] Fetched ${polyMarkets.length} Polymarket + ${kalshiMarkets.length} Kalshi = ${markets.length} total markets`
    );

    // Update cache
    cache = { markets, timestamp: now };

    return markets;
  } catch (error) {
    console.error('[Cache] Error fetching markets:', error);
    // Return stale cache if available, otherwise empty array
    return cache?.markets ?? [];
  }
}

export function clearCache(): void {
  cache = null;
  console.log('[Cache] Cleared');
}
