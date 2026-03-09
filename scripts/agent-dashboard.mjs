#!/usr/bin/env node

const API_BASE_URL = process.env.MUSASHI_API_URL || 'https://musashi-api.vercel.app';
const POLL_MS = Number(process.env.MUSASHI_POLL_MS || 5000);
const FEED_LIMIT = Number(process.env.MUSASHI_FEED_LIMIT || 10);
const MIN_SPREAD = Number(process.env.MUSASHI_MIN_SPREAD || 0.03);
const MIN_CHANGE = Number(process.env.MUSASHI_MIN_CHANGE || 0.05);

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const state = {
  ticks: 0,
  errors: 0,
  logs: [],
};

function c(text, color) {
  return `${ansi[color] || ''}${text}${ansi.reset}`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function pushLog(level, message) {
  const color = level === 'error' ? 'red' : level === 'warn' ? 'yellow' : 'green';
  state.logs.unshift(`${c(`[${nowTime()}]`, 'dim')} ${c(level.toUpperCase(), color)} ${message}`);
  state.logs = state.logs.slice(0, 8);
}

async function fetchJson(path) {
  const url = `${API_BASE_URL}${path}`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`${path} -> network error: ${cause}`);
  }

  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      body = '<unreadable response body>';
    }
    const compactBody = body.replace(/\s+/g, ' ').trim();
    const preview = compactBody.length > 280 ? `${compactBody.slice(0, 280)}...` : compactBody;
    throw new Error(
      `${path} -> HTTP ${res.status} ${res.statusText || ''} | body: ${preview || '<empty>'}`
    );
  }
  return res.json();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickTopFeed(feedJson) {
  const tweets = safeArray(feedJson?.data?.tweets);
  return tweets.slice(0, 2).map((t) => ({
    user: t?.tweet?.username || 'unknown',
    urgency: t?.urgency || 'unknown',
    confidence: typeof t?.confidence === 'number' ? `${Math.round(t.confidence * 100)}%` : 'n/a',
    text: (t?.tweet?.text || '').replace(/\s+/g, ' ').slice(0, 56),
  }));
}

function pickTopArb(arbJson) {
  const raw = safeArray(arbJson?.data?.opportunities || arbJson?.data);
  const first = raw[0];
  if (!first) return null;
  return {
    spread: typeof first.spread === 'number' ? `${(first.spread * 100).toFixed(1)}%` : 'n/a',
    poly: first.polymarket?.yesPrice != null ? `${Math.round(first.polymarket.yesPrice * 100)}%` : 'n/a',
    kalshi: first.kalshi?.yesPrice != null ? `${Math.round(first.kalshi.yesPrice * 100)}%` : 'n/a',
  };
}

function pickTopMover(moversJson) {
  const movers = safeArray(moversJson?.data?.movers);
  const first = movers[0];
  if (!first) return null;
  return {
    title: (first.market?.title || 'unknown').slice(0, 44),
    change: typeof first.priceChange1h === 'number'
      ? `${first.priceChange1h >= 0 ? '+' : ''}${(first.priceChange1h * 100).toFixed(1)}%`
      : 'n/a',
  };
}

function getBoxWidth() {
  const columns = process.stdout.columns || 100;
  return Math.max(60, Math.min(columns - 2, 140));
}

