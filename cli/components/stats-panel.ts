/**
 * Stats Panel Component
 *
 * Feed statistics and metrics
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { truncate } from '../utils';

export class StatsPanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen) {
    const container = blessed.box({
      top: 22,
      left: '50%',
      width: '50%',
      height: 8,
      border: { type: 'line' },
      label: ' Stats ',
      tags: true,
      style: {
        border: { fg: 'cyan' },
      },
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const stats = state.feedStats;

    if (!stats) {
      this.box.setContent('{gray-fg}Loading stats...{/gray-fg}');
      return;
    }

    const lines: string[] = [];

    // Tweet counts
    lines.push(`{bold}Tweets (24h):{/bold} ${stats.tweets.last_24h}`);
    lines.push(`  Last 1h: ${stats.tweets.last_1h}  Last 6h: ${stats.tweets.last_6h}`);
    lines.push('');

    // Categories
    const categories = Object.entries(stats.by_category)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    if (categories.length > 0) {
      lines.push('{bold}Top Categories:{/bold}');
      categories.forEach(([cat, count]) => {
        const catName = cat.replace('_', ' ').toLowerCase();
        const capitalizedCat = catName.charAt(0).toUpperCase() + catName.slice(1);
        lines.push(`  ${capitalizedCat}: ${count}`);
      });
    }

    this.box.setContent(lines.join('\n'));
  }
}
