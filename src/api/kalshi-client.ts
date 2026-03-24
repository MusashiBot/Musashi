// Kalshi public API client
// Fetches live open markets and maps them to the internal Market interface.
// No authentication required — these are public read-only endpoints.

import { Market } from '../types/market';
import { generateKeywords } from './keyword-generator';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const FETCH_TIMEOUT_MS = 10000; // 10s timeout to prevent hanging on cold starts

// Shape of a market object returned by the Kalshi REST API
interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  title: string;
  market_type?: string;
  mve_collection_ticker?: string; // present only on multi-variable event (parlay) markets
  yes_ask: number;          // cents (0–100)
  yes_ask_dollars?: number; // same in dollars (0–1), prefer this if present
  yes_bid: number;
  yes_bid_dollars?: number;
  no_ask: number;
  no_bid: number;
  last_price?: number;      // last trade price for YES in cents
  last_price_dollars?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  close_time?: string;
  status?: string;
}

interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor?: string;
}

interface FetchKalshiMarketsOptions {
  includeNonBinary?: boolean;
  excludeMve?: boolean;
}

/**
 * Returns true for binary Kalshi markets we can map into the shared Market
 * model. Keep this intentionally close to the Polymarket filter so we maximize
 * coverage for demo/API usage.
 */
function isBinaryMarket(km: KalshiMarket): boolean {
  if (!km.title || !km.ticker) return false;
  if (km.market_type && km.market_type !== 'binary') return false;

  return true;
}

/**
 * Fetch open markets from Kalshi's public API using cursor pagination.
 *
 * The default API ordering can include a mix of market shapes. We keep the
 * fetcher intentionally broad and rely on binary-market filtering plus later
 * matching logic to decide what is useful.
 *
 * Stops when we reach `targetSimpleCount` binary markets or exhaust `maxPages`.
 */
export async function fetchKalshiMarkets(
  targetSimpleCount = 400,
  maxPages = 15,
  options: FetchKalshiMarketsOptions = {},
): Promise<Market[]> {
  const PAGE_SIZE = 200;
  const allMarkets: Market[] = [];
  let cursor: string | undefined;
  const includeNonBinary = options.includeNonBinary === true;
  const excludeMve = options.excludeMve !== false;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      status: 'open',
      limit: String(PAGE_SIZE),
    });

    if (excludeMve) {
      params.set('mve_filter', 'exclude');
    }

    if (cursor) {
      params.set('cursor', cursor);
    }

    const url = `${KALSHI_API}/markets?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        console.error(`[Musashi SW] Kalshi HTTP ${resp.status} — declarativeNetRequest header stripping may not be active yet`);

        // Preserve already-fetched pages for demo/local usage instead of
        // discarding the whole platform when a later page gets rate-limited.
        if (allMarkets.length > 0 && resp.status === 429) {
          console.warn(
            `[Musashi] Kalshi rate-limited after ${page} pages; ` +
            `returning ${allMarkets.length} partial markets. ` +
            `Reduce KALSHI_MAX_PAGES / KALSHI_TARGET_COUNT if you want fewer 429s.`,
          );
          break;
        }

        throw new Error(`Kalshi API responded with ${resp.status}`);
      }

      const data = await resp.json() as KalshiMarketsResponse;
      if (!Array.isArray(data.markets)) {
        throw new Error('Unexpected Kalshi API response shape');
      }

      const pageMarkets = data.markets
        .filter((market) => includeNonBinary || isBinaryMarket(market))
        .map(toMarket)
        .filter(m => m.yesPrice > 0 && m.yesPrice < 1);

      allMarkets.push(...pageMarkets);

      console.log(
        `[Musashi] Kalshi page ${page + 1}: ${data.markets.length} raw → ` +
        `${pageMarkets.length} ${includeNonBinary ? 'usable' : 'binary'} ` +
        `(total ${includeNonBinary ? 'usable' : 'binary'}: ${allMarkets.length})`
      );

      // Stop early once we have enough, or when the API has no more pages
      if (allMarkets.length >= targetSimpleCount || !data.cursor) break;
      cursor = data.cursor;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        if (allMarkets.length > 0) {
          console.warn(
            `[Musashi] Kalshi timed out after ${page} pages; ` +
            `returning ${allMarkets.length} partial markets`,
          );
          break;
        }

        throw new Error(`Kalshi API request timed out after ${FETCH_TIMEOUT_MS}ms`);
      }

      if (allMarkets.length > 0) {
        console.warn(
          `[Musashi] Kalshi fetch failed after ${page} pages; ` +
          `returning ${allMarkets.length} partial markets (${String(error)})`,
        );
        break;
      }

      throw error;
    }
  }

  console.log(`[Musashi] Fetched ${allMarkets.length} live markets from Kalshi`);
  return allMarkets.slice(0, targetSimpleCount);
}

/** Map a raw Kalshi market object to our Market interface */
function toMarket(km: KalshiMarket): Market {
  // Prefer the _dollars variant (already 0–1); fall back to /100 conversion
  let yesPrice: number;
  if (km.yes_bid_dollars != null && km.yes_ask_dollars != null && km.yes_ask_dollars > 0) {
    yesPrice = (km.yes_bid_dollars + km.yes_ask_dollars) / 2;
  } else if (km.yes_bid != null && km.yes_ask != null && km.yes_ask > 0) {
    yesPrice = ((km.yes_bid + km.yes_ask) / 2) / 100;
  } else if (km.last_price_dollars != null && km.last_price_dollars > 0) {
    yesPrice = km.last_price_dollars;
  } else if (km.last_price != null && km.last_price > 0) {
    yesPrice = km.last_price / 100;
  } else {
    yesPrice = 0.5;
  }

  const safeYes = Math.min(Math.max(yesPrice, 0.01), 0.99);
  const safeNo  = +((1 - safeYes).toFixed(2));

  // ── URL construction ───────────────────────────────────────────────────────
  // Kalshi web URLs follow: kalshi.com/markets/{series}/{slug}/{event_ticker}
  // The API does NOT return series_ticker, so we always derive it via extractSeriesTicker().
  // The middle slug segment is SEO-only; Kalshi redirects any slug to the canonical one.
  // The final segment MUST be the event_ticker (not market ticker), lowercase.
  const seriesTicker = (km.series_ticker || extractSeriesTicker(km.event_ticker ?? km.ticker))
    .toLowerCase();
  const eventTickerLower = (km.event_ticker ?? km.ticker).toLowerCase();
  const titleSlug = slugify(km.title);
  const marketUrl = `https://kalshi.com/markets/${seriesTicker}/${titleSlug}/${eventTickerLower}`;

  return {
    id: `kalshi-${km.ticker}`,
    platform: 'kalshi',
    title: km.title,
    description: '',
    keywords: generateKeywords(km.title),
    yesPrice: +safeYes.toFixed(2),
    noPrice: safeNo,
    volume24h: km.volume_24h ?? km.volume ?? 0,
    url: marketUrl,
    category: inferCategory(km.series_ticker || km.event_ticker || km.ticker),
    lastUpdated: new Date().toISOString(),
  };
}

