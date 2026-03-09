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
        this.agent.getFeed({ limit: this.state.settings.feedLimit }),
        this.agent.getFeedStats(),
        this.agent.getArbitrage({
          minSpread: this.state.settings.minArbSpread,
          limit: 5,
        }),
        this.agent.getMovers({
          timeframe: '1h',
          minChange: this.state.settings.minMoverChange,
          limit: 5,
        }),
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
      const nextFeed = feedResult.status === 'fulfilled' ? feedResult.value : this.state.feed;
      const nextStats = statsResult.status === 'fulfilled' ? statsResult.value : this.state.feedStats;
      const nextArb = arbResult.status === 'fulfilled' ? arbResult.value : this.state.arbitrage;
      const nextMovers = moversResult.status === 'fulfilled' ? moversResult.value : this.state.movers;

      this.updateState({
        feed: nextFeed,
        feedStats: nextStats,
        arbitrage: nextArb,
        movers: nextMovers,
        lastUpdate: new Date().toISOString(),
        isLoading: false,
        errors: endpointErrors,
      });

      // Log success
      const newTweets = nextFeed.length;
      const newArbs = nextArb.length;
      const newMovers = nextMovers.length;

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
}

// ===== Main Entry Point =====

async function main() {
  const cli = new MusashiCLI();
  cli.start();
}

main().catch(console.error);
