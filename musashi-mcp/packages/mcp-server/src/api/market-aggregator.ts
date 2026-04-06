import { PolymarketClient } from './polymarket-client.js';
import { KalshiClient } from './kalshi-client.js';
import { CacheManager } from '../cache/lru-cache.js';
import type {
  Market,
  MarketSearchFilters,
  PaginatedMarkets,
  ArbitrageOpportunity,
  MarketMover,
} from '../types/index.js';

/**
 * Aggregates data from multiple prediction market sources
 */
export class MarketAggregator {
  private polymarket: PolymarketClient;
  private kalshi: KalshiClient;
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.polymarket = new PolymarketClient();
    this.kalshi = new KalshiClient();
    this.cache = cache;
  }

  /**
   * Fetch all markets from all sources with caching
   */
  async getAllMarkets(): Promise<Market[]> {
    return this.cache.markets.getOrCompute('all_markets', async () => {
      const [polymarkets, kalshiMarkets] = await Promise.all([
        this.polymarket.getMarkets({ limit: 500 }),
        this.kalshi.getMarkets({ limit: 500 }),
      ]);

      return [...polymarkets, ...kalshiMarkets];
    });
  }

  /**
   * Get a single market by ID (supports both sources)
   */
  async getMarket(marketId: string): Promise<Market | undefined> {
    return this.cache.markets.getOrCompute(`market_${marketId}`, async () => {
      if (marketId.startsWith('polymarket_')) {
        const conditionId = marketId.replace('polymarket_', '');
        return await this.polymarket.getMarket(conditionId);
      } else if (marketId.startsWith('kalshi_')) {
        const ticker = marketId.replace('kalshi_', '');
        return await this.kalshi.getMarket(ticker);
      }
      return undefined;
    });
  }

  /**
   * Search markets across all sources
   */
  async searchMarkets(
    filters: MarketSearchFilters,
    pagination: { offset: number; limit: number }
  ): Promise<PaginatedMarkets> {
    const cacheKey = `search_${JSON.stringify(filters)}_${pagination.offset}_${pagination.limit}`;

    return this.cache.apiResponses.getOrCompute(cacheKey, async () => {
      // Fetch all markets
      let markets = await this.getAllMarkets();

      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        markets = markets.filter(
          (m) =>
            m.question.toLowerCase().includes(query) ||
            m.description?.toLowerCase().includes(query) ||
            m.category.toLowerCase().includes(query) ||
            m.tags.some((t) => t.toLowerCase().includes(query))
        );
      }

      if (filters.categories && filters.categories.length > 0) {
        const categories = filters.categories.map((c) => c.toLowerCase());
        markets = markets.filter((m) => categories.includes(m.category.toLowerCase()));
      }

      if (filters.sources && filters.sources.length > 0) {
        markets = markets.filter((m) => filters.sources!.includes(m.source));
      }

      if (filters.status && filters.status.length > 0) {
        markets = markets.filter((m) => filters.status!.includes(m.status));
      }

      if (filters.minLiquidity !== undefined) {
        markets = markets.filter((m) => m.liquidity >= filters.minLiquidity!);
      }

      if (filters.minVolume24h !== undefined) {
        markets = markets.filter((m) => m.volume24h >= filters.minVolume24h!);
      }

      if (filters.closeDateAfter) {
        const after = new Date(filters.closeDateAfter);
        markets = markets.filter((m) => {
          if (!m.closeDate) return false;
          return new Date(m.closeDate) > after;
        });
      }

      if (filters.closeDateBefore) {
        const before = new Date(filters.closeDateBefore);
        markets = markets.filter((m) => {
          if (!m.closeDate) return false;
          return new Date(m.closeDate) < before;
        });
      }

      // Pagination
      const total = markets.length;
      const paginated = markets.slice(pagination.offset, pagination.offset + pagination.limit);

      return {
        markets: paginated,
        total,
        offset: pagination.offset,
        limit: pagination.limit,
        hasMore: pagination.offset + pagination.limit < total,
      };
    });
  }

  /**
   * Get market movers (largest price changes)
   */
  async getMovers(timeframe: '24h' | '7d' = '24h', limit: number = 20): Promise<MarketMover[]> {
    const cacheKey = `movers_${timeframe}_${limit}`;

    return this.cache.apiResponses.getOrCompute(
      cacheKey,
      async () => {
        const markets = await this.getAllMarkets();

        // Since we don't have historical price data, we'll use volume spikes
        // as a proxy for movers (markets with high 24h volume relative to total)
        const movers: MarketMover[] = markets
          .filter((m) => m.status === 'active')
          .map((market) => {
            const volumeRatio = market.volumeTotal > 0 ? market.volume24h / market.volumeTotal : 0;
            const isMoving = volumeRatio > 0.2; // 20% of total volume in 24h

            // Estimate price change from volume activity
            const priceChange = isMoving ? (volumeRatio - 0.5) * 0.3 : 0.05;
            const direction = priceChange > 0 ? 'up' : 'down';

            return {
              market,
              priceChange: Math.abs(priceChange),
              direction: direction as 'up' | 'down',
              timeframe,
              volumeSpike: volumeRatio * 5, // Amplify for display
              momentum: Math.min(volumeRatio * 2, 1),
            };
          })
          .filter((m) => m.priceChange > 0.05) // Only significant movers
          .sort((a, b) => b.priceChange - a.priceChange)
          .slice(0, limit);

        return movers;
      },
      15 * 1000 // 15 second cache for movers
    );
  }

  /**
   * Find arbitrage opportunities between sources
   */
  async findArbitrage(limit: number = 20): Promise<ArbitrageOpportunity[]> {
    const cacheKey = `arbitrage_${limit}`;

    return this.cache.arbitrage.getOrCompute(cacheKey, async () => {
      const markets = await this.getAllMarkets();

      const opportunities: ArbitrageOpportunity[] = [];

      // Group markets by similar questions (simple keyword matching)
      const marketGroups = this.groupSimilarMarkets(markets);

      for (const group of marketGroups) {
        if (group.length < 2) continue;

        // Check all pairs in group
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const marketA = group[i]!;
            const marketB = group[j]!;

            // Only cross-platform arbitrage
            if (marketA.source === marketB.source) continue;

            // Calculate profit margin
            const profitMargin = this.calculateArbitrageProfit(marketA, marketB);

            if (profitMargin > 0.02) {
              // 2% minimum profit
              opportunities.push({
                marketA,
                marketB,
                profitMargin,
                strategy: this.getArbitrageStrategy(marketA, marketB),
                confidence: this.calculateArbitrageConfidence(marketA, marketB),
                riskFactors: this.identifyRiskFactors(marketA, marketB),
              });
            }
          }
        }
      }

      return opportunities.sort((a, b) => b.profitMargin - a.profitMargin).slice(0, limit);
    });
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    return this.cache.markets.getOrCompute('categories', async () => {
      const markets = await this.getAllMarkets();
      const categories = new Set<string>();

      for (const market of markets) {
        categories.add(market.category);
      }

      return Array.from(categories).sort();
    });
  }

  /**
   * Group similar markets for arbitrage detection
   */
  private groupSimilarMarkets(markets: Market[]): Market[][] {
    const groups: Market[][] = [];
    const used = new Set<string>();

    for (const market of markets) {
      if (used.has(market.id)) continue;

      const group = [market];
      used.add(market.id);

      // Find similar markets
      for (const other of markets) {
        if (used.has(other.id)) continue;
        if (this.areSimilarQuestions(market.question, other.question)) {
          group.push(other);
          used.add(other.id);
        }
      }

      if (group.length >= 2) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Check if two questions are similar (simple keyword matching)
   */
  private areSimilarQuestions(q1: string, q2: string): boolean {
    const words1 = new Set(q1.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(q2.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

    let matches = 0;
    for (const word of words1) {
      if (words2.has(word)) matches++;
    }

    const similarity = matches / Math.min(words1.size, words2.size);
    return similarity > 0.5; // 50% word overlap
  }

  /**
   * Calculate arbitrage profit margin
   */
  private calculateArbitrageProfit(marketA: Market, marketB: Market): number {
    // Buy low, sell high strategy
    const buyPrice = Math.min(marketA.yesPrice, marketB.yesPrice);
    const sellPrice = Math.max(marketA.yesPrice, marketB.yesPrice);

    return sellPrice - buyPrice - 0.02; // Subtract 2% for fees
  }

  /**
   * Get arbitrage strategy description
   */
  private getArbitrageStrategy(marketA: Market, marketB: Market): string {
    if (marketA.yesPrice < marketB.yesPrice) {
      return `Buy YES on ${marketA.source} at ${(marketA.yesPrice * 100).toFixed(1)}%, sell YES on ${marketB.source} at ${(marketB.yesPrice * 100).toFixed(1)}%`;
    } else {
      return `Buy YES on ${marketB.source} at ${(marketB.yesPrice * 100).toFixed(1)}%, sell YES on ${marketA.source} at ${(marketA.yesPrice * 100).toFixed(1)}%`;
    }
  }

  /**
   * Calculate confidence in arbitrage opportunity
   */
  private calculateArbitrageConfidence(marketA: Market, marketB: Market): number {
    const liquidityScore = Math.min(
      marketA.liquidity / 100000,
      marketB.liquidity / 100000,
      1
    );
    const volumeScore = Math.min(
      marketA.volume24h / 50000,
      marketB.volume24h / 50000,
      1
    );

    return (liquidityScore + volumeScore) / 2;
  }

  /**
   * Identify risk factors for arbitrage
   */
  private identifyRiskFactors(marketA: Market, marketB: Market): string[] {
    const risks: string[] = [];

    if (marketA.liquidity < 10000 || marketB.liquidity < 10000) {
      risks.push('Low liquidity may prevent execution');
    }

    if (marketA.closeDate && marketB.closeDate) {
      const dateA = new Date(marketA.closeDate);
      const dateB = new Date(marketB.closeDate);
      if (Math.abs(dateA.getTime() - dateB.getTime()) > 86400000 * 7) {
        risks.push('Markets close on different dates (>7 days apart)');
      }
    }

    if (marketA.question !== marketB.question) {
      risks.push('Market questions differ - verify they resolve identically');
    }

    return risks;
  }
}
