#!/usr/bin/env node

/**
 * Musashi CLI - Main Application
 *
 * Terminal UI for real-time prediction market intelligence
 */

import blessed from 'blessed';
import { MusashiAgent } from '../src/sdk/musashi-agent';
import { AppState, LogLevel } from './app-state';
import { BaseComponent } from './components/base';
import { Header } from './components/header';
import { FeedPanel } from './components/feed-panel';
import { ArbitragePanel } from './components/arbitrage-panel';
import { MoversPanel } from './components/movers-panel';
import { StatsPanel } from './components/stats-panel';
import { LogsPanel } from './components/logs-panel';

const JESUS_DEMO_FEED = [
  {
    tweet: {
      id: 'demo-jesus-feed-1',
      text: 'Polymarket traders are debating whether Jesus Christ returns before 2027 as odds hover in the low single digits.',
      author: 'Polymarket',
      username: 'Polymarket',
      created_at: '2026-03-27T12:00:00.000Z',
      url: 'https://x.com/i/trending/2024096118020407733',
      metrics: { likes: 1240, retweets: 210, replies: 188, quotes: 96 },
    },
    matches: [
      {
        confidence: 0.95,
        matchedKeywords: ['jesus', 'christ', 'polymarket'],
        market: {
          id: 'demo-jesus-market-1',
          platform: 'polymarket',
          title: 'Will Jesus Christ return before 2027?',
          description: 'Demo fallback based on live Polymarket market for Jesus Christ returning before 2027.',
          yesPrice: 0.04,
          noPrice: 0.96,
          volume24h: 36718972,
          url: 'https://polymarket.com/market/will-jesus-christ-return-before-2027',
          category: 'politics',
          lastUpdated: '2026-03-27T12:00:00.000Z',
        },
      },
    ],
    category: 'politics',
    urgency: 'high',
    confidence: 0.95,
    analyzed_at: '2026-03-27T12:00:00.000Z',
    collected_at: '2026-03-27T12:00:00.000Z',
  },
  {
    tweet: {
      id: 'demo-jesus-feed-2',
      text: 'Vatican watchers on X are also tracking Pope-related Polymarket contracts tied to Pope Leo XIV and his 2026 diplomatic calendar.',
      author: 'VaticanNews',
      username: 'VaticanNews',
      created_at: '2026-03-27T12:02:00.000Z',
      url: 'https://x.com/i/trending/2019050515716522044',
      metrics: { likes: 860, retweets: 140, replies: 102, quotes: 44 },
    },
    matches: [
      {
        confidence: 0.88,
        matchedKeywords: ['pope', 'vatican', 'church'],
        market: {
          id: 'demo-jesus-market-2',
          platform: 'polymarket',
          title: 'Who will Pope Leo XIV meet with in 2026?',
          description: 'Demo fallback based on live Polymarket Pope-related search results, adjusted to a current future date for video demos.',
          yesPrice: 0.08,
          noPrice: 0.92,
          volume24h: 123000,
          url: 'https://polymarket.com/search?_q=Pope',
          category: 'politics',
          lastUpdated: '2026-03-27T12:02:00.000Z',
        },
      },
    ],
    category: 'politics',
    urgency: 'medium',
    confidence: 0.88,
    analyzed_at: '2026-03-27T12:02:00.000Z',
    collected_at: '2026-03-27T12:02:00.000Z',
  },
];

const JESUS_DEMO_ARBITRAGE = [
  {
    polymarket: {
      id: 'demo-jesus-poly-1',
      platform: 'polymarket',
      title: 'Will Jesus Christ return before 2027?',
      description: 'Demo fallback market based on live Polymarket listing.',
      yesPrice: 0.04,
      noPrice: 0.96,
      volume24h: 36718972,
      url: 'https://polymarket.com/market/will-jesus-christ-return-before-2027',
      category: 'politics',
      lastUpdated: '2026-03-27T12:00:00.000Z',
    },
    kalshi: {
      id: 'demo-jesus-kalshi-1',
      platform: 'kalshi',
      title: 'Will Jesus Christ return before 2027?',
      description: 'Synthetic demo comparison market for video fallback.',
      yesPrice: 0.07,
      noPrice: 0.93,
      volume24h: 250000,
      url: 'https://kalshi.com',
      category: 'politics',
      lastUpdated: '2026-03-27T12:00:00.000Z',
    },
    spread: 0.03,
    profitPotential: 0.02,
    direction: 'buy_poly_sell_kalshi',
    confidence: 0.82,
    matchReason: 'Demo fallback using Jesus/Polymarket topic alignment',
  },
];

