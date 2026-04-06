import type { ContextAnalysis, Market } from '../types/index.js';

/**
 * Prediction language indicators
 */
const PREDICTION_TERMS = [
  'will', 'going to', 'predict', 'forecast', 'expect', 'anticipate',
  'likely', 'probably', 'should', 'would', 'could', 'might', 'may',
  'estimate', 'projection', 'odds', 'chance', 'probability',
];

/**
 * Timeframe references
 */
const TIMEFRAME_TERMS = [
  'tomorrow', 'next week', 'next month', 'next year', 'by', 'before',
  '2024', '2025', '2026', 'soon', 'eventually', 'future', 'upcoming',
  'this week', 'this month', 'this year', 'end of', 'q1', 'q2', 'q3', 'q4',
];

/**
 * Opinion indicators
 */
const OPINION_TERMS = [
  'i think', 'imo', 'imho', 'my prediction', 'my take', 'calling it',
  'i believe', 'i expect', 'personally', 'in my view', 'my opinion',
];

/**
 * News indicators (not predictions)
 */
const NEWS_TERMS = [
  'breaking', 'just announced', 'confirmed', 'official', 'released',
  'reported', 'according to', 'sources say', 'just in', 'update',
];

/**
 * Casual mention filters
 */
const CASUAL_FILTERS = [
  'btw', 'lol', 'lmao', 'tbh', 'fyi', 'fwiw', 'iirc',
];

/**
 * Analyze context of text to determine if it's ABOUT a market
 */
export function analyzeContext(text: string, market: Market): ContextAnalysis {
  const lower = text.toLowerCase();

  // Extract context signals
  const hasPredictionLanguage = PREDICTION_TERMS.some((term) => lower.includes(term));
  const hasTimeframeReference = TIMEFRAME_TERMS.some((term) => lower.includes(term));
  const hasOpinionLanguage = OPINION_TERMS.some((term) => lower.includes(term));
  const hasNewsIndicators = NEWS_TERMS.some((term) => lower.includes(term));
  const isQuestion = text.includes('?');

  // Check for quantitative data
  const hasQuantitativeData =
    /\d+%/.test(text) || // Percentages
    /\$\d+[KMB]?/.test(text) || // Dollar amounts
    /\d+x/.test(text) || // Multipliers
    /\d+\s*(bps|basis points)/.test(text); // Basis points

  // Check if outcome is mentioned
  const mentionsOutcome = /\b(yes|no|true|false)\b/i.test(text);

  // Check for casual mentions (should reduce score)
  const hasCasualMention = CASUAL_FILTERS.some((filter) => lower.includes(filter));

  // Check if market question appears in text
  const marketKeywords = extractMarketKeywords(market.question);
  const textWords = new Set(lower.split(/\s+/));
  const keywordMatches = marketKeywords.filter((kw) => textWords.has(kw)).length;
  const keywordMatchRatio = keywordMatches / Math.max(marketKeywords.length, 1);

  // Calculate context score
  let score = 0.5; // Baseline

  // Positive signals
  if (hasPredictionLanguage) score += 0.15;
  if (hasTimeframeReference) score += 0.10;
  if (hasQuantitativeData) score += 0.15;
  if (hasOpinionLanguage) score += 0.10;
  if (mentionsOutcome) score += 0.10;
  if (isQuestion) score += 0.05;

  // Keyword match bonus
  score += keywordMatchRatio * 0.20;

  // Negative signals
  if (hasCasualMention) score -= 0.15;
  if (hasNewsIndicators && !hasPredictionLanguage) score -= 0.10; // News without prediction

  // Check for parenthetical mentions (usually casual)
  if (/\([^)]*market_keyword[^)]*\)/i.test(text)) {
    score -= 0.10;
  }

  // Tweet length impact (very short tweets are less likely to be predictive)
  const tweetLength = text.length;
  if (tweetLength < 50) {
    score -= 0.10;
  } else if (tweetLength > 150) {
    score += 0.05;
  }

  // Clamp score between 0 and 1
  score = Math.max(0, Math.min(1, score));

  return {
    hasPredictionLanguage,
    hasTimeframeReference,
    hasQuantitativeData,
    hasOpinionLanguage,
    hasNewsIndicators,
    mentionsOutcome,
    isQuestion,
    contextScore: score,
  };
}

/**
 * Extract important keywords from market question
 */
function extractMarketKeywords(question: string): string[] {
  const stopWords = new Set([
    'will', 'be', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for',
    'of', 'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were',
  ]);

  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words;
}

/**
 * Calculate context bonus for final confidence score
 */
export function calculateContextBonus(context: ContextAnalysis): number {
  // Context score of 0.5 = neutral (no bonus/penalty)
  // > 0.5 = positive bonus
  // < 0.5 = negative penalty
  return (context.contextScore - 0.5) * 0.15; // Max ±0.075
}

/**
 * Check if text is likely spam or low quality
 */
export function isLikelySpam(text: string): boolean {
  const lower = text.toLowerCase();

  // Spam indicators
  const spamPhrases = [
    'follow me', 'check out my', 'click here', 'link in bio',
    'dm me', 'join my', 'subscribe to', 'buy now', 'limited offer',
  ];

  for (const phrase of spamPhrases) {
    if (lower.includes(phrase)) return true;
  }

  // All caps (very short tweets can be caps)
  if (text.length > 30 && text === text.toUpperCase()) {
    return true;
  }

  // Excessive emojis
  const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > text.length * 0.3) {
    return true;
  }

  return false;
}
