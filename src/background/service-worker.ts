// Musashi Service Worker
// Fetches Polymarket + Kalshi markets (bypasses CORS) and stores them in chrome.storage.
// Content script reads from storage — no large-payload message passing needed.

import { fetchPolymarkets } from '../api/polymarket-client';
import { fetchKalshiMarkets } from '../api/kalshi-client';
import { detectArbitrage } from '../api/arbitrage-detector';
import { ArbitrageOpportunity, Market } from '../types/market';
import { analyzeTextWithArbitrage } from '../analysis/analyze-text';
import { recordBulkSnapshots, getMovers, cleanupOldHistory } from '../api/price-tracker';
import { parallelFetchPolymarketPrices } from '../api/polymarket-price-poller';

// v2 key — invalidates the old Polymarket-only cache so combined data is fetched fresh
const STORAGE_KEY_MARKETS = 'markets_v2';
const STORAGE_KEY_TS      = 'marketsTs_v2';
const STORAGE_KEY_ARBITRAGE = 'arbitrage_v1';
const STORAGE_KEY_ARBITRAGE_TS = 'arbitrageTs_v1';
const CACHE_TTL_MS        = 5 * 60 * 1000; // 5 minutes (reduced from 30)
const NETWORK_RULESET_ID = 'ruleset_1';

// Price polling configuration
const PRICE_POLL_INTERVAL_MS = 5 * 60 * 1000; // Poll every 5 minutes (reduced from 60s to save CPU)
const TOP_MARKETS_COUNT = 20; // Track top 20 markets by volume (reduced from 50 to save resources)

console.log('[Musashi SW] Service worker initialized');

// Ensure declarativeNetRequest ruleset is enabled before any API fetches.
async function ensureNetworkRulesReady(): Promise<void> {
  if (!chrome.declarativeNetRequest?.getEnabledRulesets) return;

  const enabledRulesets = await new Promise<string[]>((resolve, reject) => {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(rulesets ?? []);
    });
  });

  if (enabledRulesets.includes(NETWORK_RULESET_ID)) return;

  await new Promise<void>((resolve, reject) => {
    chrome.declarativeNetRequest.updateEnabledRulesets(
      { enableRulesetIds: [NETWORK_RULESET_ID] },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });

  console.log(`[Musashi SW] Enabled DNR ruleset: ${NETWORK_RULESET_ID}`);
}

const bootstrapPromise = ensureNetworkRulesReady().catch((error) => {
  console.warn('[Musashi SW] Failed to verify/enable DNR ruleset:', error);
});

