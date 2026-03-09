/**
 * Musashi CLI - Application State
 *
 * Shared state interface for all components
 */

import type {
  AnalyzedTweet,
  ArbitrageOpportunity,
  MarketMover,
} from '../src/sdk/musashi-agent';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  message: string;
  level: LogLevel;
  time: string;
}

export interface FeedStats {
  timestamp: string;
  last_collection: string;
  tweets: {
    last_1h: number;
    last_6h: number;
    last_24h: number;
  };
  by_category: Record<string, number>;
  by_urgency: Record<string, number>;
  top_markets: Array<{
    market: any;
    mention_count: number;
  }>;
  metadata: {
    processing_time_ms: number;
  };
}

export interface AppState {
  // Feed data
  feed: AnalyzedTweet[];
  feedStats: FeedStats | null;

  // Arbitrage data
  arbitrage: ArbitrageOpportunity[];

  // Market movers
  movers: MarketMover[];

  // Metadata
  lastUpdate: string;
  isLoading: boolean;
  errors: string[];

  // Logs (last 20 entries)
  logs: LogEntry[];

  // Settings
  settings: {
    pollInterval: number;      // ms
    minArbSpread: number;      // 0.02 = 2%
    minMoverChange: number;    // 0.05 = 5%
    feedLimit: number;         // tweets to show
  };
}