function wrapLine(line, width) {
  const visibleMax = width - 4;
  if (line.length <= visibleMax) return [line];

  const chunks = [];
  let remaining = line;
  while (remaining.length > visibleMax) {
    let cut = remaining.lastIndexOf(' ', visibleMax);
    if (cut < Math.floor(visibleMax * 0.5)) {
      cut = visibleMax;
    }
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function box(title, lines, color = 'green') {
  const width = getBoxWidth();
  const top = c(`+${'-'.repeat(width - 2)}+`, color);
  const head = c(`| ${title.padEnd(width - 4)} |`, color);
  const body = lines.flatMap((line) =>
    wrapLine(line, width).map((wrapped) => `| ${wrapped.padEnd(width - 4)} |`)
  );
  const bottom = c(`+${'-'.repeat(width - 2)}+`, color);
  return [top, head, top, ...body, bottom].join('\n');
}

function render({ feedTop, arbTop, moverTop, stats }) {
  const statsTweets = stats?.data?.tweets?.last_24h ?? 'n/a';
  const lastCollection = stats?.data?.last_collection ?? 'n/a';

  const lines = [
    `${c('WITH MUSASHI', 'green')} ${c('(live test dashboard)', 'dim')}`,
    `${c('$ npm run agent', 'blue')}`,
    `${c(`Polling every ${Math.round(POLL_MS / 1000)}s`, 'green')} ${c(`| base=${API_BASE_URL}`, 'dim')}`,
    '',
    box(
      'FEED',
      feedTop.length > 0
        ? feedTop.flatMap((f) => [
            `${c('@' + f.user, 'cyan')} ${c('[' + f.urgency + ']', 'yellow')} ${c(f.confidence, 'green')}`,
            `${f.text}`,
          ])
        : [c('No tweets (feed empty or Twitter credits blocked)', 'dim')],
      'cyan'
    ),
    '',
    box(
      'ARBITRAGE',
      arbTop
        ? [
            `Spread: ${c(arbTop.spread, 'green')}`,
            `YES ${c('Poly', 'cyan')} ${arbTop.poly} / ${c('Kalshi', 'yellow')} ${arbTop.kalshi}`,
          ]
        : [c('No opportunities above threshold', 'dim')],
      'yellow'
    ),
    '',
    box(
      'MOVERS',
      moverTop
        ? [moverTop.title, `1h change: ${c(moverTop.change, moverTop.change.startsWith('-') ? 'red' : 'green')}`]
        : [c('No movers above threshold', 'dim')],
      'red'
    ),
    '',
    box(
      'STATS',
      [
        `Tweets(24h): ${statsTweets}`,
        `Last collect: ${String(lastCollection).slice(0, 19)}`,
        `Ticks: ${state.ticks}`,
        `Errors: ${state.errors}`,
      ],
      'green'
    ),
    '',
    box('LOGS', state.logs.length > 0 ? state.logs : [c('Waiting for first poll...', 'dim')], 'green'),
  ];

  process.stdout.write('\x1bc');
  process.stdout.write(lines.join('\n') + '\n');
}

async function pollOnce() {
  state.ticks += 1;
  const [feed, arb, movers, stats] = await Promise.allSettled([
    fetchJson(`/api/feed?limit=${FEED_LIMIT}`),
    fetchJson(`/api/markets/arbitrage?minSpread=${MIN_SPREAD}`),
    fetchJson(`/api/markets/movers?minChange=${MIN_CHANGE}`),
    fetchJson('/api/feed/stats'),
  ]);

  const get = (settled, label) => {
    if (settled.status === 'fulfilled') return settled.value;
    state.errors += 1;
    pushLog('error', `${label}: ${String(settled.reason?.message || settled.reason)}`);
    return null;
  };

  const feedJson = get(feed, 'feed');
  const arbJson = get(arb, 'arbitrage');
  const moversJson = get(movers, 'movers');
  const statsJson = get(stats, 'stats');

  if (feedJson) pushLog('ok', `feed=${safeArray(feedJson?.data?.tweets).length}`);
  if (arbJson) pushLog('ok', `arb=${safeArray(arbJson?.data?.opportunities || arbJson?.data).length}`);
  if (moversJson) pushLog('ok', `movers=${safeArray(moversJson?.data?.movers).length}`);

  render({
    feedTop: feedJson ? pickTopFeed(feedJson) : [],
    arbTop: arbJson ? pickTopArb(arbJson) : null,
    moverTop: moversJson ? pickTopMover(moversJson) : null,
    stats: statsJson,
  });
}

async function main() {
  pushLog('ok', 'dashboard started');
  await pollOnce();
  setInterval(() => {
    pollOnce().catch((error) => {
      state.errors += 1;
      pushLog('error', String(error?.message || error));
    });
  }, POLL_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
