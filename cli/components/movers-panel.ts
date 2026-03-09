/**
 * Movers Panel Component
 *
 * Markets with significant price changes
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { formatPrice, formatPriceChange, getPriceChangeColor, getArrow, truncate } from '../utils';

export class MoversPanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen) {
    const container = blessed.box({
      top: 22,
      left: 0,
      width: '50%',
      height: 8,
      border: { type: 'line' },
      label: ' Market Movers (1h) ',
      tags: true,
      style: {
        border: { fg: 'magenta' },
      },
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const movers = state.movers.slice(0, 4); // Show top 4 movers

    if (movers.length === 0) {
      this.box.setContent('{gray-fg}No significant price movements...\nMinimum change: ' + (state.settings.minMoverChange * 100) + '%{/gray-fg}');
      return;
    }

    const lines: string[] = [];

    movers.forEach(mover => {
      const title = truncate(mover.market.title, 35);
      const change = formatPriceChange(mover.priceChange1h);
      const prevPrice = formatPrice(mover.previousPrice);
      const currPrice = formatPrice(mover.currentPrice);
      const arrow = getArrow(mover.direction);
      const color = getPriceChangeColor(mover.priceChange1h);

      lines.push(`{${color}}${arrow}{/${color}} {bold}${title}{/bold}`);
      lines.push(`   {${color}}${change}{/${color}} (${prevPrice} → ${currPrice})`);
    });

    this.box.setContent(lines.join('\n'));
  }
}
