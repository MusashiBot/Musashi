import { BaseAPIClient } from './base-client.js';
import type { Market, MarketStatus } from '../types/market.js';

/**
 * Polymarket API response types
 */
interface PolymarketMarketResponse {
  condition_id: string;
  question: string;
  description?: string;
  category?: string;
  tags?: string[];
  outcomes: string[];
  outcome_prices: string[];
  volume: string;
  liquidity: string;
  end_date_iso?: string;
  closed: boolean;
  active: boolean;
  image?: string;
}

interface PolymarketMarketsResponse {
  data: PolymarketMarketResponse[];
  next_cursor?: string;
}

/**
 * Polymarket API Client
 * Endpoints: https://docs.polymarket.com/api
 */
export class PolymarketClient extends BaseAPIClient {
  constructor() {
    super('https://gamma-api.polymarket.com', {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    });
  }

  /**
   * Fetch all active markets from Polymarket
   */
  async getMarkets(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  } = {}): Promise<Market[]> {
    const queryParams = {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      active: params.active ?? true,
      closed: params.closed ?? false,
    };

    const queryString = this.buildQueryString(queryParams);
    const response = await this.get<PolymarketMarketsResponse>(
      `/markets${queryString}`,
      {},
      'polymarket'
    );

    return response.data.map((market) => this.transformMarket(market));
  }

  /**
   * Fetch a single market by ID
   */
  async getMarket(conditionId: string): Promise<Market> {
    const response = await this.get<PolymarketMarketResponse>(
      `/markets/${conditionId}`,
      {},
      'polymarket'
    );

    return this.transformMarket(response);
  }

  /**
   * Search markets by query
   */
  async searchMarkets(query: string, limit: number = 20): Promise<Market[]> {
    const queryString = this.buildQueryString({ q: query, limit });
    const response = await this.get<PolymarketMarketsResponse>(
      `/markets/search${queryString}`,
      {},
      'polymarket'
    );

    return response.data.map((market) => this.transformMarket(market));
  }

  /**
   * Transform Polymarket API response to internal Market type
   */
  private transformMarket(pm: PolymarketMarketResponse): Market {
    // Parse prices
    const yesPrice = parseFloat(pm.outcome_prices[0] || '0.5');
    const noPrice = 1 - yesPrice;

    // Parse volumes
    const volumeTotal = parseFloat(pm.volume || '0');
    const liquidity = parseFloat(pm.liquidity || '0');

    // Determine status
    let status: MarketStatus = 'active';
    if (pm.closed) {
      status = 'resolved';
    } else if (!pm.active) {
      status = 'closed';
    }

    // Liquidity tier
    let liquidityTier: 'high' | 'medium' | 'low' = 'low';
    if (liquidity > 100000) {
      liquidityTier = 'high';
    } else if (liquidity > 10000) {
      liquidityTier = 'medium';
    }

    // Category and tags
    const category = pm.category || 'uncategorized';
    const tags = pm.tags || [];

    return {
      id: `polymarket_${pm.condition_id}`,
      platformId: pm.condition_id,
      source: 'polymarket',
      question: pm.question,
      description: pm.description,
      category,
      tags,
      outcomeType: 'binary',
      status,
      yesPrice,
      noPrice,
      volume24h: volumeTotal * 0.1, // Estimate 10% of total volume is 24h
      volumeTotal,
      liquidity,
      liquidityTier,
      createdAt: new Date().toISOString(), // Polymarket doesn't provide creation date
      closeDate: pm.end_date_iso,
      resolvedAt: pm.closed ? new Date().toISOString() : undefined,
      url: `https://polymarket.com/event/${pm.condition_id}`,
      imageUrl: pm.image,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get trending markets (most volume in 24h)
   */
  async getTrendingMarkets(limit: number = 20): Promise<Market[]> {
    // Polymarket doesn't have a dedicated trending endpoint
    // We fetch recent markets and sort by volume
    const markets = await this.getMarkets({ limit: limit * 2, active: true });

    // Sort by estimated 24h volume
    return markets
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: string, limit: number = 20): Promise<Market[]> {
    // Polymarket API might not support category filtering directly
    // Fallback: fetch all and filter
    const markets = await this.getMarkets({ limit: 200, active: true });
    return markets
      .filter((m) => m.category.toLowerCase().includes(category.toLowerCase()))
      .slice(0, limit);
  }
}
