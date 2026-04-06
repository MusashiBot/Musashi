import type { SentimentAnalysis, SentimentDirection } from '../types/index.js';

/**
 * Bullish sentiment keywords
 */
const BULLISH_TERMS = new Set([
  'bullish', 'buy', 'long', 'moon', 'pump', 'rally', 'surge', 'rise',
  'increase', 'growth', 'gain', 'up', 'higher', 'boost', 'soar',
  'breakthrough', 'success', 'win', 'winning', 'optimistic', 'positive',
  'bright', 'promising', 'strong', 'strength', 'confidence', 'likely',
]);

/**
 * Bearish sentiment keywords
 */
const BEARISH_TERMS = new Set([
  'bearish', 'sell', 'short', 'dump', 'crash', 'fall', 'drop',
  'decline', 'decrease', 'loss', 'down', 'lower', 'plunge', 'collapse',
  'failure', 'lose', 'losing', 'pessimistic', 'negative', 'weak',
  'weakness', 'doubt', 'uncertain', 'unlikely', 'risk', 'concern',
]);

/**
 * Negation words (reverse sentiment)
 */
const NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'none', 'nobody', 'nothing',
  'nowhere', 'hardly', 'barely', 'scarcely', "don't", "doesn't", "didn't",
  "won't", "wouldn't", "can't", "couldn't", "shouldn't",
]);

/**
 * Intensifier words (amplify sentiment)
 */
const INTENSIFIERS = new Set([
  'very', 'extremely', 'highly', 'really', 'absolutely', 'totally',
  'completely', 'utterly', 'definitely', 'certainly', 'surely',
]);

/**
 * Analyze sentiment of text relative to a market
 */
export function analyzeSentiment(text: string): SentimentAnalysis {
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/);

  let bullishScore = 0;
  let bearishScore = 0;
  const keyPhrases: string[] = [];

  // Analyze each word with context
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!.replace(/[^a-z]/g, '');
    const prevWord = i > 0 ? words[i - 1]!.replace(/[^a-z]/g, '') : '';
    const prevPrevWord = i > 1 ? words[i - 2]!.replace(/[^a-z]/g, '') : '';

    // Check for negations in 2-word window
    const isNegated = NEGATIONS.has(prevWord) || NEGATIONS.has(prevPrevWord);

    // Check for intensifiers
    const isIntensified = INTENSIFIERS.has(prevWord);
    const multiplier = isIntensified ? 1.5 : 1.0;

    // Score bullish terms
    if (BULLISH_TERMS.has(word)) {
      const score = multiplier * 1.0;
      if (isNegated) {
        bearishScore += score; // Negated bullish = bearish
        keyPhrases.push(`NOT ${word}`);
      } else {
        bullishScore += score;
        keyPhrases.push(word);
      }
    }

    // Score bearish terms
    if (BEARISH_TERMS.has(word)) {
      const score = multiplier * 1.0;
      if (isNegated) {
        bullishScore += score; // Negated bearish = bullish
        keyPhrases.push(`NOT ${word}`);
      } else {
        bearishScore += score;
        keyPhrases.push(word);
      }
    }
  }

  // Phrase-level analysis
  const phraseAdjustment = analyzeSentimentPhrases(text);
  bullishScore += phraseAdjustment.bullish;
  bearishScore += phraseAdjustment.bearish;
  keyPhrases.push(...phraseAdjustment.phrases);

  // Normalize scores
  const total = bullishScore + bearishScore;
  if (total === 0) {
    return {
      direction: 'neutral',
      bullishScore: 0,
      bearishScore: 0,
      confidence: 0,
      keyPhrases: [],
    };
  }

  const normalizedBullish = bullishScore / total;
  const normalizedBearish = bearishScore / total;

  // Determine direction
  let direction: SentimentDirection = 'neutral';
  if (normalizedBullish > 0.6) {
    direction = 'bullish';
  } else if (normalizedBearish > 0.6) {
    direction = 'bearish';
  } else if (Math.abs(normalizedBullish - normalizedBearish) < 0.2) {
    direction = 'mixed';
  }

  // Calculate confidence
  const confidence = Math.min(total / 5, 1); // More signals = higher confidence

  return {
    direction,
    bullishScore: normalizedBullish,
    bearishScore: normalizedBearish,
    confidence,
    keyPhrases: keyPhrases.slice(0, 5), // Top 5 phrases
  };
}

/**
 * Analyze sentiment from multi-word phrases
 */
function analyzeSentimentPhrases(text: string): {
  bullish: number;
  bearish: number;
  phrases: string[];
} {
  const lower = text.toLowerCase();
  const phrases: string[] = [];
  let bullish = 0;
  let bearish = 0;

  // Bullish phrases
  const bullishPhrases = [
    'going up', 'price increase', 'will rise', 'expect growth',
    'bullish on', 'buying opportunity', 'strong momentum',
    'to the moon', 'all time high', 'new high', 'breaking out',
  ];

  for (const phrase of bullishPhrases) {
    if (lower.includes(phrase)) {
      bullish += 1.5;
      phrases.push(phrase);
    }
  }

  // Bearish phrases
  const bearishPhrases = [
    'going down', 'price decrease', 'will fall', 'expect decline',
    'bearish on', 'selling pressure', 'weak momentum',
    'losing value', 'all time low', 'new low', 'breaking down',
  ];

  for (const phrase of bearishPhrases) {
    if (lower.includes(phrase)) {
      bearish += 1.5;
      phrases.push(phrase);
    }
  }

  return { bullish, bearish, phrases };
}

/**
 * Calculate sentiment alignment between text and market direction
 */
export function calculateSentimentAlignment(
  textSentiment: SentimentAnalysis,
  marketYesPrice: number
): number {
  // If market is priced high (YES is likely), bullish sentiment aligns
  // If market is priced low (NO is likely), bearish sentiment aligns

  const marketBullish = marketYesPrice > 0.5;

  if (textSentiment.direction === 'neutral') {
    return 0.5; // Neutral alignment
  }

  if (textSentiment.direction === 'mixed') {
    return 0.6; // Slight positive for mixed sentiment
  }

  // Check alignment
  if (
    (textSentiment.direction === 'bullish' && marketBullish) ||
    (textSentiment.direction === 'bearish' && !marketBullish)
  ) {
    return 0.8 + textSentiment.confidence * 0.2; // Strong alignment
  }

  // Misalignment (could indicate arbitrage)
  return 0.3 - textSentiment.confidence * 0.1;
}
