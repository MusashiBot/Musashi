import { fetchPolymarkets } from '../src/api/polymarket-client';
import { fetchKalshiMarkets } from '../src/api/kalshi-client';
import { Market } from '../src/types/market';

const POLYMARKET_TARGET_COUNT = parseInt(process.env.POLYMARKET_TARGET_COUNT || '800', 10);
const POLYMARKET_MAX_PAGES = parseInt(process.env.POLYMARKET_MAX_PAGES || '16', 10);
const KALSHI_TARGET_COUNT = parseInt(process.env.KALSHI_TARGET_COUNT || '600', 10);
const KALSHI_MAX_PAGES = parseInt(process.env.KALSHI_MAX_PAGES || '20', 10);
const ALLOW_KALSHI_NON_BINARY = process.env.ALLOW_KALSHI_NON_BINARY === '1';
const EXCLUDE_KALSHI_MVE = ALLOW_KALSHI_NON_BINARY
  ? process.env.EXCLUDE_KALSHI_MVE === '1'
  : true;
const DEBUG_LIMIT = parseInt(process.env.ARBITRAGE_DEBUG_LIMIT || '20', 10);
const MIN_SPREAD = parseFloat(process.env.ARBITRAGE_DEBUG_MIN_SPREAD || '0.01');

const STOP_WORDS = new Set([
  'will', 'before', 'after', 'than', 'over', 'under', 'above', 'below',
  'market', 'price', 'world', 'company', 'companies', 'largest', 'smallest',
  'first', 'last', 'today', 'tomorrow', 'march', 'april', 'january',
  'february', 'june', 'july', 'august', 'september', 'october', 'november',
  'december',
]);

