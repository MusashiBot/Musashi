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
        pollInterval: 5000,      // 5 seconds
        minArbSpread: 0.02,      // 2%
        minMoverChange: 0.05,    // 5%
        feedLimit: 10,
      },
    };

    // Create components
    this.components = [
      new Header(this.screen),
      new FeedPanel(this.screen),
      new ArbitragePanel(this.screen),
      new MoversPanel(this.screen),
      new StatsPanel(this.screen),
      new LogsPanel(this.screen),
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
    const newLogs = [...this.state.logs, entry].slice(-20); // Keep last 20
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

      // Parallel fetch (fast!)
      const [feed, feedStats, arbitrage, movers] = await Promise.all([
        this.agent.getFeed({ limit: this.state.settings.feedLimit }).catch(() => []),
        this.agent.getFeedStats().catch(() => null),
        this.agent.getArbitrage({
          minSpread: this.state.settings.minArbSpread,
          limit: 5,
        }).catch(() => []),
        this.agent.getMovers({
          timeframe: '1h',
          minChange: this.state.settings.minMoverChange,
          limit: 5,
        }).catch(() => []),
      ]);

      // Update state
      this.updateState({
        feed,
        feedStats,
        arbitrage,
        movers,
        lastUpdate: new Date().toISOString(),
        isLoading: false,
        errors: [],
      });

      // Log success
      const newTweets = feed.length;
      const newArbs = arbitrage.length;
      const newMovers = movers.length;

      if (newTweets > 0 || newArbs > 0 || newMovers > 0) {
        this.addLog(`Updated: ${newTweets} tweets, ${newArbs} arbs, ${newMovers} movers`, 'success');
      } else {
        this.addLog('Updated: No new data', 'info');
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
}

// ===== Main Entry Point =====

async function main() {
  const cli = new MusashiCLI();
  cli.start();
}

main().catch(console.error);
