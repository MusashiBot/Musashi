// Musashi Content Script
// Detects tweets on Twitter/X and overlays matching Polymarket prediction markets.
// Market data is fetched by the background service worker (bypasses CORS).

import { TwitterExtractor, Tweet } from './twitter-extractor';
import { KeywordMatcher } from '../analysis/keyword-matcher';
import { musashiApi } from '../api/musashi-api-client';
import { MarketMatch, Market } from '../types/market';
import { injectTwitterCard, hasTwitterCard, detectTwitterTheme, applyThemeToAllCards } from './inject-twitter-card';
import '../sidebar/sidebar.css';

console.log('[Musashi] Content script loaded');

// ── Performance Optimization: Tweet text cache to avoid re-analyzing ──────────
interface CachedAnalysis {
  matches: MarketMatch[];
  timestamp: number;
}

const analyzedTweetCache = new Map<string, CachedAnalysis>();
const CACHE_MAX_SIZE = 100; // Keep last 100 analyzed tweets
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedAnalysis(text: string): MarketMatch[] | null {
  const cached = analyzedTweetCache.get(text);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    analyzedTweetCache.delete(text);
    return null;
  }

  return cached.matches;
}

function setCachedAnalysis(text: string, matches: MarketMatch[]): void {
  // Simple LRU: if cache is full, remove oldest entry
  if (analyzedTweetCache.size >= CACHE_MAX_SIZE) {
    const firstKey = analyzedTweetCache.keys().next().value;
    if (firstKey !== undefined) {
      analyzedTweetCache.delete(firstKey);
    }
  }

  analyzedTweetCache.set(text, {
    matches,
    timestamp: Date.now()
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const isTwitter =
  window.location.hostname === 'twitter.com' ||
  window.location.hostname === 'x.com';

if (!isTwitter) {
  console.log('[Musashi] Not on Twitter/X, exiting');
} else {
  console.log('[Musashi] Running on Twitter/X');

  const extractor = new TwitterExtractor();
  let allMatches: MarketMatch[] = [];
  let isTabVisible = !document.hidden;

  // Performance optimization: Pause processing when tab is not visible
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) {
      console.log('[Musashi] Tab visible - resuming processing');
    } else {
      console.log('[Musashi] Tab hidden - pausing processing to save CPU');
    }
  });

  // Watch for Twitter theme changes (user toggling Dim / Lights Out / Default mid-session)
  let lastTheme = detectTwitterTheme();
  const themeObserver = new MutationObserver(() => {
    const theme = detectTwitterTheme();
    if (theme !== lastTheme) {
      lastTheme = theme;
      applyThemeToAllCards(theme);
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  themeObserver.observe(document.body,            { attributes: true, attributeFilter: ['class', 'style'] });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMusashi);
  } else {
    initializeMusashi();
  }

  async function initializeMusashi() {
    console.log('[Musashi] Initializing Musashi...');

    // Try API first - if it fails, fall back to local matching
    let useLocalMatcher = false;
    let localMatcher: KeywordMatcher | null = null;

    // Test API connection
    try {
      console.log('[Musashi] Testing API connection...');
      const testMatches = await musashiApi.analyzeText('test', { maxResults: 1 });
      console.log('[Musashi] ✓ API connected successfully');
    } catch (error) {
      console.warn('[Musashi] API unavailable, falling back to local matching:', error);
      useLocalMatcher = true;

      // Load markets for local matcher
      const markets = await loadMarketsFromServiceWorker();
      if (markets.length === 0) {
        console.warn('[Musashi] No markets available for local matching. Exiting.');
        return;
      }
      localMatcher = new KeywordMatcher(markets, 0.25, 5);
      console.log(`[Musashi] Local matcher initialized with ${markets.length} markets`);
    }

    console.log('[Musashi] Starting tweet scanner...');

    setTimeout(() => {
      extractor.start(async (tweets: Tweet[]) => {
        // Skip processing if tab is not visible to save CPU
        if (!isTabVisible) {
          console.log(`[Musashi] Tab hidden - skipping ${tweets.length} tweets`);
          return;
        }

        console.log(`[Musashi] Scanned ${tweets.length} tweet(s)`);
        let injected = 0;

        for (const tweet of tweets) {
          // Always check if card exists, even for "processed" tweets
          // This handles Twitter re-rendering the DOM when expanding tweets
          if (hasTwitterCard(tweet.element)) {
            continue; // Card already exists, skip
          }

          // Check cache first to avoid re-analyzing same tweet
          let matches: MarketMatch[] | null = getCachedAnalysis(tweet.text);

          if (matches === null) {
            // Cache miss - analyze the tweet
            if (useLocalMatcher && localMatcher) {
              matches = localMatcher.match(tweet.text);
            } else {
              matches = await musashiApi.analyzeText(tweet.text, {
                minConfidence: 0.25,
                maxResults: 5,
              });
            }
            // Store in cache
            setCachedAnalysis(tweet.text, matches);
          } else {
            // Cache hit - saved an API call / computation
            console.log('[Musashi] Cache hit - reusing analysis');
          }

          if (matches.length > 0) {
            const best = matches[0];
            const source = useLocalMatcher ? 'LOCAL' : 'API';
            console.log(
              `[Musashi ${source}] MATCH ${(best.confidence * 100).toFixed(0)}% — "${best.market.title}"` +
              (matches.length > 1 ? ` (+${matches.length - 1} secondary)` : '')
            );
            injectTwitterCard(tweet.element, best, tweet.text, matches.slice(1, 3));
            injected++;
            allMatches.push(...matches);
          }
        }

        if (injected > 0) console.log(`[Musashi] Injected ${injected} card(s)`);

        const unique = new Map<string, MarketMatch>();
        allMatches.forEach(m => {
          const ex = unique.get(m.market.id);
          if (!ex || m.confidence > ex.confidence) unique.set(m.market.id, m);
        });
        allMatches = Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence);
        updateBadge(allMatches.length);
      });
    }, 1500);
  }

  function updateBadge(count: number) {
    try {
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count }, () => {
        void chrome.runtime.lastError;
      });
    } catch { /* context invalidated after reload */ }
  }
}

// ── Market loading via service worker ────────────────────────────────────────

async function loadMarketsFromServiceWorker(): Promise<Market[]> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_MARKETS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Musashi] Service worker error:', chrome.runtime.lastError.message);
          resolve([]);
          return;
        }
        const markets: Market[] = response?.markets ?? [];
        console.log(`[Musashi] Received ${markets.length} markets from service worker`);
        resolve(markets);
      });
    } catch (e) {
      console.error('[Musashi] Could not reach service worker:', e);
      resolve([]);
    }
  });
}