interface Candidate {
  polymarket: Market;
  kalshi: Market;
  spread: number;
  titleSimilarity: number;
  keywordOverlap: number;
  sharedEntities: string[];
  sharedKeywords: string[];
  categoryMatch: boolean;
  score: number;
  likelyBlocker: string;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\?/g, '')
    .replace(/\b(will|before|after|by|in|on|at|the|a|an|of|to)\b/g, '')
    .replace(/\b(2024|2025|2026|2027|2028)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEntities(title: string): Set<string> {
  const entities = new Set<string>();

  for (const word of normalizeTitle(title).split(' ')) {
    if (word.length >= 3 && !STOP_WORDS.has(word)) {
      entities.add(word);
    }
  }

  return entities;
}

function titleSimilarity(left: string, right: string): number {
  const leftEntities = extractEntities(left);
  const rightEntities = extractEntities(right);

  if (leftEntities.size === 0 || rightEntities.size === 0) {
    return 0;
  }

  let sharedCount = 0;
  for (const entity of leftEntities) {
    if (rightEntities.has(entity)) {
      sharedCount++;
    }
  }

  const union = leftEntities.size + rightEntities.size - sharedCount;
  return union > 0 ? sharedCount / union : 0;
}

function filteredKeywords(market: Market): Set<string> {
  return new Set(
    market.keywords.filter((keyword) => keyword.length >= 4 && !STOP_WORDS.has(keyword)),
  );
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  const shared: string[] = [];

  for (const item of left) {
    if (right.has(item)) {
      shared.push(item);
    }
  }

  return shared;
}

function blockerFor(candidate: Candidate): string {
  if (!candidate.categoryMatch) {
    return 'category mismatch';
  }
  if (candidate.sharedEntities.length >= 2 && candidate.titleSimilarity <= 0.3) {
    return 'needs higher title similarity for shared entities';
  }
  if (candidate.keywordOverlap >= 3 && candidate.titleSimilarity <= 0.15) {
    return 'keyword overlap exists but title similarity too low';
  }
  if (candidate.sharedEntities.length === 0 && candidate.keywordOverlap === 0) {
    return 'no shared entities or keywords';
  }
  if (candidate.sharedEntities.length < 2 && candidate.keywordOverlap < 3) {
    return 'not enough shared entities/keywords';
  }
  if (candidate.spread < MIN_SPREAD) {
    return 'spread too low';
  }
  return 'near miss';
}

function candidateScore(candidate: Candidate): number {
  return (
    candidate.spread * 100 +
    candidate.titleSimilarity * 10 +
    candidate.keywordOverlap * 2 +
    candidate.sharedEntities.length * 3 +
    (candidate.categoryMatch ? 2 : 0)
  );
}

async function main(): Promise<void> {
  console.log('Loading local markets for arbitrage debug...');
  console.log(
    `Coverage: Poly ${POLYMARKET_TARGET_COUNT}/${POLYMARKET_MAX_PAGES} pages, ` +
    `Kalshi ${KALSHI_TARGET_COUNT}/${KALSHI_MAX_PAGES} pages`,
  );
  console.log(`Kalshi non-binary: ${ALLOW_KALSHI_NON_BINARY ? 'enabled' : 'disabled'}`);
  console.log(`Kalshi MVE filter: ${EXCLUDE_KALSHI_MVE ? 'exclude' : 'include'}`);
  console.log(`Debug limit: ${DEBUG_LIMIT}, min spread: ${MIN_SPREAD}`);

  const [polymarkets, kalshiMarkets] = await Promise.all([
    fetchPolymarkets(POLYMARKET_TARGET_COUNT, POLYMARKET_MAX_PAGES),
    fetchKalshiMarkets(KALSHI_TARGET_COUNT, KALSHI_MAX_PAGES, {
      includeNonBinary: ALLOW_KALSHI_NON_BINARY,
      excludeMve: EXCLUDE_KALSHI_MVE,
    }),
  ]);

  console.log(`Loaded ${polymarkets.length} Polymarket and ${kalshiMarkets.length} Kalshi markets`);

  const candidates: Candidate[] = [];

  for (const polymarket of polymarkets) {
    const polyEntities = extractEntities(polymarket.title);
    const polyKeywords = filteredKeywords(polymarket);

    for (const kalshi of kalshiMarkets) {
      const sharedEntities = intersection(polyEntities, extractEntities(kalshi.title));
      const sharedKeywords = intersection(polyKeywords, filteredKeywords(kalshi));
      const spread = Math.abs(polymarket.yesPrice - kalshi.yesPrice);
      const similarity = titleSimilarity(polymarket.title, kalshi.title);
      const categoryMatch =
        polymarket.category === kalshi.category && polymarket.category !== 'other';

      const candidate: Candidate = {
        polymarket,
        kalshi,
        spread,
        titleSimilarity: similarity,
        keywordOverlap: sharedKeywords.length,
        sharedEntities,
        sharedKeywords,
        categoryMatch,
        score: 0,
        likelyBlocker: '',
      };

      if (
        spread < MIN_SPREAD ||
        (!categoryMatch && sharedEntities.length === 0 && sharedKeywords.length === 0) ||
        (sharedEntities.length === 0 && sharedKeywords.length === 0 && similarity === 0)
      ) {
        continue;
      }

      candidate.likelyBlocker = blockerFor(candidate);
      candidate.score = candidateScore(candidate);
      candidates.push(candidate);
    }
  }

  candidates.sort((left, right) => right.score - left.score);

  console.log('');
  console.log(`Top ${Math.min(DEBUG_LIMIT, candidates.length)} near-match candidates:`);

  for (const [index, candidate] of candidates.slice(0, DEBUG_LIMIT).entries()) {
    console.log('');
    console.log(
      `${index + 1}. spread=${(candidate.spread * 100).toFixed(2)}% ` +
      `titleSim=${candidate.titleSimilarity.toFixed(2)} ` +
      `keywordOverlap=${candidate.keywordOverlap} ` +
      `sharedEntities=${candidate.sharedEntities.length} ` +
      `categoryMatch=${candidate.categoryMatch}`,
    );
    console.log(`   blocker: ${candidate.likelyBlocker}`);
    console.log(`   poly:   [${candidate.polymarket.category}] ${candidate.polymarket.title}`);
    console.log(`   kalshi: [${candidate.kalshi.category}] ${candidate.kalshi.title}`);
    console.log(
      `   shared entities: ${candidate.sharedEntities.length > 0 ? candidate.sharedEntities.join(', ') : '(none)'}`,
    );
    console.log(
      `   shared keywords: ${candidate.sharedKeywords.length > 0 ? candidate.sharedKeywords.slice(0, 8).join(', ') : '(none)'}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
