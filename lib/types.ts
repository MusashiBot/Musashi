// Core types for Musashi API

export interface Market {
  id: string;
  platform: 'kalshi' | 'polymarket';
  title: string;
  description: string;
  keywords: string[];
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  url: string;
  category: string;
  lastUpdated: string;
  endDate?: string;
  oneDayPriceChange?: number;
}

export interface MarketMatch {
  market: Market;
  confidence: number;
  matchedKeywords: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  signal: TradingSignal;
}

export interface TradingSignal {
  direction: 'YES' | 'NO' | 'NEUTRAL';
  confidence: number;
  edge: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  type: 'news_event' | 'price_movement' | 'arbitrage' | 'general';
  reasoning: string;
}

export interface ArbitrageOpportunity {
  polymarketMarket: Market;
  kalshiMarket: Market;
  spread: number;
  direction: 'buy_poly_sell_kalshi' | 'buy_kalshi_sell_poly';
  profitPotential: string;
  matchConfidence: number;
  category: string;
}