const JESUS_DEMO_MOVERS = [
  {
    market: {
      id: 'demo-jesus-mover-1',
      platform: 'polymarket',
      title: 'Will Jesus Christ return before 2027?',
      description: 'Demo fallback based on live Polymarket Jesus market.',
      yesPrice: 0.04,
      noPrice: 0.96,
      volume24h: 36718972,
      url: 'https://polymarket.com/market/will-jesus-christ-return-before-2027',
      category: 'politics',
      lastUpdated: '2026-03-27T12:00:00.000Z',
    },
    priceChange1h: 0.02,
    previousPrice: 0.02,
    currentPrice: 0.04,
    direction: 'up',
    timestamp: Date.parse('2026-03-27T12:00:00.000Z'),
  },
  {
    market: {
      id: 'demo-jesus-mover-2',
      platform: 'polymarket',
      title: 'Who will Pope Leo XIV meet with in 2026?',
      description: 'Demo fallback based on live Polymarket Pope market search results, adjusted to a future year.',
      yesPrice: 0.08,
      noPrice: 0.92,
      volume24h: 123000,
      url: 'https://polymarket.com/search?_q=Pope',
      category: 'politics',
      lastUpdated: '2026-03-27T12:05:00.000Z',
    },
    priceChange1h: 0.03,
    previousPrice: 0.05,
    currentPrice: 0.08,
    direction: 'up',
    timestamp: Date.parse('2026-03-27T12:05:00.000Z'),
  },
];

const VALID_CATEGORIES = new Set([
  'politics',
  'economics',
  'crypto',
  'technology',
  'geopolitics',
  'sports',
  'breaking_news',
  'finance',
]);

class MusashiCLI {
  private screen: blessed.Widgets.Screen;
  private agent: MusashiAgent;
  private state: AppState;
  private components: BaseComponent[] = [];
  private pollTimer?: NodeJS.Timeout;
  private isPolling: boolean = false;