// ── Proactive fetch on install / browser startup ──────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  bootstrapPromise.then(() => refreshMarkets());
  startPricePolling();
});
chrome.runtime.onStartup.addListener(() => {
  bootstrapPromise.then(() => refreshMarkets());
  startPricePolling();
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Content script asks for markets (cache miss or first load)
  if (message.type === 'FETCH_MARKETS') {
    chrome.storage.local.get([STORAGE_KEY_MARKETS, STORAGE_KEY_TS]).then(async (cached) => {
      const ts: number = cached[STORAGE_KEY_TS] ?? 0;
      const markets = cached[STORAGE_KEY_MARKETS];

      // Return cached if fresh
      if (Array.isArray(markets) && markets.length > 0 && Date.now() - ts < CACHE_TTL_MS) {
        console.log(`[Musashi SW] Returning ${markets.length} cached markets`);
        sendResponse({ markets });
        return;
      }

      // Fetch fresh
      console.log('[Musashi SW] Fetching fresh markets from Polymarket + Kalshi...');
      await bootstrapPromise;
      const fresh = await refreshMarkets();
      sendResponse({ markets: fresh });
    }).catch((e) => {
      console.error('[Musashi SW] FETCH_MARKETS error:', e);
      sendResponse({ markets: [] });
    });
    return true; // keep channel open for async
  }

  // Badge update from content script
  if (message.type === 'UPDATE_BADGE') {
    const count = message.count || 0;
    if (sender.tab?.id) {
      chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '', tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#A8C5DD', tabId: sender.tab.id });
    }
    sendResponse({ success: true });
    return true;
  }

  // Get arbitrage opportunities
  if (message.type === 'GET_ARBITRAGE') {
    chrome.storage.local.get([STORAGE_KEY_ARBITRAGE, STORAGE_KEY_ARBITRAGE_TS, STORAGE_KEY_MARKETS]).then((cached) => {
      const arbitrageTs: number = cached[STORAGE_KEY_ARBITRAGE_TS] ?? 0;
      const cachedArbitrage = cached[STORAGE_KEY_ARBITRAGE];

      // Return cached arbitrage if fresh (same TTL as markets)
      if (Array.isArray(cachedArbitrage) && Date.now() - arbitrageTs < CACHE_TTL_MS) {
        console.log(`[Musashi SW] Returning ${cachedArbitrage.length} cached arbitrage opportunities`);
        const filtered = filterArbitrage(cachedArbitrage, message.minSpread, message.category);
        sendResponse({ opportunities: filtered });
        return;
      }

      // Compute fresh arbitrage from cached markets
      const markets = cached[STORAGE_KEY_MARKETS];
      if (Array.isArray(markets) && markets.length > 0) {
        const opportunities = detectArbitrage(markets, 0.01); // Lower threshold for storage
        chrome.storage.local.set({
          [STORAGE_KEY_ARBITRAGE]: opportunities,
          [STORAGE_KEY_ARBITRAGE_TS]: Date.now(),
        });
        console.log(`[Musashi SW] Computed and cached ${opportunities.length} arbitrage opportunities`);
        const filtered = filterArbitrage(opportunities, message.minSpread, message.category);
        sendResponse({ opportunities: filtered });
      } else {
        console.log('[Musashi SW] No markets available for arbitrage detection');
        sendResponse({ opportunities: [] });
      }
    }).catch((e) => {
      console.error('[Musashi SW] GET_ARBITRAGE error:', e);
      sendResponse({ opportunities: [] });
    });
    return true; // keep channel open for async
  }

  // Analyze text with full signal generation (for bot developers / API)
  if (message.type === 'ANALYZE_TEXT_WITH_SIGNALS') {
    chrome.storage.local.get([STORAGE_KEY_MARKETS, STORAGE_KEY_ARBITRAGE]).then(async (cached) => {
      const markets = cached[STORAGE_KEY_MARKETS] ?? [];
      const arbitrage = cached[STORAGE_KEY_ARBITRAGE] ?? [];

      if (!Array.isArray(markets) || markets.length === 0) {
        console.log('[Musashi SW] No markets available for analysis');
        sendResponse({ signal: null, error: 'No markets loaded' });
        return;
      }

      try {
        const signal = await analyzeTextWithArbitrage(
          message.text,
          markets,
          arbitrage,
          {
            minConfidence: message.minConfidence ?? 0.3,
            maxResults: message.maxResults ?? 5,
          }
        );
        console.log(`[Musashi SW] Generated signal: ${signal.signal_type} (${signal.urgency})`);
        sendResponse({ signal });
      } catch (error) {
        console.error('[Musashi SW] ANALYZE_TEXT_WITH_SIGNALS error:', error);
        sendResponse({ signal: null, error: String(error) });
      }
    }).catch((e) => {
      console.error('[Musashi SW] ANALYZE_TEXT_WITH_SIGNALS error:', e);
      sendResponse({ signal: null, error: String(e) });
    });
    return true; // keep channel open for async
  }

  // Get market movers (markets with significant price changes)
  if (message.type === 'GET_MOVERS') {
    chrome.storage.local.get([STORAGE_KEY_MARKETS]).then(async (cached) => {
      const markets = cached[STORAGE_KEY_MARKETS] ?? [];

      if (!Array.isArray(markets) || markets.length === 0) {
        console.log('[Musashi SW] No markets available for movers detection');
        sendResponse({ movers: [] });
        return;
      }

      try {
        const movers = await getMovers(markets, {
          minChange: message.minChange ?? 0.05,
          timeframe: message.timeframe ?? '1h',
          limit: message.limit ?? 20,
          forceRefresh: message.forceRefresh ?? false,
        });
        console.log(`[Musashi SW] Returning ${movers.length} movers`);
        sendResponse({ movers });
      } catch (error) {
        console.error('[Musashi SW] GET_MOVERS error:', error);
        sendResponse({ movers: [] });
      }
    }).catch((e) => {
      console.error('[Musashi SW] GET_MOVERS error:', e);
      sendResponse({ movers: [] });
    });
    return true; // keep channel open for async
  }
});

// Clear badge when navigating away from Twitter/X
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const url = tab.url || '';
    if (!url.includes('twitter.com') && !url.includes('x.com')) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// ── Helper: Filter arbitrage opportunities ───────────────────────────────────

function filterArbitrage(
  opportunities: ArbitrageOpportunity[],
  minSpread?: number,
  category?: string
): ArbitrageOpportunity[] {
  let filtered = opportunities;

  if (minSpread !== undefined) {
    filtered = filtered.filter(op => op.spread >= minSpread);
  }

  if (category) {
    filtered = filtered.filter(
      op => op.polymarket.category === category || op.kalshi.category === category
    );
  }

  return filtered;
}

// ── Market refresh ────────────────────────────────────────────────────────────

