import { ArbitrageOpportunity, Market } from '../types/market';

const CATEGORY_ALIASES: Record<string, string[]> = {
  crypto: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'sol', 'solana', 'doge', 'xrp'],
  economics: ['economics', 'economy', 'economic', 'fed', 'cpi', 'inflation', 'gdp', 'rates', 'jobs'],
  us_politics: ['us_politics', 'politics', 'political', 'election', 'elections', 'trump', 'biden', 'congress', 'senate'],
  technology: ['technology', 'tech', 'ai', 'openai', 'nvda', 'nvidia', 'tesla', 'apple', 'microsoft'],
  sports: ['sports', 'sport', 'nfl', 'nba', 'mlb', 'nhl', 'fifa', 'tennis', 'golf'],
  climate: ['climate', 'weather', 'energy', 'oil', 'carbon'],
  geopolitics: ['geopolitics', 'geopolitical', 'ukraine', 'russia', 'china', 'taiwan', 'israel', 'gaza', 'iran'],
  religion: ['religion', 'religious', 'jesus', 'christ', 'christian', 'pope', 'vatican', 'bible', 'catholic'],
};

function normalizeCategoryToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function parseRawValues(input: string | string[] | undefined): string[] {
  if (!input) return [];

  const values = Array.isArray(input) ? input : [input];
  return values
    .flatMap((value) => value.split(','))
    .map((value) => normalizeCategoryToken(value))
    .filter(Boolean);
}

function expandCategoryTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);

    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (token === category || aliases.includes(token)) {
        expanded.add(category);
        for (const alias of aliases) {
          expanded.add(alias);
        }
      }
    }
  }

  return Array.from(expanded);
}

function marketSearchText(market: Market): string {
  return normalizeCategoryToken(
    [market.category, market.title, market.description, ...market.keywords].join(' '),
  );
}

export function parseCategoryFilter(input: string | string[] | undefined): string[] {
  return expandCategoryTokens(parseRawValues(input));
}

export function matchesCategoryFilter(
  market: Market,
  categories: string[],
): boolean {
  if (categories.length === 0) return true;

  const normalizedCategory = normalizeCategoryToken(market.category);
  const searchableText = marketSearchText(market);

  return categories.some((token) => {
    if (normalizedCategory === token) return true;
    return searchableText.includes(token.replace(/_/g, ' ')) || searchableText.includes(token);
  });
}

export function filterMarketsByCategory(
  markets: Market[],
  input: string | string[] | undefined,
): Market[] {
  const categories = parseCategoryFilter(input);
  if (categories.length === 0) return markets;
  return markets.filter((market) => matchesCategoryFilter(market, categories));
}

export function filterArbitrageByCategory(
  opportunities: ArbitrageOpportunity[],
  input: string | string[] | undefined,
): ArbitrageOpportunity[] {
  const categories = parseCategoryFilter(input);
  if (categories.length === 0) return opportunities;

  return opportunities.filter((opportunity) => (
    matchesCategoryFilter(opportunity.polymarket, categories) ||
    matchesCategoryFilter(opportunity.kalshi, categories)
  ));
}
