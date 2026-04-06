// Dynamic Phrase Detector
// Detects important phrases in tweets beyond static SYNONYM_MAP
// Uses frequency and collocation analysis

/**
 * Extract meaningful phrases from text using collocation detection
 * Returns array of 2-4 word phrases that appear to be semantically meaningful
 */
export function extractMeaningfulPhrases(text: string): string[] {
  const phrases = new Set<string>();

  // Normalize text
  const normalized = text.toLowerCase()
    .replace(/[^a-z0-9\s'&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length < 2) return [];

  // Extract bigrams that look meaningful
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;

    if (isMeaningfulPhrase(bigram)) {
      phrases.add(bigram);
    }
  }

  // Extract trigrams that look meaningful
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;

    if (isMeaningfulPhrase(trigram)) {
      phrases.add(trigram);
    }
  }

  // Extract 4-grams for very specific phrases
  for (let i = 0; i < words.length - 3; i++) {
    const fourgram = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;

    if (isMeaningfulPhrase(fourgram)) {
      phrases.add(fourgram);
    }
  }

  return Array.from(phrases);
}

/**
 * Determines if a phrase is semantically meaningful
 * Uses pattern matching and linguistic heuristics
 */
function isMeaningfulPhrase(phrase: string): boolean {
  const words = phrase.split(' ');

  // Skip if contains only stop words
  const allStopWords = words.every(w => PHRASE_STOP_WORDS.has(w));
  if (allStopWords) return false;

  // Skip if any word is too short (except common abbreviations)
  const hasTooShortWord = words.some(w => w.length < 2 && !COMMON_ABBREVIATIONS.has(w));
  if (hasTooShortWord) return false;

  // Good patterns for meaningful phrases
  const goodPatterns = [
    // Verb + noun/adjective patterns
    /\b(will|going to|announced|launches|releases|introduces|wins|loses|reaches|hits|breaks|surpass)\s+\w+/,

    // Name patterns (capitalized words)
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+/,

    // Technical/specific terms
    /\b(interest rate|exchange rate|market cap|price target|earnings|revenue|profit|loss)\b/,

    // Action phrases
    /\b(set to|expected to|likely to|plans to|aims to|moves to|agrees to|fails to)\b/,

    // Outcome phrases
    /\b(if|when|before|after|until|unless|once|as soon as)\s+\w+/,

    // Comparison phrases
    /\b(more than|less than|higher than|lower than|better than|worse than)\b/,

    // Time-bound phrases
    /\b(by|before|after|in|within)\s+(january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|end|start|mid)\b/,
  ];

  const matchesGoodPattern = goodPatterns.some(pattern => pattern.test(phrase));
  if (matchesGoodPattern) return true;

  // Phrases with specific domain keywords are likely meaningful
  const domainKeywords = new Set([
    'bitcoin', 'ethereum', 'crypto', 'stock', 'market', 'election', 'president',
    'champion', 'winner', 'release', 'launch', 'announce', 'confirm', 'deny',
    'surge', 'crash', 'rally', 'decline', 'increase', 'decrease',
    'rate', 'inflation', 'gdp', 'unemployment', 'forecast', 'predict',
  ]);

  const hasDomainKeyword = words.some(w => domainKeywords.has(w));
  if (hasDomainKeyword && words.length >= 2) return true;

  // Default: if phrase is 3+ words and not all stop words, likely meaningful
  return words.length >= 3;
}

// Stop words that don't contribute to phrase meaning
const PHRASE_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'would',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how',
]);

// Common abbreviations that are meaningful despite being short
const COMMON_ABBREVIATIONS = new Set([
  'ai', 'ml', 'us', 'uk', 'eu', 'un', 'ceo', 'cfo', 'cto',
  'q1', 'q2', 'q3', 'q4', 'btc', 'eth', 'nft', 'dao',
]);

/**
 * Score phrase importance based on composition
 * Higher score = more specific/meaningful phrase
 */
export function scorePhraseImportance(phrase: string): number {
  let score = 0;

  // Longer phrases (3-4 words) are more specific
  const wordCount = phrase.split(' ').length;
  if (wordCount === 3) score += 0.3;
  if (wordCount === 4) score += 0.4;

  // Contains proper nouns (capitalized words)
  if (/[A-Z][a-z]+/.test(phrase)) score += 0.2;

  // Contains numbers/quantities
  if (/\d+/.test(phrase)) score += 0.15;

  // Contains technical/domain terms
  const technicalTerms = [
    'rate', 'price', 'market', 'election', 'champion', 'winner',
    'release', 'announce', 'launch', 'confirm', 'forecast',
  ];
  const hasTechnicalTerm = technicalTerms.some(term => phrase.includes(term));
  if (hasTechnicalTerm) score += 0.25;

  return Math.min(1.0, score);
}