async function refreshMarkets() {
  try {
    // Fetch both sources in parallel; if one fails the other still contributes
    const [polyResult, kalshiResult] = await Promise.allSettled([
      fetchPolymarkets(1000, 15),
      fetchKalshiMarkets(400, 15),
    ]);

    const polyMarkets  = polyResult.status   === 'fulfilled' ? polyResult.value   : [];
    const kalshiMarkets = kalshiResult.status === 'fulfilled' ? kalshiResult.value : [];

    if (polyResult.status === 'rejected') {
      console.warn('[Musashi SW] Polymarket fetch failed:', polyResult.reason);
    }
    if (kalshiResult.status === 'rejected') {
      console.warn('[Musashi SW] Kalshi fetch failed:', kalshiResult.reason);
    }

    // Merge; dedup by id just in case
    const seen = new Set<string>();
    const markets = [...polyMarkets, ...kalshiMarkets].filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    console.log(
      `[Musashi SW] Fetched ${polyMarkets.length} Polymarket + ` +
      `${kalshiMarkets.length} Kalshi = ${markets.length} total markets`
    );

    if (markets.length > 0) {
      // Detect arbitrage opportunities
      const arbitrageOpportunities = detectArbitrage(markets, 0.01); // Low threshold for storage
      console.log(`[Musashi SW] Detected ${arbitrageOpportunities.length} arbitrage opportunities`);

      // Record price snapshots for price tracking
      await recordBulkSnapshots(markets);

      await chrome.storage.local.set({
        [STORAGE_KEY_MARKETS]: markets,
        [STORAGE_KEY_TS]: Date.now(),
        [STORAGE_KEY_ARBITRAGE]: arbitrageOpportunities,
        [STORAGE_KEY_ARBITRAGE_TS]: Date.now(),
      });
      console.log(`[Musashi SW] Stored ${markets.length} markets + ${arbitrageOpportunities.length} arbitrage opportunities + price snapshots`);
    }
    // Clear any previous ERR badge
    chrome.action.setBadgeText({ text: '' });
    return markets;
  } catch (e) {
    console.error('[Musashi SW] refreshMarkets failed:', e);
    // Show red ERR badge on ALL tabs so the user can see without opening any console
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
    return [];
  }
}

// ── Price polling for movers detection ────────────────────────────────────────

let pricePollingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start polling prices for top markets by volume
 */
function startPricePolling() {
  // Clear any existing interval
  if (pricePollingInterval) {
    clearInterval(pricePollingInterval);
  }

  console.log('[Musashi SW] Starting price polling (5min interval)');

  // Poll immediately
  pollTopMarketPrices();

  // Then poll every 5 minutes
  pricePollingInterval = setInterval(() => {
    pollTopMarketPrices();
  }, PRICE_POLL_INTERVAL_MS);

  // Cleanup old history every 6 hours (reduced frequency)
  setInterval(() => {
    cleanupOldHistory();
  }, 6 * 60 * 60 * 1000);
}

/**
 * Poll prices for the top markets by volume
 * Fetches fresh prices from Polymarket CLOB API for lightweight updates
 */
async function pollTopMarketPrices() {
  try {
    // Get cached markets
    const cached = await chrome.storage.local.get([STORAGE_KEY_MARKETS]);
    const markets: Market[] = cached[STORAGE_KEY_MARKETS] ?? [];

    if (markets.length === 0) {
      console.log('[Musashi SW] No markets cached, skipping price poll');
      return;
    }

    // Get top markets by volume (create copy to avoid mutating original array)
    const topMarkets = [...markets]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_MARKETS_COUNT);

    console.log(`[Musashi SW] Polling prices for top ${topMarkets.length} markets`);

    // Fetch fresh prices from Polymarket CLOB API
    // Only Polymarket markets with numericId will be updated
    // Kalshi markets keep their cached prices until next full refresh
    const freshMarkets = await parallelFetchPolymarketPrices(topMarkets, 5);

    // Update cached markets with fresh prices
    const marketMap = new Map(markets.map(m => [m.id, m]));
    for (const fresh of freshMarkets) {
      marketMap.set(fresh.id, fresh);
    }
    const updatedMarkets = Array.from(marketMap.values());

    // Save updated markets back to cache
    await chrome.storage.local.set({
      [STORAGE_KEY_MARKETS]: updatedMarkets,
    });

    // Record snapshots with fresh prices
    await recordBulkSnapshots(freshMarkets);

    const polyCount = freshMarkets.filter(m => m.platform === 'polymarket').length;
    console.log(`[Musashi SW] Recorded ${freshMarkets.length} price snapshots (${polyCount} Polymarket, ${freshMarkets.length - polyCount} Kalshi)`);

    // Detect movers in the background (this will cache them)
    const movers = await getMovers(updatedMarkets, {
      minChange: 0.05,
      timeframe: '1h',
      limit: 20,
      forceRefresh: true,
    });

    if (movers.length > 0) {
      console.log(
        `[Musashi SW] Detected ${movers.length} movers - ` +
        `Top: ${movers[0].market.title.substring(0, 50)} ` +
        `(${movers[0].direction === 'up' ? '+' : ''}${(movers[0].priceChange1h * 100).toFixed(1)}%)`
      );
    }

  } catch (error) {
    console.error('[Musashi SW] Price polling error:', error);
  }
}

export {};
