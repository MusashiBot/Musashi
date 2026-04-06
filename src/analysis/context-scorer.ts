// Context Scorer - Determines if a tweet is ABOUT a market vs just mentioning keywords
// Improves matching quality by understanding context and relevance

import { Market } from '../types/market';

interface ContextSignals {
  hasQuestionMark: boolean;
  hasPredictionLanguage: boolean;
  hasTimeframeReference: boolean;
  hasQuantitativeData: boolean;
  hasOpinionLanguage: boolean;
  hasNewsIndicators: boolean;
  mentionsOutcome: boolean;
  tweetLength: number;
}

/**
 * Analyzes tweet context to determine if it's discussing/predicting something
 * vs just casually mentioning keywords
 */
export function analyzeContext(tweetText: string, market: Market): number {
  const signals = extractContextSignals(tweetText, market);
  return computeContextScore(signals);
}

/**
 * Extract context signals from tweet
 */
function extractContextSignals(text: string, market: Market): ContextSignals {
  const lower = text.toLowerCase();

  // Prediction/speculation language
  const predictionTerms = [
    'will', 'going to', 'predict', 'forecast', 'expect', 'think',
    'believe', 'likely', 'probably', 'chance', 'odds', 'bet',
    'if', 'when', 'could', 'might', 'may', 'should', 'would',
  ];

  // Time references (indicates forward-looking statement)
  const timeframeTerms = [
    'tomorrow', 'next week', 'next month', 'this year', 'by',
    '2024', '2025', '2026', '2027', 'soon', 'eventually',
    'before', 'after', 'until', 'q1', 'q2', 'q3', 'q4',
  ];

  // Opinion/analysis language
  const opinionTerms = [
    'i think', 'imo', 'in my opinion', 'i believe', 'my take',
    'hot take', 'my prediction', 'calling it', 'mark my words',
  ];

  // News/announcement indicators
  const newsTerms = [
    'breaking', 'just announced', 'just in', 'confirmed', 'official',
    'reports', 'according to', 'source', 'leaked', 'revealed',
    'announced', 'announces', 'statement', 'press release',
  ];

  // Quantitative data (numbers, percentages, dates)
  const hasQuantitativeData =
    /\d+%/.test(text) ||              // Percentages: 50%
    /\$\d+[KMB]?/.test(text) ||       // Prices: $100K
    /\d{1,2}\/\d{1,2}/.test(text) ||  // Dates: 3/15
    /\b\d+\s*(points?|basis points?|bps)\b/i.test(text); // Points: 25 bps

  // Check if tweet mentions YES/NO outcomes explicitly
  const mentionsOutcome =
    /\b(yes|no)\b/i.test(text) ||
    lower.includes('will happen') ||
    lower.includes('won\'t happen') ||
    lower.includes('will not');

  return {
    hasQuestionMark: text.includes('?'),
    hasPredictionLanguage: predictionTerms.some(term => lower.includes(term)),
    hasTimeframeReference: timeframeTerms.some(term => lower.includes(term)),
    hasQuantitativeData,
    hasOpinionLanguage: opinionTerms.some(term => lower.includes(term)),
    hasNewsIndicators: newsTerms.some(term => lower.includes(term)),
    mentionsOutcome,
    tweetLength: text.length,
  };
}

/**
 * Compute context relevance score (0-1)
 * Higher score = more likely tweet is actually ABOUT/DISCUSSING the market
 */
function computeContextScore(signals: ContextSignals): number {
  let score = 0.5; // Baseline

  // Strong signals (add confidence)
  if (signals.hasPredictionLanguage) score += 0.15;
  if (signals.hasTimeframeReference) score += 0.12;
  if (signals.hasQuantitativeData) score += 0.10;
  if (signals.hasOpinionLanguage) score += 0.08;
  if (signals.hasNewsIndicators) score += 0.10;
  if (signals.mentionsOutcome) score += 0.12;
  if (signals.hasQuestionMark) score += 0.05; // Questions often discuss topics

  // Tweet length signal
  // Very short tweets (<50 chars) are often low quality or just reactions
  // Very long tweets (>250 chars) often have more context/analysis
  if (signals.tweetLength < 50) {
    score -= 0.10;
  } else if (signals.tweetLength > 250) {
    score += 0.08;
  }

  // Cap between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Detect if tweet is just a casual mention vs substantive discussion
 * Returns true if tweet seems like a casual/passing reference
 */
export function isCasualMention(tweetText: string, matchedKeywords: string[]): boolean {
  const lower = tweetText.toLowerCase();

  // Casual phrases that indicate passing mention
  const casualPhrases = [
    'btw', 'by the way', 'also', 'speaking of', 'reminds me',
    'lol', 'lmao', 'haha', 'lmfao', 'rofl',
    'just saying', 'fyi', 'fun fact', 'random thought',
  ];

  const hasCasualPhrase = casualPhrases.some(phrase => lower.includes(phrase));

  // If only 1 keyword matched and tweet has casual language, likely not relevant
  if (matchedKeywords.length === 1 && hasCasualPhrase) {
    return true;
  }

  // Check if keywords appear in parenthetical remarks or asides
  // Example: "Great game today (unlike Bitcoin lol)"
  const parentheticalPattern = /\([^)]*\)/g;
  const parentheticals = tweetText.match(parentheticalPattern) || [];

  for (const paren of parentheticals) {
    const parenLower = paren.toLowerCase();
    // If majority of matched keywords only appear in parentheticals, likely casual
    const keywordsInParen = matchedKeywords.filter(kw =>
      parenLower.includes(kw.toLowerCase())
    );

    if (keywordsInParen.length / matchedKeywords.length > 0.6) {
      return true;
    }
  }

  return false;
}
