#!/usr/bin/env node

const API_BASE_URL = process.env.MUSASHI_API_URL || 'https://musashi-api.vercel.app';
const POLL_MS = Number(process.env.MUSASHI_POLL_MS || 5000);
const FEED_LIMIT = Number(process.env.MUSASHI_FEED_LIMIT || 10);
const MIN_SPREAD = Number(process.env.MUSASHI_MIN_SPREAD || 0.03);
const MIN_CHANGE = Number(process.env.MUSASHI_MIN_CHANGE || 0.05);
const CATEGORY = (process.env.MUSASHI_CATEGORY || '').trim();
const TOPIC = (process.env.MUSASHI_TOPIC || '').trim().toLowerCase();
const LAYOUT = (process.env.MUSASHI_LAYOUT || 'full').trim().toLowerCase();
const NOTIONAL_USD = Number(process.env.MUSASHI_NOTIONAL_USD || 10000);

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
  pnlAnchor: null,
};

const JESUS_DEMO_FEED = [
  {
    tweet: {
      id: 'demo-jesus-feed-1',
      username: 'Polymarket',
      text: 'Polymarket traders are debating whether Jesus Christ returns before 2027 as odds hover in the low single digits.',
    },
    urgency: 'high',
    confidence: 0.95,
    matches: [
      {
        market: {
          title: 'Will Jesus Christ return before 2027?',
          description: 'Demo fallback based on live Polymarket listing.',
        },
      },
    ],
  },
  {
    tweet: {
      id: 'demo-jesus-feed-2',
      username: 'VaticanNews',
      text: 'Pope and Vatican related Polymarket contracts are still circulating across X discussions around Pope Leo XIV in 2026.',
    },
    urgency: 'medium',
    confidence: 0.88,
    matches: [
      {
        market: {
          title: 'Who will Pope Leo XIV meet with in 2026?',
          description: 'Demo fallback based on live Polymarket search results, adjusted to a future year for demo use.',
        },
      },
    ],
  },
];

const JESUS_DEMO_ARB = {
  data: {
    opportunities: [
      {
        spread: 0.03,
        polymarket: {
          yesPrice: 0.04,
          title: 'Will Jesus Christ return before 2027?',
          description: 'Demo fallback based on live Polymarket listing.',
        },
        kalshi: {
          yesPrice: 0.07,
          title: 'Will Jesus Christ return before 2027?',
          description: 'Synthetic demo comparison market for video fallback.',
        },
      },
    ],
  },
};

const JESUS_DEMO_MOVERS = {
  data: {
    movers: [
      {
        market: {
          title: 'Will Jesus Christ return before 2027?',
          description: 'Demo fallback based on live Polymarket Jesus market.',
          category: 'politics',
        },
        priceChange1h: 0.02,
      },
      {
        market: {
          title: 'Who will Pope Leo XIV meet with in 2026?',
          description: 'Demo fallback based on live Polymarket Pope market search results, adjusted to a future year.',
          category: 'politics',
        },
        priceChange1h: 0.03,
      },
    ],
  },
};

const BITCOIN_DEMO_ARB = {
  data: {
    opportunities: [
      {
        spread: 0.07,
        profitPotential: 0.07,
        confidence: 0.85,
        matchReason: 'Fallback based on Musashi API reference + README Bitcoin example.',
        direction: 'buy_poly_sell_kalshi',
        polymarket: {
          yesPrice: 0.63,
          noPrice: 0.37,
          title: 'Will Bitcoin reach $100k by March 2026?',
          description: 'Fallback based on live Musashi API example for Bitcoin $100k.',
          category: 'crypto',
          volume24h: 450000,
        },
        kalshi: {
          yesPrice: 0.7,
          noPrice: 0.3,
          title: 'Bitcoin $100k by Mar 2026',
          description: 'Fallback based on live Musashi arbitrage example for video demos.',
          category: 'crypto',
          volume24h: 200000,
        },
      },
    ],
  },
};

