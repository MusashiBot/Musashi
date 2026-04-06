import type { Market, Signal, SignalBatch, SignalStrength } from '../types/index.js';
import {
  extractKeywords,
  extractPhrases,
  expandKeywords,
  extractEntities,
  calculateKeywordScore,
} from './keyword-extractor.js';
import { analyzeSentiment, calculateSentimentAlignment } from './sentiment-analyzer.js';
import { analyzeContext, calculateContextBonus, isLikelySpam } from './context-scorer.js';
import { getCategoryPriorityBoost, getEffectiveThreshold } from './category-priority.js';

/**
 * Signal generation configuration
 */
export interface SignalConfig {
  minConfidence: number;
  maxSignals: number;
  includeAllMatches: boolean;
}

const DEFAULT_CONFIG: SignalConfig = {
  minConfidence: 0.15,
  maxSignals: 10,
  includeAllMatches: false,
};

/**
 * Generate signals from text analysis
 */
export class SignalGenerator {
  private config: SignalConfig;

  constructor(config: Partial<SignalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze text and generate signals for matching markets
   */
  async analyzeText(text: string, markets: Market[]): Promise<SignalBatch> {
    const startTime = Date.now();

    // Pre-filter spam
    if (isLikelySpam(text)) {
      return {
        signals: [],
        totalMatches: 0,
        processingTimeMs: Date.now() - startTime,
        text,
      };
    }

    // Extract features from text
    const keywords = extractKeywords(text);
    const phrases = extractPhrases(text);
    const entities = extractEntities(text);
    const expandedKeywords = expandKeywords([...keywords, ...phrases, ...entities]);

    // Score each market
    const signalCandidates: Array<{
      market: Market;
      confidence: number;
      keywordScore: number;
      sentimentScore: number;
      contextScore: number;
    }> = [];

    for (const market of markets) {
      // Skip inactive markets
      if (market.status !== 'active') continue;

      // Calculate keyword match score
      const keywordScore = calculateKeywordScore(
        expandedKeywords,
        market.question,
        market.description
      );

      // Need minimum keyword match to proceed
      if (keywordScore < 0.1) continue;

      // Analyze sentiment
      const sentiment = analyzeSentiment(text);
      const sentimentScore = calculateSentimentAlignment(sentiment, market.yesPrice);

      // Analyze context
      const context = analyzeContext(text, market);
      const contextBonus = calculateContextBonus(context);

      // Calculate base confidence
      let confidence = keywordScore * 0.6 + sentimentScore * 0.4;

      // Apply context bonus (additive)
      confidence += contextBonus;

      // Apply category priority boost
      const categoryBoost = getCategoryPriorityBoost(market);
      confidence += categoryBoost;

      // Clamp confidence
      confidence = Math.max(0, Math.min(1, confidence));

      // Check against effective threshold
      const effectiveThreshold = getEffectiveThreshold(market, this.config.minConfidence);

      if (confidence >= effectiveThreshold || this.config.includeAllMatches) {
        signalCandidates.push({
          market,
          confidence,
          keywordScore,
          sentimentScore,
          contextScore: context.contextScore,
        });
      }
    }

    // Sort by confidence
    signalCandidates.sort((a, b) => b.confidence - a.confidence);

    // Take top N signals
    const topSignals = signalCandidates.slice(0, this.config.maxSignals);

    // Build Signal objects
    const signals: Signal[] = [];

    for (const candidate of topSignals) {
      const sentiment = analyzeSentiment(text);
      const context = analyzeContext(text, candidate.market);

      // Extract matched keywords and phrases
      const matchedKeywords = Array.from(expandedKeywords).filter((kw) =>
        candidate.market.question.toLowerCase().includes(kw) ||
        candidate.market.description?.toLowerCase().includes(kw)
      );

      const matchedPhrases = phrases.filter(
        (phrase) =>
          candidate.market.question.toLowerCase().includes(phrase) ||
          candidate.market.description?.toLowerCase().includes(phrase)
      );

      // Context factors that improved matching
      const contextFactors: string[] = [];
      if (context.hasPredictionLanguage) contextFactors.push('Prediction language detected');
      if (context.hasTimeframeReference) contextFactors.push('Timeframe reference found');
      if (context.hasQuantitativeData) contextFactors.push('Quantitative data present');
      if (context.hasOpinionLanguage) contextFactors.push('Opinion/forecast detected');

      // Category boost
      const categoryBoost = getCategoryPriorityBoost(candidate.market) > 0;

      const signal: Signal = {
        id: `signal_${Date.now()}_${candidate.market.id}`,
        marketId: candidate.market.id,
        market: candidate.market,
        confidence: candidate.confidence,
        strength: this.categorizeStrength(candidate.confidence),
        relevanceScore: candidate.keywordScore,
        sentiment,
        context,
        explanation: {
          matchedKeywords: matchedKeywords.slice(0, 10),
          matchedPhrases: matchedPhrases.slice(0, 5),
          contextFactors,
          categoryBoost,
        },
        sourceText: text,
        analyzedAt: new Date().toISOString(),
        processingTimeMs: 0, // Will be updated below
      };

      signals.push(signal);
    }

    const processingTimeMs = Date.now() - startTime;

    // Update processing time for each signal
    for (const signal of signals) {
      signal.processingTimeMs = processingTimeMs;
    }

    return {
      signals,
      totalMatches: signalCandidates.length,
      processingTimeMs,
      text,
    };
  }

  /**
   * Categorize signal strength
   */
  private categorizeStrength(confidence: number): SignalStrength {
    if (confidence >= 0.75) return 'very_strong';
    if (confidence >= 0.50) return 'strong';
    if (confidence >= 0.30) return 'moderate';
    return 'weak';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SignalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SignalConfig {
    return { ...this.config };
  }
}
