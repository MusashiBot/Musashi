import type { Market, ArbitrageOpportunity } from '../types';

function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();

  const t1 = normalize(title1);
  const t2 = normalize(title2);

  const words1 = new Set(t1.split(/\s+/));
  const words2 = new Set(t2.split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function calculateKeywordOverlap(market1: Market, market2: Market): number {
  const set1 = new Set(market1.keywords);
  const set2 = new Set(market2.keywords);

  const intersection = new Set([...set1].filter(k => set2.has(k)));

  return intersection.size / Math.min(set1.size, set2.size);
}

function areMarketsSimilar(poly: Market, kalshi: Market): boolean {
  const titleSim = calculateTitleSimilarity(poly.title, kalshi.title);
  const keywordOverlap = calculateKeywordOverlap(poly, kalshi);

  // High bar: at least 30% title similarity OR 50% keyword overlap
  return titleSim >= 0.3 || keywordOverlap >= 0.5;
}

export function detectArbitrage(
  markets: Market[],
  minSpread = 0.03
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  const polymarkets = markets.filter(m => m.platform === 'polymarket');
  const kalshiMarkets = markets.filter(m => m.platform === 'kalshi');

  console.log(
    `[Arbitrage] Checking ${polymarkets.length} Polymarket × ${kalshiMarkets.length} Kalshi markets`
  );

  for (const poly of polymarkets) {
    for (const kalshi of kalshiMarkets) {
      if (!areMarketsSimilar(poly, kalshi)) continue;

      const spread = Math.abs(poly.yesPrice - kalshi.yesPrice);
      if (spread < minSpread) continue;

      const matchConfidence = Math.max(
        calculateTitleSimilarity(poly.title, kalshi.title),
        calculateKeywordOverlap(poly, kalshi)
      );

      const direction =
        poly.yesPrice < kalshi.yesPrice ? 'buy_poly_sell_kalshi' : 'buy_kalshi_sell_poly';

      opportunities.push({
        polymarketMarket: poly,
        kalshiMarket: kalshi,
        spread,
        direction,
        profitPotential: `${(spread * 100).toFixed(1)}%`,
        matchConfidence,
        category: poly.category,
      });
    }
  }

  // Sort by spread descending
  opportunities.sort((a, b) => b.spread - a.spread);

  console.log(`[Arbitrage] Found ${opportunities.length} opportunities`);

  return opportunities;
}
