/**
 * Keyword extraction and normalization
 */

// Stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
  'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
]);

// Domain-specific synonym expansion
export const SYNONYM_MAP: Record<string, string[]> = {
  // Crypto
  'bitcoin': ['btc', 'bitcoin', 'cryptocurrency'],
  'btc': ['bitcoin', 'cryptocurrency'],
  'ethereum': ['eth', 'ethereum', 'ether'],
  'eth': ['ethereum', 'ether'],
  'crypto': ['cryptocurrency', 'bitcoin', 'ethereum', 'blockchain'],
  'defi': ['decentralized finance', 'crypto', 'ethereum'],

  // AI & Tech
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt'],
  'artificial intelligence': ['ai', 'machine learning', 'ml'],
  'machine learning': ['ai', 'ml', 'artificial intelligence'],
  'openai': ['chatgpt', 'gpt', 'ai', 'openai'],
  'chatgpt': ['gpt', 'openai', 'ai'],
  'anthropic': ['claude', 'ai'],
  'claude': ['anthropic', 'ai'],
  'nvidia': ['gpu', 'ai hardware', 'chip'],

  // AI Agents (expanded)
  'agents': ['ai', 'ai agents', 'autonomous', 'agentic'],
  'ai agents': ['agents', 'autonomous agents', 'multi-agent'],
  'autonomous': ['agents', 'agentic', 'automation'],
  'agentic': ['agents', 'ai agents', 'autonomous'],
  'multi-agent': ['agents', 'swarm', 'autonomous'],
  'swarm': ['multi-agent', 'agents', 'ai swarm'],
  'reasoning': ['ai', 'llm', 'agents', 'inference'],
  'planning': ['ai', 'agents', 'agentic'],
  'tool use': ['ai', 'agents', 'function calling'],
  'langchain': ['ai', 'agents', 'llm'],
  'autogen': ['ai', 'agents', 'microsoft'],
  'crewai': ['ai', 'agents', 'multi-agent'],

  // Politics
  'election': ['vote', 'voting', 'poll', 'campaign'],
  'trump': ['donald trump', 'president trump', 'gop'],
  'biden': ['joe biden', 'president biden', 'democrat'],
  'congress': ['senate', 'house', 'legislature'],

  // Finance
  'stock': ['stocks', 'equity', 'market', 'trading'],
  'market': ['stock market', 'trading', 'exchange'],
  'fed': ['federal reserve', 'interest rate', 'central bank'],
  'inflation': ['cpi', 'price increase', 'economy'],

  // Tech Companies
  'google': ['alphabet', 'search', 'android'],
  'apple': ['iphone', 'ios', 'mac'],
  'microsoft': ['msft', 'windows', 'azure'],
  'amazon': ['amzn', 'aws', 'bezos'],
  'meta': ['facebook', 'instagram', 'zuckerberg'],
  'tesla': ['tsla', 'elon', 'musk', 'electric vehicle'],
};

/**
 * Extract meaningful keywords from text
 */
export function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .trim();

  const words = normalized.split(/\s+/).filter((w) => w.length > 2);

  // Filter stop words
  const keywords = words.filter((w) => !STOP_WORDS.has(w));

  return keywords;
}

/**
 * Extract meaningful phrases (2-4 word combinations)
 */
export function extractPhrases(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'&]/g, ' ')
    .trim();

  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  const phrases = new Set<string>();

  // Extract bigrams (2-word)
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (isMeaningfulPhrase(phrase)) {
      phrases.add(phrase);
    }
  }

  // Extract trigrams (3-word)
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (isMeaningfulPhrase(phrase)) {
      phrases.add(phrase);
    }
  }

  // Extract 4-grams for specific entities
  for (let i = 0; i < words.length - 3; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
    if (isMeaningfulPhrase(phrase)) {
      phrases.add(phrase);
    }
  }

  return Array.from(phrases);
}

/**
 * Check if a phrase is meaningful (not all stop words)
 */
function isMeaningfulPhrase(phrase: string): boolean {
  const words = phrase.split(' ');

  // At least one word must not be a stop word
  const hasContent = words.some((w) => !STOP_WORDS.has(w) && w.length > 2);

  // Avoid phrases with too many stop words
  const stopWordCount = words.filter((w) => STOP_WORDS.has(w)).length;
  const stopWordRatio = stopWordCount / words.length;

  return hasContent && stopWordRatio < 0.7;
}

/**
 * Expand keywords with synonyms
 */
export function expandKeywords(keywords: string[]): Set<string> {
  const expanded = new Set<string>(keywords);

  for (const keyword of keywords) {
    const synonyms = SYNONYM_MAP[keyword];
    if (synonyms) {
      for (const synonym of synonyms) {
        expanded.add(synonym);
      }
    }
  }

  return expanded;
}

/**
 * Extract entities (companies, people, organizations)
 */
export function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const normalized = text.toLowerCase();

  // Entity patterns (capitalized words, known entities)
  const knownEntities = [
    'openai', 'anthropic', 'google', 'microsoft', 'apple', 'amazon', 'meta',
    'tesla', 'spacex', 'nvidia', 'bitcoin', 'ethereum', 'trump', 'biden',
    'congress', 'fed', 'senate', 'house', 'gpt', 'claude', 'gemini',
  ];

  for (const entity of knownEntities) {
    if (normalized.includes(entity)) {
      entities.push(entity);
    }
  }

  return entities;
}

/**
 * Calculate keyword match score between text and market
 */
export function calculateKeywordScore(
  textKeywords: Set<string>,
  marketQuestion: string,
  marketDescription?: string
): number {
  const marketText = (marketQuestion + ' ' + (marketDescription || '')).toLowerCase();
  const marketWords = new Set(extractKeywords(marketText));
  const marketPhrases = new Set(extractPhrases(marketText));

  let matches = 0;
  let totalWeight = 0;

  // Check keyword matches
  for (const keyword of textKeywords) {
    totalWeight += 1;
    if (marketWords.has(keyword)) {
      matches += 1;
    } else if (marketText.includes(keyword)) {
      matches += 0.8; // Partial match
    }
  }

  // Bonus for phrase matches
  const textPhrases = Array.from(textKeywords).filter((k) => k.includes(' '));
  for (const phrase of textPhrases) {
    if (marketPhrases.has(phrase) || marketText.includes(phrase)) {
      matches += 2; // Phrases are stronger signals
      totalWeight += 2;
    }
  }

  return totalWeight > 0 ? matches / totalWeight : 0;
}
