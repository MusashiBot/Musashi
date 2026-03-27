import { z } from 'zod';
import { MarketSchema } from './market.js';

/**
 * Signal strength levels
 */
export const SignalStrengthSchema = z.enum(['weak', 'moderate', 'strong', 'very_strong']);
export type SignalStrength = z.infer<typeof SignalStrengthSchema>;

/**
 * Sentiment direction for a market
 */
export const SentimentDirectionSchema = z.enum(['bullish', 'bearish', 'neutral', 'mixed']);
export type SentimentDirection = z.infer<typeof SentimentDirectionSchema>;

/**
 * Context analysis for text-market matching
 */
export const ContextAnalysisSchema = z.object({
  hasPredictionLanguage: z.boolean().describe('Contains prediction terms (will, expect, forecast)'),
  hasTimeframeReference: z.boolean().describe('Mentions timeframes (tomorrow, 2025, next week)'),
  hasQuantitativeData: z.boolean().describe('Contains numbers/percentages'),
  hasOpinionLanguage: z.boolean().describe('Contains opinion markers (I think, IMO)'),
  hasNewsIndicators: z.boolean().describe('Breaking news, announcements'),
  mentionsOutcome: z.boolean().describe('Explicitly mentions yes/no outcomes'),
  isQuestion: z.boolean().describe('Text is phrased as a question'),
  contextScore: z.number().min(0).max(1).describe('Overall context relevance score (0-1)'),
});

export type ContextAnalysis = z.infer<typeof ContextAnalysisSchema>;

/**
 * Sentiment analysis result
 */
export const SentimentAnalysisSchema = z.object({
  direction: SentimentDirectionSchema.describe('Overall sentiment direction'),
  bullishScore: z.number().min(0).max(1).describe('Bullish sentiment strength (0-1)'),
  bearishScore: z.number().min(0).max(1).describe('Bearish sentiment strength (0-1)'),
  confidence: z.number().min(0).max(1).describe('Confidence in sentiment analysis (0-1)'),
  keyPhrases: z.array(z.string()).describe('Key phrases driving sentiment'),
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

/**
 * Match explanation - why a market was matched to text
 */
export const MatchExplanationSchema = z.object({
  matchedKeywords: z.array(z.string()).describe('Keywords that triggered the match'),
  matchedPhrases: z.array(z.string()).describe('Multi-word phrases that matched'),
  contextFactors: z.array(z.string()).describe('Context signals that improved matching'),
  categoryBoost: z.boolean().describe('Whether category priority boosting applied'),
});

export type MatchExplanation = z.infer<typeof MatchExplanationSchema>;

/**
 * Core Signal - represents AI analysis of text → market relevance
 */
export const SignalSchema = z.object({
  // Identifiers
  id: z.string().describe('Unique signal identifier'),
  marketId: z.string().describe('ID of the matched market'),
  market: MarketSchema.describe('Full market details'),

  // Signal Metrics
  confidence: z.number().min(0).max(1).describe('Match confidence score (0-1)'),
  strength: SignalStrengthSchema.describe('Categorized signal strength'),
  relevanceScore: z.number().min(0).max(1).describe('How relevant the market is to the text (0-1)'),

  // Analysis Components
  sentiment: SentimentAnalysisSchema.describe('Sentiment analysis of the text'),
  context: ContextAnalysisSchema.describe('Context understanding'),
  explanation: MatchExplanationSchema.describe('Why this market was matched'),

  // Metadata
  sourceText: z.string().describe('Original text that was analyzed'),
  analyzedAt: z.string().datetime().describe('Analysis timestamp (ISO 8601)'),
  processingTimeMs: z.number().min(0).describe('Analysis processing time in milliseconds'),
});

export type Signal = z.infer<typeof SignalSchema>;

/**
 * Batch signal analysis result
 */
export const SignalBatchSchema = z.object({
  signals: z.array(SignalSchema).describe('Array of generated signals'),
  totalMatches: z.number().int().min(0).describe('Total markets matched'),
  processingTimeMs: z.number().min(0).describe('Total processing time in milliseconds'),
  text: z.string().describe('Original text analyzed'),
});

export type SignalBatch = z.infer<typeof SignalBatchSchema>;

/**
 * Probability grounding result - compares user estimate to market consensus
 */
export const ProbabilityGroundingSchema = z.object({
  userEstimate: z.number().min(0).max(1).describe('User provided probability (0-1)'),
  marketConsensus: z.number().min(0).max(1).describe('Market probability (0-1)'),
  difference: z.number().describe('Difference (userEstimate - marketConsensus)'),
  interpretation: z.string().describe('Human-readable interpretation of the difference'),
  calibrationAdvice: z.string().describe('Advice for improving probability estimation'),
  marketLiquidity: z.number().min(0).describe('Market liquidity (higher = more reliable)'),
  sampleSize: z.number().int().min(1).describe('Number of markets used for consensus'),
});

export type ProbabilityGrounding = z.infer<typeof ProbabilityGroundingSchema>;

/**
 * Historical calibration data for probability grounding
 */
export const CalibrationDataSchema = z.object({
  buckets: z.array(z.object({
    predictedProbability: z.number().min(0).max(1).describe('Predicted probability range (e.g., 0.70-0.80)'),
    actualFrequency: z.number().min(0).max(1).describe('How often events actually occurred'),
    sampleSize: z.number().int().min(0).describe('Number of predictions in this bucket'),
    brier: z.number().min(0).describe('Brier score for this bucket'),
  })).describe('Calibration buckets'),
  overallBrier: z.number().min(0).describe('Overall Brier score (lower is better)'),
  perfectCalibration: z.boolean().describe('Whether the probabilities are well-calibrated'),
});

export type CalibrationData = z.infer<typeof CalibrationDataSchema>;

/**
 * Signal stream event types
 */
export const SignalEventTypeSchema = z.enum(['new_signal', 'market_update', 'heartbeat']);
export type SignalEventType = z.infer<typeof SignalEventTypeSchema>;

/**
 * Signal stream event - for SSE streaming
 */
export const SignalEventSchema = z.object({
  type: SignalEventTypeSchema.describe('Event type'),
  signal: SignalSchema.optional().describe('Signal data (for new_signal events)'),
  marketId: z.string().optional().describe('Market ID (for market_update events)'),
  timestamp: z.string().datetime().describe('Event timestamp (ISO 8601)'),
});

export type SignalEvent = z.infer<typeof SignalEventSchema>;
