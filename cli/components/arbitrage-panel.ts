/**
 * Arbitrage Panel Component
 *
 * Cross-platform arbitrage opportunities with YES/NO split (PolyDepth style)
 */

import blessed from 'blessed';
import { AppState } from '../app-state';
import { BaseComponent } from './base';
import { formatPrice, formatSpread } from '../utils';

export class ArbitragePanel extends BaseComponent {
  constructor(screen: blessed.Widgets.Screen, demoMode: boolean = false) {
    const container = blessed.box({
      top: 4,
      left: demoMode ? 0 : '50%',
      width: demoMode ? '100%' : '50%',
      height: demoMode ? 20 : 18,
      border: { type: 'line' },
      label: demoMode ? ' Bitcoin Arbitrage Demo ' : ' Arbitrage Opportunities ',
      tags: true,
      style: {
        border: { fg: 'yellow' },
      },
      wrap: true,
      scrollable: true,
      alwaysScroll: true,
    });

    screen.append(container);
    super(container);
  }

  render(state: AppState) {
    const arbs = this.getUniqueArbitrage(state).slice(0, 2); // Show top 2 unique arbs
    const demoMode = state.settings.demoMode === 'arb_only';

    if (arbs.length === 0) {
      this.box.setContent('{gray-fg}No arbitrage opportunities found...\nMinimum spread: ' + (state.settings.minArbSpread * 100) + '%{/gray-fg}');
      return;
    }

    const lines: string[] = [];

    arbs.forEach((arb, idx) => {
      if (idx > 0) {
        lines.push('{gray-fg}────────────────────────────────{/gray-fg}');
      }

      const title = arb.polymarket.title;
      const polyYes = arb.polymarket.yesPrice;
      const polyNo = arb.polymarket.noPrice;
      const kalshiYes = arb.kalshi.yesPrice;
      const kalshiNo = arb.kalshi.noPrice;

      // Calculate spreads (bid-ask spread for each side)
      const yesSpread = Math.abs(polyYes - kalshiYes);
      const noSpread = Math.abs(polyNo - kalshiNo);

      lines.push(...this.wrapLine(`{bold}${title}{/bold}`));
      lines.push(`YES: {magenta-fg}Poly{/magenta-fg} ${formatPrice(polyYes)} | {blue-fg}Klsh{/blue-fg} ${formatPrice(kalshiYes)} | Δ ${formatSpread(yesSpread)}`);
      lines.push(`NO:  {magenta-fg}Poly{/magenta-fg} ${formatPrice(polyNo)} | {blue-fg}Klsh{/blue-fg} ${formatPrice(kalshiNo)} | Δ ${formatSpread(noSpread)}`);

      // Summary
      const totalSpread = formatSpread(arb.spread);
      const direction = arb.direction.includes('poly') ? 'Buy Poly → Sell Kalshi' : 'Buy Kalshi → Sell Poly';

      lines.push(`{yellow-fg}{bold}Spread: ${totalSpread}{/bold}{/yellow-fg} • ${direction}`);
      lines.push(`{gray-fg}Confidence: ${Math.round(arb.confidence * 100)}%{/gray-fg}`);

      if (demoMode && state.demoPnl) {
        const pnlColor = state.demoPnl.amountUsd >= 0 ? 'green-fg' : 'red-fg';
        const pnlSign = state.demoPnl.amountUsd >= 0 ? '+' : '-';
        lines.push(
          `{${pnlColor}}Live PnL: ${pnlSign}$${Math.abs(state.demoPnl.amountUsd).toFixed(0)} ` +
          `(${pnlSign}${state.demoPnl.percent.toFixed(2)}%){/${pnlColor}}`
        );
        lines.push(
          `{gray-fg}Locked Edge: $${state.demoPnl.lockedEdgeUsd.toFixed(0)} on ` +
          `$${Math.round(state.demoPnl.notionalUsd).toLocaleString('en-US')} notional{/gray-fg}`
        );
      }
    });

    this.box.setContent(lines.join('\n'));
  }

  private getUniqueArbitrage(state: AppState): AppState['arbitrage'] {
    const seen = new Set<string>();
    const unique: AppState['arbitrage'] = [];

    for (const arb of state.arbitrage) {
      const key = `${arb.polymarket.title.trim().toLowerCase()}|${arb.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(arb);
    }

    return unique;
  }

  private wrapLine(line: string): string[] {
    const boxWidth = typeof this.box.width === 'number' ? this.box.width : 70;
    const max = Math.max(30, boxWidth - 4);

    if (line.length <= max) return [line];

    const words = line.split(' ');
    const out: string[] = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > max && current) {
        out.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) out.push(current);
    return out;
  }
}
