/**
 * Simple sentiment analyzer for tweets
 * Detects bullish/bearish/neutral sentiment based on keyword analysis
 */

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface SentimentResult {
  sentiment: Sentiment;
  confidence: number; // 0-1, how confident we are in this classification
}

// Bullish indicators
const BULLISH_KEYWORDS = [
  'bullish', 'moon', 'rally', 'pump', 'surge', 'soar', 'skyrocket',
  'buy', 'long', 'calls', 'green', 'win', 'winning', 'yes', 'definitely',
  'confirmed', 'happening', 'inevitable', 'obvious', 'clearly', 'certain',
  'guarantee', 'lock', 'easy', 'confident', 'predict', 'will happen',
  'going to', 'up', 'rise', 'increase', 'gain', 'profit', 'success',
  'boom', 'growth', 'explosive', 'parabolic', 'breakout'
];

// Bearish indicators
const BEARISH_KEYWORDS = [
  'bearish', 'dump', 'crash', 'plunge', 'tank', 'collapse', 'fall',
  'sell', 'short', 'puts', 'red', 'lose', 'losing', 'no', 'impossible',
  'unlikely', 'doubt', 'skeptical', 'concern', 'worried', 'fear', 'risk',
  'down', 'decline', 'drop', 'decrease', 'loss', 'fail', 'failure',
  'bubble', 'overvalued', 'recession', 'bear', 'correction'
];

// Strong modifiers (increase weight)
const STRONG_MODIFIERS = [
  'very', 'extremely', 'highly', 'absolutely', 'completely', 'totally',
  'definitely', 'certainly', 'obviously', 'clearly', 'strongly', 'really'
];

// Negations (reverse sentiment)
const NEGATIONS = [
  'not', 'no', "don't", "won't", "can't", "isn't", "aren't", "doesn't",
  'never', 'neither', 'nor', 'none', 'nobody', 'nothing', 'nowhere'
];

/**
 * Analyze tweet text and return sentiment
 * IMPROVED: Better negation detection, context windows, phrase matching
 */
export function analyzeSentiment(tweetText: string): SentimentResult {
  const text = tweetText.toLowerCase();
  const words = text.split(/\s+/);

  let bullishScore = 0;
  let bearishScore = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '');

    // IMPROVED: Check 2-word window for negations (not just previous word)
    const prevWord = i > 0 ? words[i - 1].replace(/[^a-z]/g, '') : '';
    const prevPrevWord = i > 1 ? words[i - 2].replace(/[^a-z]/g, '') : '';

    // Check for negation in 2-word window
    const isNegated = NEGATIONS.includes(prevWord) || NEGATIONS.includes(prevPrevWord);

    // Check for strong modifier
    const isStrong = STRONG_MODIFIERS.includes(prevWord);
    const weight = isStrong ? 2 : 1;

    // Check bullish
    if (BULLISH_KEYWORDS.includes(word)) {
      if (isNegated) {
        bearishScore += weight;
      } else {
        bullishScore += weight;
      }
    }

    // Check bearish
    if (BEARISH_KEYWORDS.includes(word)) {
      if (isNegated) {
        bullishScore += weight;
      } else {
        bearishScore += weight;
      }
    }
  }

  // IMPROVED: Check for phrase-level sentiment patterns
  const phraseAdjustment = analyzeSentimentPhrases(text);
  bullishScore += phraseAdjustment.bullish;
  bearishScore += phraseAdjustment.bearish;

  // Calculate total and determine sentiment
  const total = bullishScore + bearishScore;

  if (total === 0) {
    return { sentiment: 'neutral', confidence: 0 };
  }

  const bullishRatio = bullishScore / total;
  const bearishRatio = bearishScore / total;

  // Need strong signal to classify (>60%)
  if (bullishRatio > 0.6) {
    return { sentiment: 'bullish', confidence: bullishRatio };
  }

  if (bearishRatio > 0.6) {
    return { sentiment: 'bearish', confidence: bearishRatio };
  }

  // Mixed or weak signal
  return { sentiment: 'neutral', confidence: 1 - Math.abs(bullishRatio - bearishRatio) };
}

/**
 * IMPROVED: Detect sentiment from multi-word phrases
 * Catches patterns like "not going to happen", "this will definitely", etc.
 */
function analyzeSentimentPhrases(text: string): { bullish: number; bearish: number } {
  let bullish = 0;
  let bearish = 0;

  // Strong bullish phrases
  const strongBullishPhrases = [
    'this will happen', 'going to happen', 'will definitely', 'no doubt',
    'calling it now', 'mark my words', 'all in', 'to the moon',
    'this is happening', 'it\'s happening', 'let\'s go', 'lfg',
  ];

  // Strong bearish phrases
  const strongBearishPhrases = [
    'not going to happen', 'won\'t happen', 'no way', 'never happening',
    'this won\'t', 'not a chance', 'impossible', 'ain\'t happening',
    'will never', 'zero chance', 'no shot',
  ];

  // Uncertainty phrases (reduce both)
  const uncertaintyPhrases = [
    'who knows', 'maybe', 'possibly', 'hard to say', 'unclear',
    'not sure', 'uncertain', 'could go either way',
  ];

  for (const phrase of strongBullishPhrases) {
    if (text.includes(phrase)) {
      bullish += 1.5;
    }
  }

  for (const phrase of strongBearishPhrases) {
    if (text.includes(phrase)) {
      bearish += 1.5;
    }
  }

  // Uncertainty reduces confidence in both directions
  for (const phrase of uncertaintyPhrases) {
    if (text.includes(phrase)) {
      bullish -= 0.5;
      bearish -= 0.5;
    }
  }

  return { bullish: Math.max(0, bullish), bearish: Math.max(0, bearish) };
}
