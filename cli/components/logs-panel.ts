/**
 * Logs Panel Component
 *
 * Activity logs at the bottom
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { getLogColor, getLogIcon } from '../utils';

export class LogsPanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen, visibleLines: number) {
    const contentLines = Math.max(4, visibleLines);
    const panelHeight = contentLines + 2; // +2 for top/bottom border

    const container = blessed.box({
      top: 30,
      left: 0,
      width: '100%',
      height: panelHeight,
      border: { type: 'line' },
      label: ' Logs ',
      tags: true,
      style: {
        border: { fg: 'white' },
      },
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const logs = state.logs.slice(-state.settings.logLines);

    if (logs.length === 0) {
      this.box.setContent('{gray-fg}No logs yet...{/gray-fg}');
      return;
    }

    const lines = logs.map(log => {
      const color = getLogColor(log.level);
      const icon = getLogIcon(log.level);
      return `{${color}}[${log.time}] ${icon} ${log.message}{/${color}}`;
    });

    this.box.setContent(lines.join('\n'));
  }
}
