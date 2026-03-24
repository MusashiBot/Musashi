import { fetchPolymarkets } from '../src/api/polymarket-client';
import { fetchKalshiMarkets } from '../src/api/kalshi-client';
import { detectArbitrage } from '../src/api/arbitrage-detector';
import { getMarkets, getArbitrage } from '../api/lib/market-cache';

const POLYMARKET_TARGET_COUNT = parseInt(process.env.POLYMARKET_TARGET_COUNT || '800', 10);
const POLYMARKET_MAX_PAGES = parseInt(process.env.POLYMARKET_MAX_PAGES || '16', 10);
const KALSHI_TARGET_COUNT = parseInt(process.env.KALSHI_TARGET_COUNT || '600', 10);
const KALSHI_MAX_PAGES = parseInt(process.env.KALSHI_MAX_PAGES || '20', 10);
const ALLOW_KALSHI_NON_BINARY = process.env.ALLOW_KALSHI_NON_BINARY === '1';
const EXCLUDE_KALSHI_MVE = ALLOW_KALSHI_NON_BINARY
  ? process.env.EXCLUDE_KALSHI_MVE === '1'
  : true;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

async function main(): Promise<void> {
  console.log('Testing local market fetchers...');
  console.log(
    `Source coverage: Poly ${POLYMARKET_TARGET_COUNT} markets / ${POLYMARKET_MAX_PAGES} pages, ` +
    `Kalshi ${KALSHI_TARGET_COUNT} markets / ${KALSHI_MAX_PAGES} pages`,
  );
  console.log(`Kalshi non-binary in local test: ${ALLOW_KALSHI_NON_BINARY ? 'enabled' : 'disabled'}`);
  console.log(`Kalshi MVE filter in local test: ${EXCLUDE_KALSHI_MVE ? 'exclude' : 'include'}`);

  const [polyResult, kalshiResult] = await Promise.allSettled([
    fetchPolymarkets(Math.min(POLYMARKET_TARGET_COUNT, 100), Math.min(POLYMARKET_MAX_PAGES, 3)),
    fetchKalshiMarkets(
      Math.min(KALSHI_TARGET_COUNT, 100),
      Math.min(KALSHI_MAX_PAGES, 3),
      {
        includeNonBinary: ALLOW_KALSHI_NON_BINARY,
        excludeMve: EXCLUDE_KALSHI_MVE,
      },
    ),
  ]);

  if (polyResult.status === 'fulfilled') {
    console.log(`Polymarket fetch: OK (${polyResult.value.length} markets)`);
  } else {
    console.log(`Polymarket fetch: FAIL (${String(polyResult.reason)})`);
  }

  if (kalshiResult.status === 'fulfilled') {
    console.log(`Kalshi fetch: OK (${kalshiResult.value.length} markets)`);
  } else {
    console.log(`Kalshi fetch: FAIL (${String(kalshiResult.reason)})`);
  }

  console.log('');
  console.log('Testing shared market cache...');

  const markets = ALLOW_KALSHI_NON_BINARY
    ? await loadLocalTestMarkets()
    : await getMarkets();
  const polymarketCount = markets.filter((market) => market.platform === 'polymarket').length;
  const kalshiCount = markets.filter((market) => market.platform === 'kalshi').length;

  console.log(`Combined markets: ${markets.length}`);
  console.log(`Polymarket count: ${polymarketCount}`);
  console.log(`Kalshi count: ${kalshiCount}`);

  console.log('');
  console.log('Testing arbitrage detection...');

  const opportunities = ALLOW_KALSHI_NON_BINARY
    ? detectArbitrage(markets, 0.01)
    : await getArbitrage(0.01);
  console.log(`Arbitrage count: ${opportunities.length}`);

  for (const [index, opportunity] of opportunities.slice(0, 5).entries()) {
    console.log(
      `${index + 1}. ${formatPercent(opportunity.spread)} | ` +
      `${opportunity.polymarket.title} <> ${opportunity.kalshi.title} | ` +
      `${opportunity.matchReason}`,
    );
  }
}

async function loadLocalTestMarkets() {
  console.log('[Local Test] Loading markets with Kalshi non-binary enabled...');

  const [polymarkets, kalshiMarkets] = await Promise.all([
    fetchPolymarkets(POLYMARKET_TARGET_COUNT, POLYMARKET_MAX_PAGES),
    fetchKalshiMarkets(KALSHI_TARGET_COUNT, KALSHI_MAX_PAGES, {
      includeNonBinary: true,
      excludeMve: EXCLUDE_KALSHI_MVE,
    }),
  ]);

  return [...polymarkets, ...kalshiMarkets];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
