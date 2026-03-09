/**
 * Arbitrage Panel Component
 *
 * Cross-platform arbitrage opportunities with YES/NO split (PolyDepth style)
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { formatPrice, formatSpread, truncate, getPlatformName } from '../utils';

export class ArbitragePanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen) {
    const container = blessed.box({
      top: 4,
      left: '50%',
      width: '50%',
      height: 18,
      border: { type: 'line' },
      label: ' Arbitrage Opportunities ',
      tags: true,
      style: {
        border: { fg: 'yellow' },
      },
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const arbs = state.arbitrage.slice(0, 2); // Show top 2 arbs

    if (arbs.length === 0) {
      this.box.setContent('{gray-fg}No arbitrage opportunities found...\nMinimum spread: ' + (state.settings.minArbSpread * 100) + '%{/gray-fg}');
      return;
    }

    const lines: string[] = [];

    arbs.forEach((arb, idx) => {
      if (idx > 0) {
        lines.push('{gray-fg}────────────────────────────────{/gray-fg}');
      }

      const title = truncate(arb.polymarket.title, 38);
      const polyYes = arb.polymarket.yesPrice;
      const polyNo = arb.polymarket.noPrice;
      const kalshiYes = arb.kalshi.yesPrice;
      const kalshiNo = arb.kalshi.noPrice;

      // Calculate spreads (bid-ask spread for each side)
      const yesSpread = Math.abs(polyYes - kalshiYes);
      const noSpread = Math.abs(polyNo - kalshiNo);

      lines.push(`{bold}${title}{/bold}`);
      lines.push('');

      // YES/NO split boxes
      lines.push('┌──── YES ──────┬──── NO ───────┐');
      lines.push(`│ {magenta-fg}Poly{/magenta-fg}:  ${formatPrice(polyYes).padEnd(6)} │ {magenta-fg}Poly{/magenta-fg}:  ${formatPrice(polyNo).padEnd(6)} │`);
      lines.push(`│ {blue-fg}Klsh{/blue-fg}:  ${formatPrice(kalshiYes).padEnd(6)} │ {blue-fg}Klsh{/blue-fg}:  ${formatPrice(kalshiNo).padEnd(6)} │`);
      lines.push(`│ Δ:     ${formatSpread(yesSpread).padEnd(6)} │ Δ:     ${formatSpread(noSpread).padEnd(6)} │`);
      lines.push('└───────────────┴───────────────┘');

      // Summary
      const totalSpread = formatSpread(arb.spread);
      const direction = arb.direction.includes('poly') ? 'Buy Poly → Sell Kalshi' : 'Buy Kalshi → Sell Poly';

      lines.push(`{yellow-fg}{bold}Spread: ${totalSpread}{/bold}{/yellow-fg} • ${direction}`);
      lines.push(`{gray-fg}Confidence: ${Math.round(arb.confidence * 100)}%{/gray-fg}`);
    });

    this.box.setContent(lines.join('\n'));
  }
}
