/**
 * Header Component
 *
 * Top banner with app title, API URL, and status
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { formatTime } from '../utils';

export class Header extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen) {
    const container = blessed.box({
      top: 0,
      height: 4,
      width: '100%',
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
      },
      tags: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const lastUpdate = state.lastUpdate
      ? formatTime(state.lastUpdate)
      : 'Never';

    const loadingIndicator = state.isLoading ? '{yellow-fg}●{/yellow-fg}' : '{green-fg}●{/green-fg}';

    this.box.setContent(
      `{center}{bold}{cyan-fg}Musashi AI{/cyan-fg}{/bold} • Real-time Prediction Market Intelligence{/center}\n` +
      `{center}API: https://musashi-api.vercel.app • Last Update: ${lastUpdate} ${loadingIndicator} • Press {bold}Q{/bold} to quit, {bold}R{/bold} to refresh{/center}`
    );
  }
}