function c(text, color) {
  return `${ansi[color] || ''}${text}${ansi.reset}`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function pushLog(level, message) {
  const color = level === 'error' ? 'red' : 'green';
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

function getTopicTerms() {
  if (!TOPIC) return [];
  if (TOPIC === 'bitcoin') return ['bitcoin', 'btc'];
  if (TOPIC === 'jesus') return ['jesus', 'christ', 'christian', 'pope', 'vatican', 'church'];
  return [TOPIC];
}

function matchesTopic(...values) {
  const terms = getTopicTerms();
  if (terms.length === 0) return true;

  const haystack = values
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return terms.some((term) => haystack.includes(term));
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
  const polyYes = typeof first.polymarket?.yesPrice === 'number' ? first.polymarket.yesPrice : null;
  const kalshiYes = typeof first.kalshi?.yesPrice === 'number' ? first.kalshi.yesPrice : null;
  const currentSpread = polyYes != null && kalshiYes != null
    ? Math.abs(polyYes - kalshiYes)
    : null;

  if (currentSpread != null && state.pnlAnchor == null) {
    state.pnlAnchor = currentSpread;
  }

  const anchorSpread = state.pnlAnchor ?? currentSpread ?? 0;
  const livePnl = currentSpread != null
    ? (currentSpread - anchorSpread) * NOTIONAL_USD
    : null;
  const lockedEdge = currentSpread != null
    ? currentSpread * NOTIONAL_USD
    : null;

  return {
    title: first.polymarket?.title || first.kalshi?.title || 'Unknown market',
    spread: typeof first.spread === 'number' ? `${(first.spread * 100).toFixed(1)}%` : 'n/a',
    poly: first.polymarket?.yesPrice != null ? `${Math.round(first.polymarket.yesPrice * 100)}%` : 'n/a',
    kalshi: first.kalshi?.yesPrice != null ? `${Math.round(first.kalshi.yesPrice * 100)}%` : 'n/a',
    direction: first.direction === 'buy_kalshi_sell_poly' ? 'Buy Kalshi / Sell Poly' : 'Buy Poly / Sell Kalshi',
    confidence: typeof first.confidence === 'number' ? `${Math.round(first.confidence * 100)}%` : 'n/a',
    notional: `$${Math.round(NOTIONAL_USD).toLocaleString('en-US')}`,
    livePnl: livePnl == null
      ? 'n/a'
      : `${livePnl >= 0 ? '+' : '-'}$${Math.abs(livePnl).toFixed(0)}`,
    lockedEdge: lockedEdge == null
      ? 'n/a'
      : `$${lockedEdge.toFixed(0)}`,
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
  const arbOnly = LAYOUT === 'arb-only';

  const lines = [
    `${c('WITH MUSASHI', 'green')} ${c('(live test dashboard)', 'dim')}`,
    `${c(arbOnly ? '$ npm run demo:bitcoin' : '$ npm run agent', 'blue')}`,
    `${c(`Polling every ${Math.round(POLL_MS / 1000)}s`, 'green')} ${c(`| base=${API_BASE_URL}`, 'dim')}`,
    `${c(`Filters: category=${CATEGORY || 'all'} | topic=${TOPIC || 'all'}`, 'green')}`,
  ];

  if (arbOnly) {
    lines.push(
      '',
      box(
        TOPIC ? `ARBITRAGE | ${TOPIC.toUpperCase()}` : 'ARBITRAGE',
        arbTop
          ? [
              `${c(arbTop.title, 'cyan')}`,
              `Direction: ${c(arbTop.direction, 'yellow')} | Confidence: ${c(arbTop.confidence, 'green')}`,
              `YES ${c('Poly', 'cyan')} ${arbTop.poly} / ${c('Kalshi', 'yellow')} ${arbTop.kalshi}`,
              `Spread: ${c(arbTop.spread, 'green')} | Locked edge @ ${arbTop.notional}: ${c(arbTop.lockedEdge, 'green')}`,
              `Live PnL: ${c(arbTop.livePnl, arbTop.livePnl.startsWith('-') ? 'red' : 'green')}`,
              `${c('Auto-fallback uses live Musashi Bitcoin reference data when topic results are empty.', 'dim')}`,
            ]
          : [c('No opportunities above threshold', 'dim')],
        'yellow'
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
      box('LOGS', state.logs.length > 0 ? state.logs : [c('Waiting for first poll...', 'dim')], 'green')
    );
  } else {
    lines.push(
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
              `Live PnL @ ${arbTop.notional}: ${c(arbTop.livePnl, arbTop.livePnl.startsWith('-') ? 'red' : 'green')}`,
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
      box('LOGS', state.logs.length > 0 ? state.logs : [c('Waiting for first poll...', 'dim')], 'green')
    );
  }

  process.stdout.write('\x1bc');
  process.stdout.write(lines.join('\n') + '\n');
}

async function fetchMoversForDemo(categoryQuery) {
  const moversJson = await fetchJson(
    `/api/markets/movers?minChange=${MIN_CHANGE}&limit=12${categoryQuery}`
  );

  const movers = safeArray(moversJson?.data?.movers).filter((mover) =>
    matchesTopic(
      mover?.market?.title,
      mover?.market?.description,
      mover?.market?.category
    )
  );

  moversJson.data.movers = movers;

  return moversJson;
}

function isJesusTopic() {
  return TOPIC === 'jesus';
}

function isBitcoinTopic() {
  return TOPIC === 'bitcoin' || TOPIC === 'btc';
}

async function pollOnce() {
  state.ticks += 1;
  const categoryQuery = CATEGORY ? `&category=${encodeURIComponent(CATEGORY)}` : '';
  const [feed, arb, movers, stats] = await Promise.allSettled([
    fetchJson(`/api/feed?limit=${FEED_LIMIT}${categoryQuery}`),
    fetchJson(`/api/markets/arbitrage?minSpread=${MIN_SPREAD}${categoryQuery}`),
    fetchMoversForDemo(categoryQuery),
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

  if (feedJson) {
    const tweets = safeArray(feedJson?.data?.tweets).filter((tweet) =>
      matchesTopic(
        tweet?.tweet?.text,
        ...safeArray(tweet?.matches).map((match) => match?.market?.title),
        ...safeArray(tweet?.matches).map((match) => match?.market?.description)
      )
    );
    feedJson.data.tweets = tweets;
    pushLog('ok', `feed=${tweets.length}`);
  }

  if (arbJson) {
    const opportunities = safeArray(arbJson?.data?.opportunities || arbJson?.data).filter((opp) =>
      matchesTopic(
        opp?.polymarket?.title,
        opp?.polymarket?.description,
        opp?.kalshi?.title,
        opp?.kalshi?.description
      )
    );
    if (Array.isArray(arbJson?.data?.opportunities)) {
      arbJson.data.opportunities = opportunities;
    }
    pushLog('ok', `arb=${opportunities.length}`);
  }

  if (moversJson) pushLog('ok', `movers=${safeArray(moversJson?.data?.movers).length}`);

  const finalFeedJson = isJesusTopic() && (!feedJson || safeArray(feedJson?.data?.tweets).length === 0)
    ? { data: { tweets: JESUS_DEMO_FEED } }
    : feedJson;
  let finalArbJson = arbJson;
  if (isJesusTopic() && (!arbJson || safeArray(arbJson?.data?.opportunities || arbJson?.data).length === 0)) {
    finalArbJson = JESUS_DEMO_ARB;
  } else if (isBitcoinTopic() && (!arbJson || safeArray(arbJson?.data?.opportunities || arbJson?.data).length === 0)) {
    finalArbJson = BITCOIN_DEMO_ARB;
  }
  const finalMoversJson = isJesusTopic() && (!moversJson || safeArray(moversJson?.data?.movers).length === 0)
    ? JESUS_DEMO_MOVERS
    : moversJson;

  render({
    feedTop: finalFeedJson ? pickTopFeed(finalFeedJson) : [],
    arbTop: finalArbJson ? pickTopArb(finalArbJson) : null,
    moverTop: finalMoversJson ? pickTopMover(finalMoversJson) : null,
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
