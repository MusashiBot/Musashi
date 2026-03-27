import { BaseAPIClient } from './base-client.js';
import type { Market, MarketStatus } from '../types/market.js';

/**
 * Kalshi API response types
 */
interface KalshiMarketResponse {
  ticker: string;
  title: string;
  subtitle?: string;
  category: string;
  series_ticker?: string;
  tags?: string[];
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  volume: number;
  open_interest: number;
  close_time: string;
  expiration_time: string;
  status: string;
  can_close_early: boolean;
  settlement_value?: number;
}

interface KalshiMarketsResponse {
  markets: KalshiMarketResponse[];
  cursor?: string;
}

/**
 * Kalshi API Client
 * Endpoints: https://docs.kalshi.com/api
 */
export class KalshiClient extends BaseAPIClient {
  constructor() {
    super('https://api.elections.kalshi.com/v1', {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    });
  }

  /**
   * Fetch all markets from Kalshi
   */
  async getMarkets(params: {
    limit?: number;
    cursor?: string;
    status?: string;
    series_ticker?: string;
  } = {}): Promise<Market[]> {
    const queryParams = {
      limit: params.limit ?? 100,
      cursor: params.cursor,
      status: params.status ?? 'active',
      series_ticker: params.series_ticker,
    };

    const queryString = this.buildQueryString(queryParams);
    const response = await this.get<KalshiMarketsResponse>(
      `/markets${queryString}`,
      {},
      'kalshi'
    );

    return response.markets.map((market) => this.transformMarket(market));
  }

  /**
   * Fetch a single market by ticker
   */
  async getMarket(ticker: string): Promise<Market> {
    const response = await this.get<{ market: KalshiMarketResponse }>(
      `/markets/${ticker}`,
      {},
      'kalshi'
    );

    return this.transformMarket(response.market);
  }

  /**
   * Search markets by query (via category or title filtering)
   */
  async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
    // Kalshi doesn't have direct search - we fetch and filter
    const markets = await this.getMarkets({ limit: 200 });
    const lowerQuery = query.toLowerCase();

    return markets
      .filter(
        (m) =>
          m.question.toLowerCase().includes(lowerQuery) ||
          m.category.toLowerCase().includes(lowerQuery) ||
          m.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  /**
   * Get trending markets (highest volume)
   */
  async getTrendingMarkets(limit: number = 20): Promise<Market[]> {
    const markets = await this.getMarkets({ limit: limit * 2 });

    // Sort by volume
    return markets
      .sort((a, b) => b.volumeTotal - a.volumeTotal)
      .slice(0, limit);
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: string, limit: number = 20): Promise<Market[]> {
    const markets = await this.getMarkets({ limit: 200 });
    return markets
      .filter((m) => m.category.toLowerCase().includes(category.toLowerCase()))
      .slice(0, limit);
  }

  /**
   * Transform Kalshi API response to internal Market type
   */
  private transformMarket(km: KalshiMarketResponse): Market {
    // Calculate mid price from bid/ask spread
    const yesPrice = (km.yes_bid + km.yes_ask) / 2 / 100; // Kalshi prices are in cents
    const noPrice = 1 - yesPrice;

    // Map Kalshi status to our status
    let status: MarketStatus = 'active';
    if (km.status === 'settled' || km.settlement_value !== undefined) {
      status = 'resolved';
    } else if (km.status === 'closed' || !km.can_close_early) {
      status = 'closed';
    }

    // Liquidity estimate from open interest
    const liquidity = km.open_interest * yesPrice;

    // Liquidity tier
    let liquidityTier: 'high' | 'medium' | 'low' = 'low';
    if (liquidity > 50000) {
      liquidityTier = 'high';
    } else if (liquidity > 5000) {
      liquidityTier = 'medium';
    }

    // Volume estimate (24h ~10% of total volume)
    const volumeTotal = km.volume * 0.5; // Convert contracts to USD estimate
    const volume24h = volumeTotal * 0.1;

    return {
      id: `kalshi_${km.ticker}`,
      platformId: km.ticker,
      source: 'kalshi',
      question: km.title,
      description: km.subtitle,
      category: km.category,
      tags: km.tags || [],
      outcomeType: 'binary',
      status,
      yesPrice,
      noPrice,
      volume24h,
      volumeTotal,
      liquidity,
      liquidityTier,
      createdAt: new Date().toISOString(), // Kalshi doesn't provide creation date
      closeDate: km.close_time || km.expiration_time,
      resolvedAt: km.settlement_value !== undefined ? new Date().toISOString() : undefined,
      url: `https://kalshi.com/markets/${km.ticker}`,
      imageUrl: undefined, // Kalshi doesn't provide images
      lastUpdated: new Date().toISOString(),
    };
  }
}
