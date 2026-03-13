import type { Market, MarketMatch, TradingSignal } from '../types';

export class KeywordMatcher {
  constructor(
    private markets: Market[],
    private minConfidence = 0.25,
    private maxResults = 5
  ) {}

  match(text: string): MarketMatch[] {
    const tokens = this.tokenize(text);
    const expandedTokens = this.expandWithSynonyms(tokens);
    const expandedTokenSet = new Set(expandedTokens);

    const matches: Array<{ market: Market; score: number; matchedKeywords: string[] }> = [];

    for (const market of this.markets) {
      const matchedKeywords = market.keywords.filter(kw => expandedTokenSet.has(kw));

      if (matchedKeywords.length === 0) continue;

      const score = this.computeScore(matchedKeywords, market.keywords, text, market);

      if (score >= this.minConfidence) {
        matches.push({ market, score, matchedKeywords });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.score - a.score);

    // Take top N results
    const topMatches = matches.slice(0, this.maxResults);

    return topMatches.map(({ market, score, matchedKeywords }) => ({
      market,
      confidence: Math.min(score, 1.0),
      matchedKeywords,
      sentiment: this.analyzeSentiment(text),
      signal: this.generateSignal(text, market, score),
    }));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private expandWithSynonyms(tokens: string[]): string[] {
    const synonyms: Record<string, string[]> = {
      btc: ['bitcoin', 'btc'],
      bitcoin: ['bitcoin', 'btc'],
      eth: ['ethereum', 'eth'],
      ethereum: ['ethereum', 'eth'],
      president: ['president', 'presidential', 'potus'],
      election: ['election', 'vote', 'voting'],
      fed: ['fed', 'federal reserve', 'fomc'],
    };

    const expanded = new Set(tokens);
    for (const token of tokens) {
      const syns = synonyms[token];
      if (syns) {
        syns.forEach(s => expanded.add(s));
      }
    }
    return Array.from(expanded);
  }

  private computeScore(
    matchedKeywords: string[],
    allKeywords: string[],
    text: string,
    market: Market
  ): number {
    const coverage = matchedKeywords.length / allKeywords.length;
    const normalized = Math.sqrt(coverage); // Reduce aggressive scaling

    // Bonus for multiple keyword matches
    const coverageBonus = matchedKeywords.length >= 3 ? 0.1 : 0;

    return Math.min(1.0, normalized + coverageBonus);
  }

  private analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const lower = text.toLowerCase();
    const bullishWords = ['bullish', 'moon', 'pump', 'win', 'yes', 'up', 'surge', 'rally', 'boost'];
    const bearishWords = ['bearish', 'dump', 'crash', 'lose', 'no', 'down', 'fall', 'drop', 'decline'];

    const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
    const bearishCount = bearishWords.filter(w => lower.includes(w)).length;

    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  private generateSignal(text: string, market: Market, confidence: number): TradingSignal {
    const sentiment = this.analyzeSentiment(text);
    const direction = sentiment === 'bullish' ? 'YES' : sentiment === 'bearish' ? 'NO' : 'NEUTRAL';

    const edge = confidence > 0.7 ? 0.15 : confidence > 0.5 ? 0.08 : 0.03;

    const urgency: 'critical' | 'high' | 'medium' | 'low' =
      confidence > 0.8 ? 'critical' : confidence > 0.6 ? 'high' : confidence > 0.4 ? 'medium' : 'low';

    const reasoning = `${Math.round(confidence * 100)}% keyword match with ${sentiment} sentiment`;

    return {
      direction,
      confidence,
      edge,
      urgency,
      type: 'news_event',
      reasoning,
    };
  }
}