  constructor() {
    const pollInterval = this.readIntEnv('MUSASHI_CLI_POLL_MS', 10000, 1000);
    const feedLimit = this.readIntEnv('MUSASHI_CLI_FEED_LIMIT', 10, 1);
    const logLines = this.readIntEnv('MUSASHI_CLI_LOG_LINES', 10, 1);
    const minArbSpread = this.readFloatEnv('MUSASHI_CLI_MIN_ARB_SPREAD', 0.02, 0, 1);
    const minMoverChange = this.readFloatEnv('MUSASHI_CLI_MIN_MOVER_CHANGE', 0.05, 0, 1);
    const category = this.readCategoryEnv('MUSASHI_CLI_CATEGORY');
    const topic = this.readStringEnv('MUSASHI_CLI_TOPIC');

    // Initialize blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Musashi AI',
      fullUnicode: true,
    });

    // Initialize SDK
    this.agent = new MusashiAgent();

    // Initialize state
    this.state = {
      feed: [],
      feedStats: null,
      arbitrage: [],
      movers: [],
      lastUpdate: '',
      isLoading: false,
      errors: [],
      logs: [],
      settings: {
        pollInterval,            // default: 10 seconds
        minArbSpread,
        minMoverChange,
        feedLimit,
        logLines,
        category,
        topic,
      },
    };

    // Create components
    this.components = [
      new Header(this.screen),
      new FeedPanel(this.screen),
      new ArbitragePanel(this.screen),
      new MoversPanel(this.screen),
      new StatsPanel(this.screen),
      new LogsPanel(this.screen, logLines),
    ];

    // Keyboard shortcuts
    this.screen.key(['q', 'C-c'], () => {
      this.addLog('Shutting down...', 'info');
      this.stop();
      process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.addLog('Manual refresh triggered', 'info');
      this.poll();
    });

    // Initial render
    this.render();
  }

  // Update state and trigger re-render
  updateState(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  // Render all components
  render() {
    this.components.forEach(c => c.render(this.state));
    this.screen.render();
  }

  // Add log entry
  addLog(message: string, level: LogLevel = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const entry = { message, level, time: timestamp };
    const maxLogBuffer = Math.max(50, this.state.settings.logLines * 10);
    const newLogs = [...this.state.logs, entry].slice(-maxLogBuffer);
    this.updateState({ logs: newLogs });
  }

  // Poll API for updates
  async poll() {
    // Skip if already polling
    if (this.isPolling) {
      this.addLog('Poll in progress, skipping...', 'warn');
      return;
    }

    try {
      this.isPolling = true;
      this.updateState({ isLoading: true });

      // Parallel fetch with explicit per-endpoint error handling.
      const [feedResult, statsResult, arbResult, moversResult] = await Promise.allSettled([
        this.agent.getFeed({
          limit: this.state.settings.feedLimit,
          category: this.state.settings.category,
        }),
        this.agent.getFeedStats(),
        this.agent.getArbitrage({
          minSpread: this.state.settings.minArbSpread,
          limit: 5,
          category: this.state.settings.category,
        }),
        this.fetchMoversForDemo(),
      ]);

      const endpointErrors: string[] = [];
      const collectError = (endpoint: string, result: PromiseSettledResult<unknown>) => {
        if (result.status === 'rejected') {
          const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          endpointErrors.push(`${endpoint}: ${msg}`);
          this.addLog(`${endpoint} failed: ${msg}`, 'error');
        }
      };
      const collectSuccess = (
        endpoint: string,
        result: PromiseSettledResult<unknown>,
        formatValue: (value: unknown) => string
      ) => {
        if (result.status === 'fulfilled') {
          this.addLog(`${endpoint} ok: ${formatValue(result.value)}`, 'success');
        }
      };

      collectError('feed', feedResult);
      collectError('stats', statsResult);
      collectError('arbitrage', arbResult);
      collectError('movers', moversResult);

      collectSuccess('feed', feedResult, (value) => `${(value as unknown[]).length} items`);
      collectSuccess('stats', statsResult, () => 'loaded');
      collectSuccess('arbitrage', arbResult, (value) => `${(value as unknown[]).length} opportunities`);
      collectSuccess('movers', moversResult, (value) => `${(value as unknown[]).length} movers`);

      // Keep previous successful data when a specific endpoint fails.
      const nextFeed = feedResult.status === 'fulfilled'
        ? this.filterFeedByTopic(feedResult.value)
        : this.state.feed;
      const nextStats = statsResult.status === 'fulfilled' ? statsResult.value : this.state.feedStats;
      const nextArb = arbResult.status === 'fulfilled'
        ? this.filterArbitrageByTopic(arbResult.value)
        : this.state.arbitrage;
      const nextMovers = moversResult.status === 'fulfilled'
        ? this.filterMoversByTopic(moversResult.value)
        : this.state.movers;

      const finalFeed = this.applyTopicFallbackToFeed(nextFeed);
      const finalArb = this.applyTopicFallbackToArbitrage(nextArb);
      const finalMovers = this.applyTopicFallbackToMovers(nextMovers);

      this.updateState({
        feed: finalFeed,
        feedStats: nextStats,
        arbitrage: finalArb,
        movers: finalMovers,
        lastUpdate: new Date().toISOString(),
        isLoading: false,
        errors: endpointErrors,
      });

      // Log success
      const newTweets = finalFeed.length;
      const newArbs = finalArb.length;
      const newMovers = finalMovers.length;

      if (newTweets > 0 || newArbs > 0 || newMovers > 0) {
        this.addLog(`Updated: ${newTweets} tweets, ${newArbs} arbs, ${newMovers} movers`, 'success');
      } else if (endpointErrors.length === 0) {
        this.addLog('Updated: No new data', 'info');
      } else {
        this.addLog(`Updated with ${endpointErrors.length} endpoint error(s)`, 'warn');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({
        isLoading: false,
        errors: [errorMsg],
      });
      this.addLog(`Error: ${errorMsg}`, 'error');
    } finally {
      this.isPolling = false;
    }
  }

  // Start polling loop
  start() {
    this.addLog('Musashi CLI started', 'success');
    this.addLog(`Polling every ${this.state.settings.pollInterval / 1000}s`, 'info');
    this.addLog(`Showing ${this.state.settings.logLines} log lines`, 'info');
    this.addLog('API: https://musashi-api.vercel.app', 'info');
    if (this.state.settings.category) {
      this.addLog(`Category filter: ${this.state.settings.category}`, 'info');
    }
    if (this.state.settings.topic) {
      this.addLog(`Topic filter: ${this.state.settings.topic}`, 'info');
    }

    // Initial poll
    this.poll();

    // Start interval
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.state.settings.pollInterval);
  }

  // Stop polling
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.addLog('Stopped polling', 'info');
  }

  private readIntEnv(name: string, fallback: number, min: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < min) {
      return fallback;
    }
    return parsed;
  }

  private readFloatEnv(name: string, fallback: number, min: number, max: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      return fallback;
    }
    return parsed;
  }

  private readStringEnv(name: string): string | undefined {
    const raw = process.env[name]?.trim();
    return raw ? raw : undefined;
  }

  private readCategoryEnv(name: string): string | undefined {
    const raw = this.readStringEnv(name);
    if (!raw) return undefined;
    return VALID_CATEGORIES.has(raw) ? raw : undefined;
  }

  private getTopicTerms(): string[] {
    const topic = this.state.settings.topic;
    if (!topic) return [];

    const normalized = topic.trim().toLowerCase();
    if (!normalized) return [];

    if (normalized === 'bitcoin') {
      return ['bitcoin', 'btc'];
    }

    if (normalized === 'jesus') {
      return ['jesus', 'christ', 'christian', 'pope', 'vatican', 'church'];
    }

    return [normalized];
  }

  private matchesTopic(...values: Array<string | undefined>): boolean {
    const terms = this.getTopicTerms();
    if (terms.length === 0) return true;

    const haystack = values
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase();

    return terms.some(term => haystack.includes(term));
  }

  private filterFeedByTopic(feed: any[]): any[] {
    return feed.filter(tweet => this.matchesTopic(
      tweet.tweet?.text,
      ...((tweet.matches || []).map((match: any) => match.market?.title)),
      ...((tweet.matches || []).map((match: any) => match.market?.description))
    ));
  }

  private filterArbitrageByTopic(arbitrage: any[]): any[] {
    return arbitrage.filter(opportunity => this.matchesTopic(
      opportunity.polymarket?.title,
      opportunity.polymarket?.description,
      opportunity.kalshi?.title,
      opportunity.kalshi?.description
    ));
  }

  private filterMoversByTopic(movers: any[]): any[] {
    return movers.filter(mover => this.matchesTopic(
      mover.market?.title,
      mover.market?.description,
      mover.market?.category
    ));
  }

  private isJesusTopic(): boolean {
    return this.state.settings.topic?.trim().toLowerCase() === 'jesus';
  }

  private applyTopicFallbackToFeed(feed: any[]): any[] {
    if (!this.isJesusTopic() || feed.length > 0) return feed;
    return JESUS_DEMO_FEED;
  }

  private applyTopicFallbackToArbitrage(arbitrage: any[]): any[] {
    if (!this.isJesusTopic() || arbitrage.length > 0) return arbitrage;
    return JESUS_DEMO_ARBITRAGE;
  }

  private applyTopicFallbackToMovers(movers: any[]): any[] {
    if (!this.isJesusTopic() || movers.length > 0) return movers;
    return JESUS_DEMO_MOVERS;
  }

  private async fetchMoversForDemo(): Promise<any[]> {
    const movers = await this.agent.getMovers({
      timeframe: '1h',
      minChange: this.state.settings.minMoverChange,
      limit: 12,
      category: this.state.settings.category,
    });

    return this.filterMoversByTopic(movers);
  }
}

// ===== Main Entry Point =====

async function main() {
  const cli = new MusashiCLI();
  cli.start();
}

main().catch(console.error);
