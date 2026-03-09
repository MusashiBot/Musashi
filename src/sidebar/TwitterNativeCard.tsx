import React, { useState, useEffect } from 'react';
import { Market } from '../types/market';
import { analyzeSentiment } from '../analysis/sentiment-analyzer';

interface TwitterNativeCardProps {
  market: Market;
  confidence: number;
  tweetText?: string;
  matchedKeywords?: string[];
}

const TwitterNativeCard: React.FC<TwitterNativeCardProps> = ({
  market,
  confidence,
  tweetText,
  matchedKeywords = [],
}) => {
  const [barWidth, setBarWidth] = useState(0); // starts at 0 for entry animation

  // Analyze sentiment from tweet text
  const sentiment = React.useMemo(() => {
    return tweetText ? analyzeSentiment(tweetText) : null;
  }, [tweetText]);

  // Entry animation: give the DOM one frame to render width:0, then transition to actual value
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(Math.round(market.yesPrice * 100)), 50);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent  = Math.round(market.noPrice  * 100);
  const isYesWinning = market.yesPrice >= 0.5;
  const dayChange = market.oneDayPriceChange ?? 0;

  // Format end date: "2026-03-31" → "Mar 31"
  const endDateLabel = React.useMemo(() => {
    if (!market.endDate) return null;
    try {
      const d = new Date(market.endDate + 'T00:00:00Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch { return null; }
  }, [market.endDate]);

  // Format 24h change: 0.052 → "+5.2%", -0.03 → "-3.0%"
  const changeLabel = React.useMemo(() => {
    if (!dayChange) return null;
    const pct = (dayChange * 100).toFixed(1);
    return dayChange > 0 ? `+${pct}%` : `${pct}%`;
  }, [dayChange]);

  // Format 24h volume: 42100 → "$42K", 1340000 → "$1.3M", 850 → "$850"
  const volumeLabel = React.useMemo(() => {
    const v = market.volume24h;
    if (!v || v <= 0) return null;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000)    return `$${Math.round(v / 1_000)}K`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
    return `$${Math.round(v)}`;
  }, [market.volume24h]);

  return (
    <a
      href={`${market.url}?ref=musashi`}
      target="_blank"
      rel="noopener noreferrer"
      className="twitter-native-card"
      onClick={(e) => {
        e.stopPropagation();
        console.log('[Musashi] User clicked market card:', market.title);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-normal">Prediction Market</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 font-normal">
            {market.platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
          </span>
          {sentiment && sentiment.confidence > 0 && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    sentiment.sentiment === 'bullish' ? '#10B981' :
                    sentiment.sentiment === 'bearish' ? '#EF4444' :
                    '#94A3B8',
                  opacity: 0.6 + (sentiment.confidence * 0.4)
                }}
                title={`Sentiment: ${sentiment.sentiment} (${Math.round(sentiment.confidence * 100)}%)`}
              />
            </>
          )}
        </div>
        <span className="text-xs text-gray-400">{Math.round(confidence * 100)}% match</span>
      </div>

      {/* Market Title */}
      <h3 className="text-sm font-normal text-gray-900 leading-snug mb-2">
        {market.title}
      </h3>


      {/* Odds Display */}
      <div className="flex items-center gap-4 mb-2">
        {/* YES */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-md">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Yes</span>
          <span className={`text-lg font-semibold ${isYesWinning ? 'text-green-600' : 'text-gray-700'}`}>
            {yesPercent}%
          </span>
          {isYesWinning && (
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200"></div>

        {/* NO */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-md">
          <span className="text-xs text-gray-500 uppercase tracking-wide">No</span>
          <span className={`text-lg font-semibold ${!isYesWinning ? 'text-red-600' : 'text-gray-700'}`}>
            {noPercent}%
          </span>
          {!isYesWinning && (
            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>

        {/* 24h change pill */}
        {changeLabel && (
          <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded ${
            dayChange > 0
              ? 'text-green-700 bg-green-50'
              : 'text-red-700 bg-red-50'
          }`}>
            {changeLabel}
          </span>
        )}
      </div>

      {/* Probability bar */}
      <div className="musashi-prob-bar">
        <div className="musashi-prob-bar-fill" style={{ width: `${barWidth}%` }} />
      </div>

      {/* Metadata footer: resolve date + 24h volume */}
      {(endDateLabel || volumeLabel) && (
        <div className="flex items-center gap-1.5 mt-2">
          {endDateLabel && (
            <span className="text-xs text-gray-400">Resolves {endDateLabel}</span>
          )}
          {endDateLabel && volumeLabel && (
            <span className="text-xs text-gray-300">·</span>
          )}
          {volumeLabel && (
            <span className="text-xs text-gray-400">{volumeLabel}</span>
          )}
        </div>
      )}
    </a>
  );
};

export default TwitterNativeCard;
