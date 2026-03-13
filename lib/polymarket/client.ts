import type { Market } from '../types';

const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const FETCH_TIMEOUT_MS = 15000;

interface PolymarketRaw {
  id: string;
  conditionId: string;
  question: string;
  description?: string;
  outcomes: string;
  outcomePrices: string;
  volume24hr?: number;
  slug?: string;
  events?: Array<{ slug?: string }>;
  category?: string;
  oneDayPriceChange?: number;
  endDateIso?: string;
}

function isBinaryMarket(pm: PolymarketRaw): boolean {
  try {
    const outcomes = JSON.parse(pm.outcomes);
    return (
      Array.isArray(outcomes) &&
      outcomes.length === 2 &&
      outcomes.some(o => o.toLowerCase() === 'yes') &&
      outcomes.some(o => o.toLowerCase() === 'no')
    );
  } catch {
    return false;
  }
}

function inferCategory(question: string, apiCategory?: string): string {
  const lower = question.toLowerCase();
  if (apiCategory) {
    const cat = apiCategory.toLowerCase();
    if (cat.includes('politic')) return 'politics';
    if (cat.includes('crypto') || cat.includes('blockchain')) return 'crypto';
    if (cat.includes('sport')) return 'sports';
    if (cat.includes('tech')) return 'tech';
    if (cat.includes('business') || cat.includes('finance')) return 'finance';
  }

  if (lower.includes('trump') || lower.includes('election') || lower.includes('president')) return 'politics';
  if (lower.includes('bitcoin') || lower.includes('eth') || lower.includes('crypto')) return 'crypto';
  if (lower.includes('fed') || lower.includes('inflation') || lower.includes('recession')) return 'economics';
  if (lower.includes('ai') || lower.includes('tech') || lower.includes('apple') || lower.includes('tesla')) return 'tech';
  if (lower.includes('nfl') || lower.includes('nba') || lower.includes('soccer')) return 'sports';

  return 'general';
}

function generateKeywords(title: string, description: string = ''): string[] {
  const text = `${title} ${description}`;
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
  return [...new Set(tokens)];
}

function toMarket(pm: PolymarketRaw): Market {
  let yesPrice = 0.5;

  try {
    const prices = JSON.parse(pm.outcomePrices);
    const outcomes = JSON.parse(pm.outcomes);
    const yesIdx = outcomes.findIndex((o: string) => o.toLowerCase() === 'yes');

    if (yesIdx !== -1 && prices[yesIdx] != null) {
      yesPrice = parseFloat(prices[yesIdx]);
    }
  } catch {
    // fallback to 0.5
  }

  const safeYes = Math.min(Math.max(yesPrice, 0.01), 0.99);
  const safeNo = +(1 - safeYes).toFixed(2);

  return {
    id: `polymarket-${pm.conditionId}`,
    platform: 'polymarket',
    title: pm.question,
    description: pm.description ?? '',
    keywords: generateKeywords(pm.question, pm.description),
    yesPrice: +safeYes.toFixed(2),
    noPrice: safeNo,
    volume24h: pm.volume24hr ?? 0,
    url: `https://polymarket.com/event/${pm.events?.[0]?.slug ?? pm.slug}`,
    category: inferCategory(pm.question, pm.category),
    lastUpdated: new Date().toISOString(),
    oneDayPriceChange: pm.oneDayPriceChange ?? 0,
    endDate: pm.endDateIso,
  };
}

export async function fetchPolymarkets(
  targetCount = 500,
  maxPages = 10
): Promise<Market[]> {
  const PAGE_SIZE = 100;
  const allMarkets: Market[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = `${POLYMARKET_API}/markets?closed=false&active=true&order=volume24hrClob&ascending=false&limit=${PAGE_SIZE}&offset=${offset}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        console.error(`[Polymarket] HTTP ${resp.status}`);
        throw new Error(`Polymarket API responded with ${resp.status}`);
      }

      const data = await resp.json();

      if (!Array.isArray(data)) {
        throw new Error('Unexpected Polymarket API response shape');
      }

      if (data.length === 0) break;

      const pageBinary = data
        .filter(isBinaryMarket)
        .map(toMarket)
        .filter(m => m.yesPrice > 0 && m.yesPrice < 1);

      allMarkets.push(...pageBinary);

      console.log(
        `[Polymarket] Page ${page + 1}: ${data.length} raw → ${pageBinary.length} binary (total: ${allMarkets.length})`
      );

      if (allMarkets.length >= targetCount || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Polymarket API request timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw error;
    }
  }

  console.log(`[Polymarket] Fetched ${allMarkets.length} live markets`);
  return allMarkets.slice(0, targetCount);
}
