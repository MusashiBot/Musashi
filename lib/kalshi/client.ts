import type { Market } from '../types';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const FETCH_TIMEOUT_MS = 15000;

interface KalshiMarketRaw {
  ticker: string;
  event_ticker?: string;
  title: string;
  yes_bid?: number;
  yes_ask?: number;
  yes_bid_dollars?: number;
  yes_ask_dollars?: number;
  last_price?: number;
  last_price_dollars?: number;
  volume_24h?: number;
  close_time?: string;
  series_ticker?: string;
  subtitle?: string;
  cap_strike?: number;
  floor_strike?: number;
}

interface KalshiResponse {
  markets: KalshiMarketRaw[];
  cursor?: string;
}

function isSimpleMarket(km: KalshiMarketRaw): boolean {
  return (
    !km.subtitle &&
    km.cap_strike == null &&
    km.floor_strike == null &&
    (km.yes_bid != null || km.yes_ask != null || km.last_price != null)
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractSeriesTicker(ticker: string): string {
  const match = ticker.match(/^([A-Z]+)-/);
  return match ? match[1] : ticker.split('-')[0] || 'DEFAULT';
}

function inferCategory(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (upper.includes('PRES') || upper.includes('SENATE') || upper.includes('HOUSE')) return 'politics';
  if (upper.includes('FED') || upper.includes('RATE') || upper.includes('GDP')) return 'economics';
  if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('CRYPTO')) return 'crypto';
  if (upper.includes('AAPL') || upper.includes('TSLA') || upper.includes('AMZN')) return 'tech';
  if (upper.includes('NFL') || upper.includes('NBA') || upper.includes('MLB')) return 'sports';
  return 'general';
}

function generateKeywords(title: string): string[] {
  const tokens = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
  return [...new Set(tokens)];
}

function toMarket(km: KalshiMarketRaw): Market {
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
  const safeNo = +(1 - safeYes).toFixed(2);

  const seriesTicker = (km.series_ticker || extractSeriesTicker(km.event_ticker ?? km.ticker)).toLowerCase();
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
    volume24h: km.volume_24h ?? 0,
    url: marketUrl,
    category: inferCategory(km.ticker),
    lastUpdated: new Date().toISOString(),
    endDate: km.close_time,
  };
}

export async function fetchKalshiMarkets(
  targetCount = 400,
  maxPages = 15
): Promise<Market[]> {
  const PAGE_SIZE = 200;
  const allSimple: Market[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = cursor
      ? `${KALSHI_API}/markets?status=open&mve_filter=exclude&limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
      : `${KALSHI_API}/markets?status=open&mve_filter=exclude&limit=${PAGE_SIZE}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        console.error(`[Kalshi] HTTP ${resp.status}`);
        throw new Error(`Kalshi API responded with ${resp.status}`);
      }

      const data: KalshiResponse = await resp.json();

      if (!Array.isArray(data.markets)) {
        throw new Error('Unexpected Kalshi API response shape');
      }

      const pageSimple = data.markets
        .filter(isSimpleMarket)
        .map(toMarket)
        .filter(m => m.yesPrice > 0 && m.yesPrice < 1);

      allSimple.push(...pageSimple);

      console.log(
        `[Kalshi] Page ${page + 1}: ${data.markets.length} raw → ${pageSimple.length} simple (total: ${allSimple.length})`
      );

      if (allSimple.length >= targetCount || !data.cursor) break;
      cursor = data.cursor;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Kalshi API request timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw error;
    }
  }

  console.log(`[Kalshi] Fetched ${allSimple.length} live markets`);
  return allSimple;
}