/** Convert a market title to a URL-safe slug (middle segment of Kalshi URLs) */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extracts the series ticker from an event_ticker or market ticker.
 * Kalshi event tickers follow: {SERIES}-{DATE_OR_DESCRIPTOR}
 * e.g. "KXBTC-26FEB1708"  → "KXBTC"
 *      "KXGEMINI-VS-CHATGPT" → "KXGEMINI"
 *      "PRES-DEM-2024" → "PRES"
 */
function extractSeriesTicker(ticker: string): string {
  // Try splitting on '-' and returning up to the first segment that
  // looks like a date (digits followed by letters) or is all-caps alpha-only
  const parts = ticker.split('-');
  if (parts.length === 1) return parts[0];

  // If second segment starts with digits (looks like a date: 26FEB, 2024, etc.)
  // → series is just the first part
  if (/^\d/.test(parts[1])) return parts[0];

  // Otherwise return the first two parts joined
  // e.g. KXGEMINI-VS → "KXGEMINI-VS" would still 404; just use first segment
  return parts[0];
}

/** Infer a rough category from the market's series/event ticker prefix */
function inferCategory(ticker: string): string {
  const t = ticker.toUpperCase();
  if (/BTC|ETH|CRYPTO|SOL|XRP|DOGE|NFT|DEFI/.test(t))  return 'crypto';
  if (/FED|CPI|GDP|INFL|RATE|ECON|UNEMP|JOBS|RECESS/.test(t)) return 'economics';
  if (/TRUMP|BIDEN|PRES|CONG|SENATE|ELECT|GOP|DEM|HOUSE/.test(t)) return 'us_politics';
  if (/NVDA|AAPL|MSFT|GOOGL|META|AMZN|AI|TECH|TSLA|OPENAI/.test(t)) return 'technology';
  if (/NFL|NBA|MLB|NHL|SPORT|SUPER|WORLD|FIFA|GOLF|TENNIS/.test(t)) return 'sports';
  if (/CLIMATE|TEMP|WEATHER|CARBON|EMISS|ENERGY|OIL/.test(t)) return 'climate';
  if (/UKRAIN|RUSSIA|CHINA|NATO|TAIWAN|ISRAEL|GAZA|IRAN/.test(t)) return 'geopolitics';
  return 'other';
}
