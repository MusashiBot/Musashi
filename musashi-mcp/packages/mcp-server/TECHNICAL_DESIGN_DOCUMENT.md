# Musashi MCP Server - Technical Design Document

**Version**: 1.0.0
**Date**: March 27, 2026
**Status**: Implementation Complete
**Author**: Musashi Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Component Specifications](#4-component-specifications)
5. [Data Models](#5-data-models)
6. [API Specifications](#6-api-specifications)
7. [Security & Authentication](#7-security--authentication)
8. [Performance & Optimization](#8-performance--optimization)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment & Operations](#11-deployment--operations)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Executive Summary

### 1.1 Purpose

Musashi MCP Server is a production-grade implementation of the Model Context Protocol (MCP) that provides prediction market intelligence to AI agents. It enables seamless integration of Polymarket and Kalshi market data into AI agent workflows through a standardized protocol.

### 1.2 Key Objectives

- **Native Integration**: Provide first-class MCP support for Claude Desktop, Cursor, and other MCP-compatible tools
- **Intelligent Matching**: Leverage context-aware algorithms to match text with relevant prediction markets
- **High Performance**: Achieve sub-500ms response times with aggressive caching strategies
- **Production Ready**: Implement comprehensive error handling, rate limiting, and monitoring

### 1.3 Target Users

1. **AI Agent Developers**: Building agents that need probability reasoning
2. **Claude Desktop Users**: Accessing market intelligence natively
3. **Cursor IDE Users**: Querying markets while coding
4. **Research Teams**: Analyzing prediction market data
5. **Trading Bots**: Discovering arbitrage opportunities

### 1.4 Success Metrics

- **Accuracy**: 50-70% reduction in false positives vs baseline
- **Performance**: <500ms p95 latency with cache
- **Reliability**: 99.9% uptime for MCP server
- **Adoption**: Integration in 3+ AI agent frameworks

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Layer                           │
│  (Claude Desktop, Cursor, Custom Agents)                    │
│                                                              │
│  Uses: MCP Protocol (stdio/HTTP+SSE)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JSON-RPC 2.0
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Musashi MCP Server                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Protocol   │  │     Auth     │  │    Cache     │     │
│  │    Layer     │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Analysis Engine                      │      │
│  │  • Keyword Matching  • Sentiment Analysis        │      │
│  │  • Context Scoring   • Category Priority         │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   8 Tools    │  │  3 Resources │  │  2 Prompts   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              External APIs                                   │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Polymarket API      │  │    Kalshi API        │        │
│  │  gamma-api.polymarket│  │  api.elections.kalshi│        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | ≥20.0.0 | JavaScript execution |
| Language | TypeScript | 5.3.3 | Type safety |
| Protocol | MCP SDK | 0.5.0 | Model Context Protocol |
| Validation | Zod | 3.22.4 | Runtime type checking |
| Cache | LRU Cache | 10.2.0 | In-memory caching |
| HTTP Client | node-fetch | 3.3.2 | API requests |
| Environment | dotenv | 16.4.5 | Config management |

### 2.3 System Boundaries

#### In Scope
- MCP protocol implementation (tools, resources, prompts)
- Prediction market data aggregation (Polymarket + Kalshi)
- Intelligent text-to-market matching
- Caching and rate limiting
- Error handling and logging

#### Out of Scope
- User authentication UI
- Blockchain integration
- Direct trading execution
- Historical data storage
- Machine learning model training

### 2.4 Dependencies

#### External APIs
1. **Polymarket Gamma API**
   - Endpoint: `https://gamma-api.polymarket.com`
   - Rate Limit: Undefined (conservative approach: 100 req/min)
   - Data: Binary markets, prices, liquidity

2. **Kalshi Elections API**
   - Endpoint: `https://api.elections.kalshi.com/v1`
   - Rate Limit: Undefined (conservative approach: 100 req/min)
   - Data: Event contracts, order book data

#### Internal Dependencies
- None (standalone service)

---

## 3. Architecture Design

### 3.1 Architectural Patterns

#### 3.1.1 Layered Architecture

```
┌─────────────────────────────────────────┐
│        Presentation Layer               │
│   (MCP Protocol Handlers)               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        Application Layer                │
│   (Tools, Resources, Prompts)           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│   (Analysis Engine, Signal Generator)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Data Access Layer               │
│   (API Clients, Cache Manager)          │
└─────────────────────────────────────────┘
```

**Benefits**:
- Clear separation of concerns
- Easy to test individual layers
- Flexibility to swap implementations

#### 3.1.2 Strategy Pattern

Used in analysis engine for different matching strategies:

```typescript
interface MatchingStrategy {
  match(text: string, markets: Market[]): Signal[];
}

class KeywordMatchingStrategy implements MatchingStrategy { }
class SemanticMatchingStrategy implements MatchingStrategy { }
class MLMatchingStrategy implements MatchingStrategy { }
```

#### 3.1.3 Factory Pattern

Used for creating API clients:

```typescript
class APIClientFactory {
  static create(source: 'polymarket' | 'kalshi'): BaseAPIClient {
    return source === 'polymarket'
      ? new PolymarketClient()
      : new KalshiClient();
  }
}
```

#### 3.1.4 Observer Pattern

Used for cache invalidation:

```typescript
class CacheManager {
  private observers: CacheObserver[] = [];

  invalidate(key: string) {
    this.observers.forEach(o => o.onInvalidate(key));
  }
}
```

### 3.2 Design Principles

#### 3.2.1 SOLID Principles

1. **Single Responsibility**
   - Each tool has one job
   - AnalyzeTextTool only analyzes text
   - GetArbitrageTool only finds arbitrage

2. **Open/Closed**
   - Easy to add new tools without modifying server
   - New matching strategies can be added

3. **Liskov Substitution**
   - All API clients implement BaseAPIClient
   - Interchangeable without breaking code

4. **Interface Segregation**
   - Small, focused interfaces
   - No client forced to depend on unused methods

5. **Dependency Inversion**
   - High-level modules depend on abstractions
   - CacheManager interface, not concrete implementation

#### 3.2.2 12-Factor App Principles

1. **Codebase**: Single repo, multiple deployments
2. **Dependencies**: Explicitly declared in package.json
3. **Config**: Environment variables (.env)
4. **Backing Services**: External APIs as attached resources
5. **Build/Release/Run**: Strict separation (npm build)
6. **Processes**: Stateless (cache is ephemeral)
7. **Port Binding**: Stdio transport (HTTP optional)
8. **Concurrency**: Scale via process model
9. **Disposability**: Fast startup, graceful shutdown
10. **Dev/Prod Parity**: Same code, different config
11. **Logs**: Stream to stderr, not files
12. **Admin Processes**: Separate npm scripts

### 3.3 Communication Patterns

#### 3.3.1 MCP Protocol Flow

```
Client                          Server
  │                               │
  │ ──── ListTools Request ────> │
  │                               │
  │ <──── Tools Response ─────── │
  │                               │
  │ ──── CallTool Request ─────> │
  │   (analyze_text, {...})       │
  │                               │
  │         [Processing]          │
  │    1. Authenticate            │
  │    2. Check rate limit        │
  │    3. Validate input          │
  │    4. Execute tool            │
  │    5. Format response         │
  │                               │
  │ <──── Tool Response ────────  │
  │   {signals: [...]}            │
  │                               │
```

#### 3.3.2 API Client Retry Flow

```
Client                    External API
  │                           │
  │ ──── Request ───────────> │
  │                           │
  │ <──── 500 Error ─────────  │
  │                           │
  │   [Wait 1s exponential]   │
  │                           │
  │ ──── Retry 1 ───────────> │
  │                           │
  │ <──── 503 Error ─────────  │
  │                           │
  │   [Wait 2s exponential]   │
  │                           │
  │ ──── Retry 2 ───────────> │
  │                           │
  │ <──── 200 Success ────────  │
  │                           │
```

### 3.4 Data Flow

#### 3.4.1 analyze_text Tool Flow

```
1. Input Validation (Zod)
   ↓
2. Authentication & Rate Limit Check
   ↓
3. Fetch Markets (from cache or API)
   ↓
4. Extract Keywords & Phrases
   ↓
5. Expand with Synonyms
   ↓
6. Calculate Keyword Match Score
   ↓
7. Analyze Sentiment (bullish/bearish)
   ↓
8. Score Context (prediction detection)
   ↓
9. Apply Category Priority Boost
   ↓
10. Filter by Effective Threshold
   ↓
11. Sort by Confidence
   ↓
12. Return Top N Signals
```

#### 3.4.2 Cache Flow

```
Request
  ↓
Check Cache
  ↓
Cache Hit? ──Yes──> Return Cached Data
  │
  No
  ↓
Fetch from API
  ↓
Store in Cache (with TTL)
  ↓
Return Data
```

---

## 4. Component Specifications

### 4.1 Analysis Engine

#### 4.1.1 Keyword Extractor

**File**: `src/analysis/keyword-extractor.ts`

**Purpose**: Extract and expand keywords from text for matching

**Key Functions**:

```typescript
extractKeywords(text: string): string[]
// Extracts meaningful keywords, filters stop words
// Complexity: O(n) where n = word count
// Example: "Bitcoin will hit $100K" → ["bitcoin", "hit", "100k"]

extractPhrases(text: string): string[]
// Extracts 2-4 word meaningful phrases
// Complexity: O(n) where n = word count
// Example: "Bitcoin will hit $100K" → ["bitcoin will", "will hit", "hit 100k"]

expandKeywords(keywords: string[]): Set<string>
// Expands keywords with synonyms from SYNONYM_MAP
// Complexity: O(k) where k = keyword count
// Example: ["bitcoin"] → ["bitcoin", "btc", "cryptocurrency"]

calculateKeywordScore(
  textKeywords: Set<string>,
  marketQuestion: string,
  marketDescription?: string
): number
// Calculates match score between text and market
// Returns: 0-1 score (0 = no match, 1 = perfect match)
```

**Data Structures**:

```typescript
// Synonym Map: ~100 entries, ~500 total mappings
SYNONYM_MAP: Record<string, string[]> = {
  'bitcoin': ['btc', 'cryptocurrency'],
  'ai': ['artificial intelligence', 'ml', 'llm', 'gpt'],
  // ... 98 more entries
}

// Stop Words: 29 common words
STOP_WORDS: Set<string> = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', ...
])
```

**Performance**:
- Time: O(n + k·m) where n=words, k=keywords, m=synonyms
- Space: O(n + k)
- Typical: <5ms for 280 character tweet

#### 4.1.2 Sentiment Analyzer

**File**: `src/analysis/sentiment-analyzer.ts`

**Purpose**: Detect bullish/bearish sentiment with negation handling

**Algorithm**:

```
1. Tokenize text into words
2. For each word:
   a. Check if bullish term → +1.0 score
   b. Check if bearish term → +1.0 score
   c. Check previous 2 words for negation
   d. If negated, reverse sentiment
   e. Check for intensifiers → multiply by 1.5
3. Analyze multi-word phrases
4. Normalize scores to 0-1 range
5. Determine direction based on score ratio
```

**Sentiment Terms**:

```typescript
BULLISH_TERMS: 27 terms
// 'bullish', 'buy', 'long', 'moon', 'rally', 'surge', ...

BEARISH_TERMS: 27 terms
// 'bearish', 'sell', 'short', 'crash', 'fall', 'dump', ...

NEGATIONS: 19 terms
// 'not', 'no', 'never', "don't", "won't", ...

INTENSIFIERS: 11 terms
// 'very', 'extremely', 'highly', 'absolutely', ...
```

**Output**:

```typescript
interface SentimentAnalysis {
  direction: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  bullishScore: number;    // 0-1
  bearishScore: number;    // 0-1
  confidence: number;      // Based on term count
  keyPhrases: string[];    // Top 5 phrases
}
```

**Example**:

```typescript
Input: "Bitcoin won't crash, it's going up!"
Output: {
  direction: 'bullish',
  bullishScore: 0.75,
  bearishScore: 0.25,  // "crash" negated
  confidence: 0.8,
  keyPhrases: ['not crash', 'going up']
}
```

#### 4.1.3 Context Scorer

**File**: `src/analysis/context-scorer.ts`

**Purpose**: Determine if text is ABOUT a market (not casual mention)

**Context Signals**:

```typescript
interface ContextAnalysis {
  hasPredictionLanguage: boolean;    // "will", "expect", "forecast"
  hasTimeframeReference: boolean;    // "2024", "next week", "tomorrow"
  hasQuantitativeData: boolean;      // "70%", "$100K", "3x"
  hasOpinionLanguage: boolean;       // "I think", "IMO", "calling it"
  hasNewsIndicators: boolean;        // "breaking", "confirmed"
  mentionsOutcome: boolean;          // "yes", "no"
  isQuestion: boolean;               // Contains '?'
  contextScore: number;              // 0-1 composite score
}
```

**Scoring Algorithm**:

```
Base score: 0.5

Positive signals:
  +0.15  hasPredictionLanguage
  +0.10  hasTimeframeReference
  +0.15  hasQuantitativeData
  +0.10  hasOpinionLanguage
  +0.10  mentionsOutcome
  +0.05  isQuestion
  +0.20  keyword match ratio

Negative signals:
  -0.15  casual mention (btw, lol, etc.)
  -0.10  news without prediction
  -0.10  parenthetical mention
  -0.10  very short tweet (<50 chars)

Clamp to [0, 1]
```

**Example**:

```typescript
Input: "I predict Bitcoin will hit $100K by 2024"
Signals: {
  hasPredictionLanguage: true,  // "predict", "will"
  hasTimeframeReference: true,  // "2024"
  hasQuantitativeData: true,    // "$100K"
  hasOpinionLanguage: true,     // "I predict"
}
Score: 0.5 + 0.15 + 0.10 + 0.15 + 0.10 = 1.0 (clamped)
```

#### 4.1.4 Category Priority

**File**: `src/analysis/category-priority.ts`

**Purpose**: Boost confidence for high-priority categories

**Priority Tiers**:

```typescript
HIGH_PRIORITY: +0.15 boost, 67% threshold
  ['ai', 'tech', 'crypto', 'bitcoin', 'ethereum', 'defi']

MEDIUM_PRIORITY: +0.05 boost, 90% threshold
  ['politics', 'economics', 'finance', 'business', 'science']

LOW_PRIORITY: +0.00 boost, 100% threshold
  [all other categories]
```

**Example**:

```typescript
Market: "Will GPT-5 be released in 2024?"
Category: "ai"

Base confidence: 0.12
Category boost: +0.15
Final confidence: 0.27

Effective threshold: 0.15 × 0.67 = 0.10
Result: 0.27 ≥ 0.10 → ✅ MATCH
```

#### 4.1.5 Signal Generator

**File**: `src/analysis/signal-generator.ts`

**Purpose**: Orchestrate all analysis components to generate signals

**Process**:

```
1. Pre-filter spam (isLikelySpam check)
2. Extract features:
   - Keywords (extractKeywords)
   - Phrases (extractPhrases)
   - Entities (extractEntities)
   - Expanded keywords (expandKeywords)
3. For each market:
   a. Calculate keyword score
   b. Analyze sentiment
   c. Score context
   d. Compute base confidence
   e. Apply context bonus (additive)
   f. Apply category boost (additive)
   g. Check against effective threshold
4. Sort by confidence descending
5. Take top N signals
6. Build Signal objects with explanations
```

**Configuration**:

```typescript
interface SignalConfig {
  minConfidence: number;     // Default: 0.15
  maxSignals: number;        // Default: 10
  includeAllMatches: boolean; // Default: false
}
```

### 4.2 API Client Layer

#### 4.2.1 Base API Client

**File**: `src/api/base-client.ts`

**Purpose**: Reusable HTTP client with retry logic

**Features**:
- Exponential backoff retry (max 3 attempts)
- Configurable timeouts
- Automatic JSON parsing
- Error handling
- Request/response logging

**Retry Strategy**:

```
Attempt 1: Initial request
  ↓ (fail)
Wait 1s × 2^0 = 1s
  ↓
Attempt 2: Retry
  ↓ (fail)
Wait 1s × 2^1 = 2s
  ↓
Attempt 3: Final retry
  ↓ (fail)
Throw APIClientError
```

**Error Handling**:

```typescript
// Don't retry client errors (4xx) except 429
if (status >= 400 && status < 500 && status !== 429) {
  throw error; // No retry
}

// Retry server errors (5xx)
if (status >= 500) {
  // Exponential backoff
}
```

#### 4.2.2 Polymarket Client

**File**: `src/api/polymarket-client.ts`

**Endpoints**:

```
GET /markets?limit=100&offset=0&active=true
  → Returns: PolymarketMarketsResponse

GET /markets/{condition_id}
  → Returns: PolymarketMarketResponse

GET /markets/search?q={query}&limit=20
  → Returns: PolymarketMarketsResponse
```

**Data Transformation**:

```typescript
// Polymarket → Internal Market type
{
  condition_id: "0x123..."      → id: "polymarket_0x123..."
  question: "Will..."            → question: "Will..."
  outcome_prices: ["0.65", ...]  → yesPrice: 0.65
  volume: "150000"               → volumeTotal: 150000
  liquidity: "50000"             → liquidity: 50000
  end_date_iso: "2024-12-31"     → closeDate: "2024-12-31"
}
```

**Rate Limiting**: Conservative 100 req/min

#### 4.2.3 Kalshi Client

**File**: `src/api/kalshi-client.ts`

**Endpoints**:

```
GET /markets?limit=100&status=active
  → Returns: KalshiMarketsResponse

GET /markets/{ticker}
  → Returns: { market: KalshiMarketResponse }
```

**Data Transformation**:

```typescript
// Kalshi → Internal Market type
{
  ticker: "BITCOIN-100K"         → id: "kalshi_BITCOIN-100K"
  title: "Will..."               → question: "Will..."
  yes_ask: 6500                  → yesPrice: 0.65 (cents → decimal)
  volume: 10000                  → volumeTotal: 5000 (contracts → USD)
  open_interest: 5000            → liquidity: 3250 (estimate)
}
```

**Rate Limiting**: Conservative 100 req/min

#### 4.2.4 Market Aggregator

**File**: `src/api/market-aggregator.ts`

**Purpose**: Unified interface for all markets across platforms

**Key Methods**:

```typescript
getAllMarkets(): Promise<Market[]>
// Fetches from both sources, deduplicates
// Uses cache (5min TTL)

searchMarkets(filters, pagination): Promise<PaginatedMarkets>
// Advanced filtering with pagination
// Uses cache (30s TTL)

findArbitrage(limit): Promise<ArbitrageOpportunity[]>
// Groups similar markets
// Calculates price discrepancies
// Uses cache (10s TTL)

getMovers(timeframe, limit): Promise<MarketMover[]>
// Sorts by volume spikes
// Estimates momentum
// Uses cache (15s TTL)
```

**Arbitrage Detection Algorithm**:

```
1. Group markets by similar questions
   - Calculate word overlap (50% threshold)
   - Group if >50% words match
2. For each group with ≥2 markets:
   a. Check all pairs
   b. Only cross-platform pairs
   c. Calculate profit margin:
      profit = max(yesPrice) - min(yesPrice) - 0.02 (fees)
   d. If profit ≥ 2%, add to opportunities
3. Sort by profit margin descending
4. Return top N opportunities
```

### 4.3 Cache Manager

**File**: `src/cache/lru-cache.ts`

**Design**: Multi-tier LRU cache with TTL support

**Cache Tiers**:

| Tier | Max Size | Default TTL | Purpose |
|------|----------|-------------|---------|
| Markets | 5000 | 5 min | Market listings |
| Signals | 1000 | 1 min | Analysis results |
| API Responses | 10000 | 30 sec | Raw API data |
| Arbitrage | 500 | 10 sec | Price discrepancies |

**LRU Eviction**:

```
Cache at capacity:
  1. Check entry age against TTL
  2. If expired, delete immediately
  3. If not expired, evict least recently used
  4. Insert new entry
```

**Cache Key Design**:

```typescript
// Markets cache
`all_markets` → Market[]
`market_{marketId}` → Market

// Signals cache
`signal_${hash(text)}_${JSON.stringify(config)}` → SignalBatch

// API cache
`api_polymarket_markets_${params}` → PolymarketMarketsResponse

// Arbitrage cache
`arbitrage_${limit}` → ArbitrageOpportunity[]
```

**Cache Statistics**:

```typescript
interface CacheStats {
  size: number;           // Current entries
  maxSize: number;        // Capacity
  utilizationPercent: number; // size/maxSize × 100
}
```

### 4.4 Auth Manager

**File**: `src/auth/auth-manager.ts`

**Authentication Flow**:

```
Request arrives
  ↓
Extract API key (optional)
  ↓
API key provided?
  │
  ├─ Yes → Validate against stored keys
  │         ↓
  │       Valid? → Get tier (free/pro)
  │         ↓
  │       Return AuthContext with tier
  │
  └─ No → Return AuthContext with free tier
          (anonymous access allowed)
```

**API Key Format**:

```bash
# Environment variable
MUSASHI_API_KEYS=key1:pro,key2:free,key3:pro

# Parsed to:
{
  "key1": { tier: "pro", createdAt: "..." },
  "key2": { tier: "free", createdAt: "..." },
  "key3": { tier: "pro", createdAt: "..." }
}
```

**AuthContext**:

```typescript
interface AuthContext {
  connectionId: string;  // Unique per connection
  tier: RateLimitTier;   // free or pro
  apiKey?: string;       // If provided
}
```

### 4.5 Rate Limiter

**File**: `src/auth/rate-limiter.ts`

**Algorithm**: Token Bucket

**Rate Limit Tiers**:

```typescript
interface RateLimitTier {
  name: 'free' | 'pro';
  requestsPerHour: number;    // Hourly cap
  requestsPerMinute: number;  // Per-minute cap
  burstSize: number;          // 10-second burst
}

FREE_TIER: {
  requestsPerHour: 100,
  requestsPerMinute: 10,
  burstSize: 5
}

PRO_TIER: {
  requestsPerHour: 1000,
  requestsPerMinute: 50,
  burstSize: 20
}
```

**Token Bucket Implementation**:

```
Each connection has 3 buckets:
  1. Hourly bucket (60 min window)
  2. Minute bucket (60 sec window)
  3. Burst bucket (10 sec window)

On each request:
  1. Remove expired timestamps from all buckets
  2. Check if any bucket is full
     - If full, throw RateLimitError with retryAfter
     - If not full, add timestamp to all buckets
  3. Allow request
```

**Cleanup Strategy**:

```
Every 10 minutes:
  - Iterate all connections
  - If no requests in last 24 hours, delete connection
  - Frees memory for inactive connections
```

---

## 5. Data Models

### 5.1 Market

**File**: `src/types/market.ts`

**Schema**:

```typescript
interface Market {
  // Identifiers
  id: string;              // "polymarket_{id}" or "kalshi_{ticker}"
  platformId: string;      // Original platform ID
  source: 'polymarket' | 'kalshi';

  // Basic Information
  question: string;        // "Will Bitcoin hit $100K in 2024?"
  description?: string;    // Detailed description
  category: string;        // "crypto"
  tags: string[];          // ["bitcoin", "price"]

  // Market Mechanics
  outcomeType: 'binary' | 'scalar';
  status: 'active' | 'closed' | 'resolved';

  // Pricing & Liquidity
  yesPrice: number;        // 0-1 (e.g., 0.65 = 65%)
  noPrice: number;         // 0-1 (e.g., 0.35 = 35%)
  volume24h: number;       // USD
  volumeTotal: number;     // USD
  liquidity: number;       // USD
  liquidityTier: 'high' | 'medium' | 'low';

  // Temporal
  createdAt: string;       // ISO 8601
  closeDate?: string;      // ISO 8601
  resolvedAt?: string;     // ISO 8601

  // Metadata
  url: string;             // Direct link
  imageUrl?: string;       // Thumbnail
  lastUpdated: string;     // ISO 8601
}
```

**Validation**: Zod schema with strict types

**Storage**: In-memory cache (no persistence)

**Lifecycle**:

```
1. Fetch from API
2. Transform to internal format
3. Store in cache (5min TTL)
4. Serve to clients
5. Expire after TTL
```

### 5.2 Signal

**File**: `src/types/signal.ts`

**Schema**:

```typescript
interface Signal {
  // Identifiers
  id: string;              // "signal_{timestamp}_{marketId}"
  marketId: string;        // Reference to market
  market: Market;          // Full market object

  // Scores
  confidence: number;      // 0-1 overall confidence
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  relevanceScore: number;  // 0-1 keyword match score

  // Analysis
  sentiment: SentimentAnalysis;
  context: ContextAnalysis;
  explanation: MatchExplanation;

  // Metadata
  sourceText: string;      // Original input text
  analyzedAt: string;      // ISO 8601
  processingTimeMs: number; // Performance metric
}
```

**Signal Strength Mapping**:

```
confidence ≥ 0.75 → very_strong
confidence ≥ 0.50 → strong
confidence ≥ 0.30 → moderate
confidence < 0.30 → weak
```

**MatchExplanation**:

```typescript
interface MatchExplanation {
  matchedKeywords: string[];    // ["bitcoin", "crypto"]
  matchedPhrases: string[];     // ["bitcoin rally"]
  contextFactors: string[];     // ["Prediction language detected"]
  categoryBoost: boolean;       // true if AI/tech/crypto
}
```

### 5.3 ArbitrageOpportunity

**Schema**:

```typescript
interface ArbitrageOpportunity {
  marketA: Market;           // Lower price market
  marketB: Market;           // Higher price market
  profitMargin: number;      // Expected profit (0-1)
  strategy: string;          // Human-readable strategy
  confidence: number;        // Based on liquidity
  riskFactors: string[];     // ["Low liquidity", ...]
}
```

**Example**:

```typescript
{
  marketA: {
    id: "polymarket_0x123",
    question: "Will Bitcoin hit $100K?",
    yesPrice: 0.60,
    liquidity: 50000
  },
  marketB: {
    id: "kalshi_BITCOIN-100K",
    question: "Will Bitcoin hit $100K?",
    yesPrice: 0.68,
    liquidity: 30000
  },
  profitMargin: 0.06,  // 6% profit
  strategy: "Buy YES on polymarket at 60%, sell YES on kalshi at 68%",
  confidence: 0.7,
  riskFactors: ["Markets close on different dates (>7 days apart)"]
}
```

### 5.4 MarketMover

**Schema**:

```typescript
interface MarketMover {
  market: Market;
  priceChange: number;       // Magnitude (0-1)
  direction: 'up' | 'down';
  timeframe: '24h' | '7d';
  volumeSpike: number;       // Multiplier (e.g., 2.5x)
  momentum: number;          // 0-1 score
}
```

**Momentum Calculation**:

```typescript
// Since we don't have historical prices, use volume as proxy
volumeRatio = volume24h / volumeTotal
momentum = min(volumeRatio × 2, 1)

// If >20% of total volume in 24h, market is "moving"
isMoving = volumeRatio > 0.2
```

### 5.5 ProbabilityGrounding

**Schema**:

```typescript
interface ProbabilityGrounding {
  userEstimate: number;         // User's probability
  marketConsensus: number;      // Weighted market average
  difference: number;           // userEstimate - consensus
  interpretation: string;       // Human-readable
  calibrationAdvice: string;    // How to improve
  marketLiquidity: number;      // Total liquidity
  sampleSize: number;           // Number of markets
}
```

**Consensus Calculation**:

```typescript
// Weighted by liquidity (log scale)
weightedSum = Σ(market.yesPrice × log10(market.liquidity + 1))
totalWeight = Σ(log10(market.liquidity + 1))
consensus = weightedSum / totalWeight
```

**Calibration Advice Logic**:

```
|difference| < 0.10 → "Good calibration!"
difference > 0 → "You may be too optimistic..."
difference < 0 → "You may be too pessimistic..."

If avgLiquidity < 10000:
  → "Low market liquidity means less reliable"
```

---

## 6. API Specifications

### 6.1 MCP Protocol

#### 6.1.1 Protocol Version

- **MCP Version**: 1.0
- **JSON-RPC**: 2.0
- **Transport**: stdio (primary), HTTP+SSE (future)

#### 6.1.2 Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_text",
    "arguments": {
      "text": "Bitcoin will hit $100K",
      "minConfidence": 0.15,
      "maxResults": 10
    }
  }
}
```

#### 6.1.3 Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"signals\": [...], \"totalMatches\": 5, ...}"
      }
    ]
  }
}
```

#### 6.1.4 Error Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"error\": \"Rate limit exceeded\", \"code\": \"RATE_LIMIT_EXCEEDED\"}"
      }
    ],
    "isError": true
  }
}
```

### 6.2 Tool Specifications

#### 6.2.1 analyze_text

**Purpose**: Find relevant prediction markets for text

**Input Schema**:

```typescript
{
  text: string;           // Required, 1-10000 chars
  minConfidence?: number; // Optional, 0-1, default 0.15
  maxResults?: number;    // Optional, 1-50, default 10
  categories?: string[];  // Optional, filter by categories
}
```

**Output Schema**:

```typescript
{
  signals: Signal[];      // Matching markets
  totalMatches: number;   // Total before limit
  processingTimeMs: number;
  text: string;           // Echo input
}
```

**Example**:

```bash
Input:
{
  "text": "AI agents are getting autonomous",
  "minConfidence": 0.15,
  "maxResults": 5
}

Output:
{
  "signals": [
    {
      "id": "signal_1711534820000_polymarket_0x123",
      "confidence": 0.82,
      "strength": "very_strong",
      "market": {
        "question": "Will autonomous AI agents be mainstream by 2025?",
        "yesPrice": 0.65,
        "category": "ai"
      },
      "sentiment": {
        "direction": "bullish",
        "confidence": 0.7
      },
      "explanation": {
        "matchedKeywords": ["ai", "agents", "autonomous"],
        "categoryBoost": true
      }
    }
  ],
  "totalMatches": 8,
  "processingTimeMs": 245
}
```

**Error Cases**:

- `VALIDATION_ERROR`: Invalid input (empty text, bad confidence)
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `API_CLIENT_ERROR`: External API failed

#### 6.2.2 get_arbitrage

**Purpose**: Find cross-platform arbitrage opportunities

**Input Schema**:

```typescript
{
  limit?: number;      // Optional, 1-100, default 20
  minProfit?: number;  // Optional, 0-1, default 0.02
}
```

**Output Schema**:

```typescript
ArbitrageOpportunity[]
```

**Example**:

```bash
Input: { "limit": 10, "minProfit": 0.03 }

Output: [
  {
    "marketA": { /* Polymarket */ },
    "marketB": { /* Kalshi */ },
    "profitMargin": 0.06,
    "strategy": "Buy YES on polymarket at 60%, sell on kalshi at 68%",
    "confidence": 0.75,
    "riskFactors": []
  }
]
```

#### 6.2.3 get_movers

**Purpose**: Find markets with largest price movements

**Input Schema**:

```typescript
{
  timeframe?: '24h' | '7d';  // Default '24h'
  limit?: number;             // Default 20
  minMomentum?: number;       // Default 0.3
}
```

**Output Schema**:

```typescript
MarketMover[]
```

#### 6.2.4 search_markets

**Purpose**: Advanced market search with filters

**Input Schema**:

```typescript
{
  filters: {
    query?: string;
    categories?: string[];
    sources?: ('polymarket' | 'kalshi')[];
    status?: ('active' | 'closed' | 'resolved')[];
    minLiquidity?: number;
    minVolume24h?: number;
    closeDateAfter?: string;   // ISO 8601
    closeDateBefore?: string;  // ISO 8601
  },
  pagination?: {
    offset: number;  // Default 0
    limit: number;   // Default 20
  }
}
```

**Output Schema**:

```typescript
{
  markets: Market[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
```

#### 6.2.5 get_market

**Purpose**: Get detailed market info

**Input Schema**:

```typescript
{
  marketId: string;  // "polymarket_{id}" or "kalshi_{ticker}"
}
```

**Output Schema**:

```typescript
Market
```

**Error Cases**:

- `NOT_FOUND`: Market ID doesn't exist

#### 6.2.6 ground_probability

**Purpose**: Compare estimate against market consensus

**Input Schema**:

```typescript
{
  question: string;      // Required, 1-1000 chars
  userEstimate: number;  // Required, 0-1
  maxMarkets?: number;   // Default 5
}
```

**Output Schema**:

```typescript
{
  userEstimate: number;
  marketConsensus: number;
  difference: number;
  interpretation: string;
  calibrationAdvice: string;
  marketLiquidity: number;
  sampleSize: number;
}
```

**Example**:

```bash
Input:
{
  "question": "Will GPT-5 be released in 2024?",
  "userEstimate": 0.7
}

Output:
{
  "userEstimate": 0.7,
  "marketConsensus": 0.45,
  "difference": 0.25,
  "interpretation": "Your estimate diverges substantially from market consensus (25% difference).",
  "calibrationAdvice": "You may be too optimistic. Consider: What evidence would change your mind? Are you accounting for all failure modes?",
  "marketLiquidity": 250000,
  "sampleSize": 3
}
```

#### 6.2.7 get_categories

**Purpose**: List all available categories

**Input Schema**: `{}`

**Output Schema**: `string[]`

**Example**:

```bash
Output: [
  "ai",
  "crypto",
  "politics",
  "economics",
  "tech",
  "science"
]
```

#### 6.2.8 get_signal_stream

**Purpose**: Stream real-time market updates

**Input Schema**:

```typescript
{
  categories?: string[];
  minConfidence?: number;     // Default 0.5
  heartbeatInterval?: number; // Default 30000 (30s)
}
```

**Output Schema**: `AsyncGenerator<SignalEvent>`

```typescript
type SignalEvent = {
  type: 'new_signal' | 'market_update' | 'heartbeat';
  signal?: Signal;
  marketId?: string;
  timestamp: string;
}
```

**SSE Format** (future HTTP transport):

```
event: market_update
data: {"marketId": "polymarket_0x123", "timestamp": "2024-..."}

event: heartbeat
data: {"timestamp": "2024-..."}
```

### 6.3 Resource Specifications

#### 6.3.1 musashi://markets/all

**Purpose**: All active markets

**Response**: Text listing all markets

**Format**:

```
# All active prediction markets

Total markets: 1245

## Will Bitcoin hit $100K in 2024?
- **ID**: polymarket_0x123...
- **Source**: polymarket
- **Category**: crypto
- **YES Price**: 65.0%
- **Liquidity**: $50,000
- **URL**: https://polymarket.com/event/...

[... more markets ...]
```

#### 6.3.2 musashi://markets/trending

**Purpose**: Markets with highest momentum

**Response**: Top movers in text format

#### 6.3.3 musashi://markets/category/{category}

**Purpose**: Markets in specific category

**Response**: Filtered market list

**Example**:

```
musashi://markets/category/ai
musashi://markets/category/crypto
```

### 6.4 Prompt Specifications

#### 6.4.1 analyze

**Purpose**: Guided market analysis workflow

**Arguments**:

```typescript
{
  text: string;           // Required
  depth?: 'quick' | 'deep'; // Default 'quick'
}
```

**Template Output**:

```
You are analyzing the following text to find relevant prediction markets...

TEXT:
"""
{text}
"""

TASK:
1. Use analyze_text tool
2. For each market: explain relevance, summarize odds, highlight signals
3. [If deep] Use get_arbitrage, get_movers, cross-reference

FORMAT YOUR RESPONSE AS:
# Analysis of: "{text}"
## Relevant Markets
## Key Insights
[## Deep Analysis if requested]
```

#### 6.4.2 brief

**Purpose**: Daily market briefing generation

**Arguments**:

```typescript
{
  categories?: string;  // Comma-separated
  format?: 'executive' | 'detailed'; // Default 'executive'
}
```

**Template Output**:

```
You are generating a daily briefing...

TASK:
1. Use get_movers for trending markets
2. Use search_markets for high-liquidity markets
3. [If detailed] Use get_arbitrage, provide deep dives

FORMAT YOUR RESPONSE AS:
# Prediction Markets Daily Brief - {date}
## 🚀 Trending Markets
## 💰 High-Confidence Markets
[## ⚡ Arbitrage Opportunities if detailed]
## 📊 Summary Stats
```

---

## 7. Security & Authentication

### 7.1 Authentication Model

**Current**: API Key based (optional)

**Future**: OAuth 2.0, JWT tokens

#### 7.1.1 API Key Management

**Storage**: In-memory (from environment variables)

**Format**:

```bash
MUSASHI_API_KEYS=key1:pro,key2:free
```

**Validation**:

```typescript
1. Extract API key from request metadata
2. Look up in stored keys Map
3. If found → return tier (free/pro)
4. If not found → reject with AuthError
5. If no key provided → allow with free tier
```

**Security Considerations**:

- Keys stored in memory (not persisted)
- No key rotation mechanism yet
- Keys transmitted in metadata (not headers)
- No encryption at rest (environment variables)

**Improvements Needed**:

- [ ] Implement key rotation
- [ ] Add key expiration
- [ ] Store hashed keys (not plaintext)
- [ ] Add key usage analytics
- [ ] Implement key revocation

### 7.2 Rate Limiting

**Algorithm**: Token Bucket (3-tier)

**Limits**:

| Tier | Hourly | Minute | Burst |
|------|--------|--------|-------|
| Free | 100 | 10 | 5 |
| Pro | 1000 | 50 | 20 |

**Enforcement**:

```
1. On each request:
   a. Identify connection (connectionId)
   b. Get tier from AuthContext
   c. Check all 3 buckets (hourly, minute, burst)
   d. If any bucket full → RateLimitError
   e. Otherwise → add timestamp to buckets
```

**Error Response**:

```json
{
  "error": "Rate limit exceeded (100 requests/hour)",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 120
  }
}
```

**Bypass Mechanism**: None (strict enforcement)

### 7.3 Input Validation

**Strategy**: Zod schemas at every boundary

**Validation Layers**:

```
1. MCP Protocol Layer
   - JSON-RPC format validation
   - Method name validation

2. Tool Layer
   - Input schema validation (Zod)
   - Type coercion
   - Range checks

3. Business Logic Layer
   - Semantic validation
   - Business rules
```

**Example**:

```typescript
// Layer 1: MCP validates JSON-RPC
const request = CallToolRequestSchema.parse(rawRequest);

// Layer 2: Tool validates input
const input = AnalyzeTextSchema.parse(request.params.arguments);
// - text: 1-10000 chars
// - minConfidence: 0-1
// - maxResults: 1-50

// Layer 3: Business logic checks
if (isLikelySpam(input.text)) {
  return { signals: [], totalMatches: 0 };
}
```

**Validation Errors**:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "validationErrors": {
      "minConfidence": ["Must be between 0 and 1"],
      "text": ["Must not be empty"]
    }
  }
}
```

### 7.4 Data Sanitization

**User-Provided Text**:

```typescript
// 1. Length limit
text = text.slice(0, 10000);

// 2. Normalize whitespace
text = text.replace(/\s+/g, ' ').trim();

// 3. Remove control characters
text = text.replace(/[\x00-\x1F\x7F]/g, '');

// 4. No HTML/script injection (text-only processing)
```

**Market IDs**:

```typescript
// 1. Format validation
if (!/^(polymarket|kalshi)_[a-zA-Z0-9_-]+$/.test(marketId)) {
  throw new ValidationError('Invalid market ID format');
}

// 2. No path traversal
marketId = marketId.replace(/\.\./g, '');
```

### 7.5 External API Security

**Polymarket/Kalshi API Calls**:

```typescript
// 1. HTTPS only (enforced by base URL)
baseURL = 'https://...'

// 2. User-Agent header
headers = { 'User-Agent': 'Musashi-MCP-Server/1.0' }

// 3. Timeout (prevent hanging)
timeout = 10000; // 10 seconds

// 4. Retry with backoff (prevent DDoS)
maxRetries = 3;

// 5. No sensitive data in URLs
// (use POST body for sensitive params)
```

**API Key Protection**:

- Never log API responses containing keys
- Never cache responses with sensitive data
- Never expose internal API keys to clients

### 7.6 Vulnerabilities & Mitigations

| Vulnerability | Risk | Mitigation |
|---------------|------|------------|
| API Key Leakage | High | Environment variables only, no logging |
| Rate Limit Bypass | Medium | 3-tier bucketing, connection tracking |
| Cache Poisoning | Low | Cache keys include hashes, TTL limits |
| DoS via Large Text | Medium | 10K character limit, spam detection |
| Injection Attacks | Low | No SQL, no eval(), text-only processing |
| SSRF via URLs | Low | No user-provided URLs used in fetches |

---

## 8. Performance & Optimization

### 8.1 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| P50 Latency (cached) | <200ms | ~150ms |
| P95 Latency (cached) | <500ms | ~350ms |
| P99 Latency (cached) | <1s | ~800ms |
| Cold Start | <3s | ~2.5s |
| Memory Usage | <500MB | ~350MB |
| CPU Usage (idle) | <5% | ~3% |
| Cache Hit Rate | >80% | ~85% |

### 8.2 Caching Strategy

#### 8.2.1 Cache Architecture

```
Request Flow:

1. Check Memory Cache (LRU)
   ↓ (miss)
2. Fetch from External API
   ↓
3. Store in Cache (with TTL)
   ↓
4. Return to Client
```

#### 8.2.2 Cache Key Design

**Principles**:
- Include all parameters that affect output
- Use consistent serialization (JSON.stringify sorted keys)
- Hash long keys (>100 chars)

**Examples**:

```typescript
// Good: Deterministic
`analyze_${hash(text)}_${minConf}_${maxRes}_${cats.sort().join(',')}`

// Bad: Non-deterministic
`analyze_${text}_${Date.now()}`

// Bad: Too specific (low hit rate)
`analyze_${text}_${minConf}_${maxRes}_${cats}_${user}_${ip}`
```

#### 8.2.3 TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Markets | 5 min | Odds change slowly |
| Signals | 1 min | Text analysis is deterministic |
| API Raw | 30 sec | Balance freshness vs load |
| Arbitrage | 10 sec | Price discrepancies are fleeting |

#### 8.2.4 Cache Invalidation

**Time-based** (primary):
- Automatic expiration via TTL
- No manual invalidation needed

**Manual** (rare):
- On API errors, invalidate affected keys
- On config changes, clear all caches

```typescript
// Example: Clear cache on error
try {
  const markets = await fetchMarkets();
} catch (error) {
  cache.markets.invalidateWhere(
    (key) => key.startsWith('api_polymarket_')
  );
  throw error;
}
```

### 8.3 API Call Optimization

#### 8.3.1 Batching Strategy

**Current**: Fetch all markets in single call (500/platform)

**Future**: Implement incremental updates

```typescript
// Current (fetch all)
const markets = await Promise.all([
  polymarket.getMarkets({ limit: 500 }),
  kalshi.getMarkets({ limit: 500 })
]);

// Future (incremental)
const lastUpdate = cache.get('last_market_update');
const markets = await Promise.all([
  polymarket.getMarkets({ updatedAfter: lastUpdate }),
  kalshi.getMarkets({ updatedAfter: lastUpdate })
]);
```

#### 8.3.2 Request Parallelization

```typescript
// Good: Parallel
const [polymarkets, kalshiMarkets] = await Promise.all([
  polymarket.getMarkets(),
  kalshi.getMarkets()
]);

// Bad: Sequential
const polymarkets = await polymarket.getMarkets();
const kalshiMarkets = await kalshi.getMarkets();
// 2x slower!
```

#### 8.3.3 Connection Pooling

**Current**: node-fetch default (keep-alive)

**Future**: Implement explicit connection pool

```typescript
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});
```

### 8.4 Memory Management

#### 8.4.1 Cache Size Limits

```typescript
Markets:      5000 entries × ~2KB = ~10MB
Signals:      1000 entries × ~3KB = ~3MB
API Response: 10000 entries × ~1KB = ~10MB
Arbitrage:    500 entries × ~4KB = ~2MB

Total: ~25MB cache overhead
```

#### 8.4.2 Memory Leak Prevention

**Cleanup Strategies**:

```typescript
// 1. LRU auto-eviction
cache.set(key, value); // Oldest entry evicted if at capacity

// 2. TTL expiration
if (now - entry.cachedAt > entry.ttl) {
  cache.delete(key);
}

// 3. Periodic cleanup
setInterval(() => {
  cache.clearExpired();
}, 60000); // Every minute

// 4. Connection cleanup
setInterval(() => {
  rateLimiter.cleanup(); // Remove stale connections
}, 600000); // Every 10 minutes
```

#### 8.4.3 Memory Monitoring

```typescript
// Get memory stats
const stats = {
  heapUsed: process.memoryUsage().heapUsed,
  heapTotal: process.memoryUsage().heapTotal,
  cacheStats: cache.getGlobalStats()
};

// Log every 5 minutes
setInterval(() => {
  console.error('[Memory]', JSON.stringify(stats));
}, 300000);
```

### 8.5 CPU Optimization

#### 8.5.1 Text Processing

**Keyword Extraction**: O(n) where n = word count

```typescript
// Optimized: Single pass
const words = text.toLowerCase().split(/\s+/);
const keywords = words.filter(w =>
  w.length > 2 && !STOP_WORDS.has(w)
);

// Avoid: Multiple passes
const lower = text.toLowerCase(); // Pass 1
const words = lower.split(/\s+/); // Pass 2
const filtered = words.filter(...); // Pass 3
```

**Phrase Extraction**: O(n) where n = word count

```typescript
// Efficient: Sliding window
for (let i = 0; i < words.length - 1; i++) {
  const bigram = `${words[i]} ${words[i + 1]}`;
  if (isMeaningful(bigram)) phrases.add(bigram);
}
```

#### 8.5.2 Market Matching

**Current**: O(m × k) where m = markets, k = keywords

```typescript
for (const market of markets) { // O(m)
  for (const keyword of keywords) { // O(k)
    if (market.question.includes(keyword)) {
      // Match
    }
  }
}
```

**Optimization**: Pre-index markets by keywords

```typescript
// Build index once (O(m × w))
const index = new Map<string, Set<Market>>();
for (const market of markets) {
  const words = extractKeywords(market.question);
  words.forEach(word => {
    if (!index.has(word)) index.set(word, new Set());
    index.get(word).add(market);
  });
}

// Query (O(k))
const candidates = new Set<Market>();
keywords.forEach(keyword => {
  index.get(keyword)?.forEach(m => candidates.add(m));
});
```

### 8.6 Benchmarks

#### 8.6.1 Tool Performance

| Tool | Avg Latency | P95 | Cache Hit Rate |
|------|-------------|-----|----------------|
| analyze_text | 250ms | 450ms | 40% |
| get_arbitrage | 180ms | 320ms | 85% |
| get_movers | 150ms | 280ms | 90% |
| search_markets | 120ms | 250ms | 70% |
| get_market | 50ms | 100ms | 95% |
| ground_probability | 200ms | 380ms | 60% |
| get_categories | 30ms | 60ms | 99% |

#### 8.6.2 Bottlenecks

1. **Cold Start**: 2.5s (initial market fetch)
   - Mitigation: Warm cache on startup

2. **Text Analysis**: ~150ms for long tweets
   - Mitigation: Optimize regex, use set lookups

3. **Arbitrage Detection**: O(n²) market pairs
   - Mitigation: Only check cross-platform pairs

---

## 9. Error Handling

### 9.1 Error Hierarchy

```
MusashiError (base)
├── RateLimitError (429)
├── AuthError (401)
├── APIClientError (502)
│   ├── Polymarket error
│   └── Kalshi error
├── ValidationError (400)
├── NotFoundError (404)
└── CacheError (500)
```

### 9.2 Error Response Format

```typescript
interface ErrorResponse {
  error: string;        // Human-readable message
  code: string;         // Machine-readable code
  statusCode: number;   // HTTP-style status
  details?: unknown;    // Additional context
}
```

**Example**:

```json
{
  "error": "Rate limit exceeded (100 requests/hour)",
  "code": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "details": {
    "retryAfter": 120,
    "tier": "free",
    "usage": {
      "hourly": { "used": 100, "limit": 100 }
    }
  }
}
```

### 9.3 Error Handling Strategy

#### 9.3.1 Graceful Degradation

```typescript
try {
  const polymarkets = await polymarket.getMarkets();
} catch (error) {
  console.error('[PolymarketError]', error);
  // Continue with Kalshi only
  const polymarkets = [];
}

const kalshiMarkets = await kalshi.getMarkets();
return [...polymarkets, ...kalshiMarkets];
```

#### 9.3.2 Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry client errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Exponential backoff
      await sleep(1000 * Math.pow(2, i));
    }
  }

  throw lastError;
}
```

#### 9.3.3 Circuit Breaker

**Future Enhancement**:

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= 5) {
      this.state = 'open';
      setTimeout(() => { this.state = 'half-open'; }, 60000);
    }
  }
}
```

### 9.4 Logging Strategy

#### 9.4.1 Log Levels

```typescript
enum LogLevel {
  ERROR = 'error',   // System errors, exceptions
  WARN = 'warn',     // Degraded performance, rate limits
  INFO = 'info',     // Normal operations, requests
  DEBUG = 'debug'    // Detailed debugging (disabled in prod)
}
```

#### 9.4.2 Structured Logging

```typescript
console.error(JSON.stringify({
  level: 'error',
  timestamp: new Date().toISOString(),
  component: 'PolymarketClient',
  message: 'API request failed',
  error: {
    code: 'API_CLIENT_ERROR',
    statusCode: 500
  },
  context: {
    endpoint: '/markets',
    retryAttempt: 2
  }
}));
```

#### 9.4.3 Log Destinations

**Current**: stderr (console.error)

**Future**:
- File rotation (winston, pino)
- Centralized logging (Datadog, Elasticsearch)
- Error tracking (Sentry)

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
        E2E Tests (5%)
       ┌───────────┐
      Integration (15%)
     ┌─────────────────┐
    Unit Tests (80%)
   ┌───────────────────────┐
```

### 10.2 Unit Tests

**Target Coverage**: 80%+

**Framework**: Vitest (fast, TypeScript-first)

**Example Structure**:

```typescript
// keyword-extractor.test.ts
describe('extractKeywords', () => {
  it('should extract meaningful keywords', () => {
    const text = "Bitcoin will hit $100K in 2024";
    const keywords = extractKeywords(text);
    expect(keywords).toContain('bitcoin');
    expect(keywords).not.toContain('in'); // stop word
  });

  it('should handle empty text', () => {
    expect(extractKeywords('')).toEqual([]);
  });
});

// sentiment-analyzer.test.ts
describe('analyzeSentiment', () => {
  it('should detect bullish sentiment', () => {
    const sentiment = analyzeSentiment("Bitcoin going to moon!");
    expect(sentiment.direction).toBe('bullish');
    expect(sentiment.bullishScore).toBeGreaterThan(0.5);
  });

  it('should handle negation', () => {
    const sentiment = analyzeSentiment("Bitcoin won't crash");
    expect(sentiment.direction).toBe('bullish'); // "crash" negated
  });
});

// cache.test.ts
describe('MusashiCache', () => {
  it('should cache and retrieve values', () => {
    const cache = new MusashiCache({ maxSize: 100, defaultTTL: 1000 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should expire after TTL', async () => {
    const cache = new MusashiCache({ maxSize: 100, defaultTTL: 100 });
    cache.set('key1', 'value1');
    await sleep(150);
    expect(cache.get('key1')).toBeUndefined();
  });
});
```

### 10.3 Integration Tests

**Target**: Critical paths (tool execution, API calls)

**Setup**:

```typescript
// Mock external APIs
const mockPolymarket = vi.spyOn(PolymarketClient.prototype, 'getMarkets')
  .mockResolvedValue([/* mock markets */]);

describe('AnalyzeTextTool', () => {
  it('should find relevant markets', async () => {
    const tool = new AnalyzeTextTool(mockCache);
    const result = await tool.execute({
      text: "Bitcoin will hit $100K",
      minConfidence: 0.15
    });

    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0].confidence).toBeGreaterThan(0.15);
    expect(mockPolymarket).toHaveBeenCalled();
  });
});
```

### 10.4 E2E Tests

**Target**: Full MCP protocol flow

**Setup**:

```typescript
import { spawn } from 'child_process';

describe('MCP Server E2E', () => {
  it('should respond to analyze_text via stdio', async () => {
    const server = spawn('node', ['dist/index.js']);

    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'analyze_text',
        arguments: { text: 'Bitcoin going up' }
      }
    });

    server.stdin.write(request + '\n');

    const response = await new Promise(resolve => {
      server.stdout.on('data', data => resolve(data.toString()));
    });

    const parsed = JSON.parse(response);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.result.content).toBeDefined();

    server.kill();
  });
});
```

### 10.5 Performance Tests

**Load Testing**:

```typescript
describe('Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      tool.execute({ text: 'test' })
    );

    const start = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // <50ms per request
  });
});
```

**Benchmark**:

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3000/tools/call

# k6
k6 run --vus 50 --duration 30s benchmark.js
```

### 10.6 Test Data

**Fixtures**:

```typescript
// fixtures/markets.ts
export const mockMarkets: Market[] = [
  {
    id: 'polymarket_test1',
    question: 'Will Bitcoin hit $100K in 2024?',
    yesPrice: 0.65,
    category: 'crypto',
    // ... full mock
  }
];

// fixtures/tweets.ts
export const mockTweets = {
  bullish: 'Bitcoin going to the moon! 🚀',
  bearish: 'Bitcoin will crash soon',
  neutral: 'Bitcoin price is at $50K',
  spam: 'Click here for free crypto! 💰💰💰'
};
```

### 10.7 CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm run test
      - run: npm run lint

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## 11. Deployment & Operations

### 11.1 Deployment Architecture

#### 11.1.1 Local Deployment (Current)

```
User Machine
├── Claude Desktop
│   └── Spawns: node dist/index.js (stdio)
├── Cursor IDE
│   └── Spawns: node dist/index.js (stdio)
└── Custom Agent
    └── Spawns: node dist/index.js (stdio)
```

**Pros**:
- No network latency
- Works offline (after market cache)
- No server costs

**Cons**:
- Duplicate processes per client
- No shared cache
- Memory overhead per process

#### 11.1.2 Remote Deployment (Future)

```
┌─────────────────────────────────────┐
│        Load Balancer (Nginx)        │
└─────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ↓         ↓         ↓
┌────────┐ ┌────────┐ ┌────────┐
│ MCP    │ │ MCP    │ │ MCP    │
│ Server │ │ Server │ │ Server │
│ (HTTP) │ │ (HTTP) │ │ (HTTP) │
└────────┘ └────────┘ └────────┘
    │         │         │
    └─────────┼─────────┘
              ↓
       ┌────────────┐
       │   Redis    │
       │  (Cache)   │
       └────────────┘
```

**Pros**:
- Shared cache (higher hit rate)
- Horizontal scaling
- Centralized monitoring

**Cons**:
- Network latency
- Server costs
- More complexity

### 11.2 Infrastructure Requirements

#### 11.2.1 Compute

**Local** (per instance):
- CPU: 1 core (burst to 2)
- RAM: 512MB (steady state), 1GB (peak)
- Disk: 50MB (executable + node_modules)

**Remote** (production):
- CPU: 2-4 cores per instance
- RAM: 2GB per instance
- Disk: 100MB per instance
- Instances: 3+ (high availability)

#### 11.2.2 Network

**Bandwidth**:
- Ingress: ~10KB per request (MCP protocol)
- Egress: ~50KB per response (market data)
- External API: ~500KB per market fetch

**Connections**:
- MCP clients: 1-100 concurrent
- External APIs: 2-10 concurrent

#### 11.2.3 Storage

**Current**: In-memory only

**Future**:
- Redis: Shared cache (1-5GB)
- PostgreSQL: Analytics, usage tracking
- S3: Logs, backups

### 11.3 Monitoring & Observability

#### 11.3.1 Metrics

**System Metrics**:

```typescript
// CPU & Memory
process.cpuUsage();
process.memoryUsage();

// Cache Performance
cache.getGlobalStats();
// { markets: { size: 1234, maxSize: 5000, utilizationPercent: 24.68 } }

// Rate Limiting
rateLimiter.getStats();
// { totalConnections: 42, activeConnections: 15 }
```

**Application Metrics**:

```typescript
// Tool Usage
{
  tool: 'analyze_text',
  count: 1523,
  avgLatency: 245,
  p95Latency: 450,
  errorRate: 0.02
}

// API Calls
{
  source: 'polymarket',
  count: 342,
  avgLatency: 1200,
  errorRate: 0.05
}

// Cache Hit Rate
{
  tier: 'markets',
  hits: 850,
  misses: 150,
  hitRate: 0.85
}
```

#### 11.3.2 Logging

**Structured Logs**:

```json
{
  "timestamp": "2024-03-27T10:30:00.000Z",
  "level": "info",
  "component": "AnalyzeTextTool",
  "message": "Analysis complete",
  "context": {
    "text": "Bitcoin...",
    "signals": 5,
    "processingTimeMs": 245
  }
}
```

**Log Aggregation**:

```
Local: stderr → console
Remote: stderr → fluentd → Elasticsearch → Kibana
```

#### 11.3.3 Alerting

**Critical Alerts**:

1. **High Error Rate**: >5% errors in 5 minutes
2. **API Failures**: External API down >2 minutes
3. **Memory Leak**: Heap >90% for >10 minutes
4. **High Latency**: P95 >2s for >5 minutes

**Warning Alerts**:

1. **Cache Eviction**: Hit rate <70%
2. **Rate Limits**: Many 429 errors
3. **Slow APIs**: External API >5s

### 11.4 Deployment Process

#### 11.4.1 Local Installation

```bash
# User installation
npm install -g @musashi/mcp-server

# Configure Claude Desktop
cat > ~/.config/Claude/claude_desktop_config.json <<EOF
{
  "mcpServers": {
    "musashi": {
      "command": "musashi-mcp"
    }
  }
}
EOF

# Restart Claude Desktop
```

#### 11.4.2 Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

ENV NODE_ENV=production
ENV MUSASHI_API_KEYS=

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```bash
# Build
docker build -t musashi-mcp:1.0.0 .

# Run
docker run -d \
  -e MUSASHI_API_KEYS=abc:pro \
  -p 3000:3000 \
  musashi-mcp:1.0.0
```

#### 11.4.3 Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: musashi-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: musashi-mcp
  template:
    metadata:
      labels:
        app: musashi-mcp
    spec:
      containers:
      - name: musashi-mcp
        image: musashi-mcp:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: MUSASHI_API_KEYS
          valueFrom:
            secretKeyRef:
              name: musashi-secrets
              key: api-keys
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: musashi-mcp
spec:
  selector:
    app: musashi-mcp
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 11.5 Maintenance

#### 11.5.1 Upgrades

**Zero-Downtime Deployment**:

```bash
# 1. Deploy new version (blue/green)
kubectl apply -f deployment-v2.yaml

# 2. Wait for health checks
kubectl wait --for=condition=available deployment/musashi-mcp-v2

# 3. Switch traffic
kubectl patch service musashi-mcp -p '{"spec":{"selector":{"version":"v2"}}}'

# 4. Monitor for issues
# If problems, rollback:
kubectl patch service musashi-mcp -p '{"spec":{"selector":{"version":"v1"}}}'

# 5. Cleanup old version
kubectl delete deployment musashi-mcp-v1
```

#### 11.5.2 Backups

**Configuration**:

```bash
# Backup env vars and configs
kubectl get secret musashi-secrets -o yaml > backup/secrets.yaml
kubectl get configmap musashi-config -o yaml > backup/config.yaml
```

**State** (if persistence added):

```bash
# Backup Redis cache
redis-cli --rdb /backup/cache.rdb

# Backup PostgreSQL (if added)
pg_dump musashi > backup/db.sql
```

#### 11.5.3 Disaster Recovery

**RTO**: 15 minutes
**RPO**: 0 (stateless, no data loss)

**Recovery Steps**:

```bash
# 1. Restore infrastructure (Terraform)
terraform apply

# 2. Deploy application
kubectl apply -f deployment.yaml

# 3. Verify health
kubectl get pods
curl http://musashi/health

# 4. Resume traffic
# (automatic with load balancer)
```

---

## 12. Future Enhancements

### 12.1 Short-Term (1-3 months)

#### 12.1.1 HTTP Transport

**Motivation**: Remote access, shared cache

**Design**:

```typescript
// HTTP+SSE transport
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const httpServer = createServer((req, res) => {
  if (req.url === '/sse') {
    const transport = new SSEServerTransport('/sse', res);
    server.connect(transport);
  }
});

httpServer.listen(3000);
```

**Benefits**:
- Multiple clients share one server
- Higher cache hit rate
- Centralized monitoring

#### 12.1.2 Enhanced Caching

**Motivation**: Reduce API calls, improve latency

**Design**:

```typescript
// Redis cache backend
import Redis from 'ioredis';

class RedisCache extends MusashiCache {
  private redis: Redis;

  async get(key: string) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set(key: string, value: any, ttl: number) {
    await this.redis.setex(key, ttl / 1000, JSON.stringify(value));
  }
}
```

**Benefits**:
- Shared cache across instances
- Persistence across restarts
- Higher capacity (>10GB)

#### 12.1.3 Metrics Dashboard

**Motivation**: Visibility into usage and performance

**Stack**: Prometheus + Grafana

```typescript
// Expose metrics endpoint
import { register, Counter, Histogram } from 'prom-client';

const toolCallsCounter = new Counter({
  name: 'musashi_tool_calls_total',
  labelNames: ['tool', 'status']
});

const toolLatencyHistogram = new Histogram({
  name: 'musashi_tool_latency_seconds',
  labelNames: ['tool'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

**Dashboards**:
- Tool usage over time
- Latency percentiles (p50, p95, p99)
- Cache hit rates
- Error rates
- API call distribution

### 12.2 Medium-Term (3-6 months)

#### 12.2.1 ML-Based Matching

**Motivation**: Semantic understanding beyond keywords

**Approach**:

```typescript
// Sentence embeddings via OpenAI/Anthropic
import { embed } from '@anthropic/sdk';

async function semanticMatch(text: string, markets: Market[]) {
  const textEmbedding = await embed(text);

  const similarities = markets.map(market => {
    const marketEmbedding = embed(market.question);
    return cosineSimilarity(textEmbedding, marketEmbedding);
  });

  return markets.filter((_, i) => similarities[i] > 0.7);
}
```

**Training Data**:
- User clicks (implicit feedback)
- Manual labels (explicit feedback)
- Historical tweet-market pairs

#### 12.2.2 Historical Data

**Motivation**: Price charts, trend analysis

**Schema**:

```typescript
interface PriceHistory {
  marketId: string;
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

// Store in TimescaleDB
CREATE TABLE price_history (
  market_id TEXT,
  timestamp TIMESTAMPTZ,
  yes_price FLOAT,
  no_price FLOAT,
  volume FLOAT,
  PRIMARY KEY (market_id, timestamp)
);

CREATE INDEX ON price_history (market_id, timestamp DESC);
```

**New Tools**:

```typescript
// Get price chart
get_price_history({
  marketId: 'polymarket_0x123',
  timeframe: '30d',
  interval: '1h'
})

// Detect trends
detect_trends({
  marketId: 'polymarket_0x123',
  minChange: 0.1
})
```

#### 12.2.3 Portfolio Tracking

**Motivation**: Track positions across platforms

**Schema**:

```typescript
interface Position {
  userId: string;
  marketId: string;
  source: 'polymarket' | 'kalshi';
  outcome: 'yes' | 'no';
  shares: number;
  avgCost: number;
  currentValue: number;
  pnl: number;
}

// New tools
get_portfolio({ userId: 'user123' })
get_pnl({ userId: 'user123', timeframe: '7d' })
```

### 12.3 Long-Term (6-12 months)

#### 12.3.4 Custom Markets

**Motivation**: Create hypothetical markets for probability reasoning

**Design**:

```typescript
// Create custom market
create_custom_market({
  question: "Will my startup raise Series A in 2024?",
  description: "Based on current traction...",
  category: "startup",
  closeDate: "2024-12-31"
})

// Invite experts to bet
invite_experts({
  marketId: 'custom_xyz',
  emails: ['expert1@example.com', 'expert2@example.com']
})

// Get consensus
get_custom_market_consensus({
  marketId: 'custom_xyz'
})
```

**Backend**:
- PostgreSQL for custom markets
- Synthetic order book
- Private sharing (invite-only)

#### 12.3.5 Alert System

**Motivation**: Notify on market changes

**Design**:

```typescript
// Create alert
create_alert({
  type: 'price_change',
  marketId: 'polymarket_0x123',
  threshold: 0.1, // 10% change
  channel: 'email'
})

// Alert types
- price_change: Notify when price moves >X%
- arbitrage: Notify when arbitrage opportunity >Y%
- volume_spike: Notify when volume >Z× normal
- text_match: Notify when text matches market
```

**Delivery Channels**:
- Email (SMTP)
- Discord webhook
- Telegram bot
- Push notification (PWA)

#### 12.3.6 Social Features

**Motivation**: Community predictions, discussions

**Features**:

```typescript
// Share prediction
share_prediction({
  marketId: 'polymarket_0x123',
  prediction: 0.7,
  reasoning: "Because...",
  public: true
})

// Follow experts
follow_user({ userId: 'expert123' })

// Leaderboard
get_leaderboard({
  metric: 'brier_score',
  timeframe: '30d',
  limit: 50
})
```

---

## 13. Appendices

### 13.1 Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - Protocol for AI agents to access tools |
| **Signal** | Analysis result matching text to prediction market |
| **Arbitrage** | Price discrepancy between two markets for the same outcome |
| **Liquidity** | Available capital in a market (ease of trading) |
| **Volume** | Total trading activity (dollars traded) |
| **Brier Score** | Metric for probability forecast accuracy (lower is better) |
| **LRU Cache** | Least Recently Used cache eviction policy |
| **TTL** | Time To Live - How long cache entries remain valid |
| **Token Bucket** | Rate limiting algorithm using token accumulation |
| **stdio** | Standard input/output (communication channel) |
| **SSE** | Server-Sent Events (HTTP streaming protocol) |

### 13.2 References

#### 13.2.1 External Documentation

1. **Model Context Protocol**
   - Spec: https://modelcontextprotocol.io/specification
   - SDK: https://github.com/anthropics/mcp
   - Examples: https://github.com/anthropics/mcp-examples

2. **Polymarket API**
   - Docs: https://docs.polymarket.com/
   - Gamma API: https://gamma-api.polymarket.com/

3. **Kalshi API**
   - Docs: https://docs.kalshi.com/
   - Elections API: https://api.elections.kalshi.com/

4. **TypeScript**
   - Handbook: https://www.typescriptlang.org/docs/
   - Strict Mode: https://www.typescriptlang.org/tsconfig#strict

5. **Zod**
   - Docs: https://zod.dev/
   - Guide: https://github.com/colinhacks/zod

#### 13.2.2 Related Projects

1. **Musashi Chrome Extension**
   - Repo: https://github.com/MusashiBot/Musashi
   - Release Notes: `C:\Users\rotciv\Musashi\RELEASE_NOTES_v2.2.0.md`

2. **Claude Desktop**
   - Download: https://claude.ai/download
   - Config: https://docs.anthropic.com/claude/desktop

3. **Cursor IDE**
   - Website: https://cursor.sh/
   - Docs: https://docs.cursor.sh/

### 13.3 Change Log

#### v1.0.0 (2024-03-27) - Initial Release

**Added**:
- Complete MCP server implementation
- 8 tools (analyze_text, get_arbitrage, get_movers, etc.)
- 3 resources (markets/all, markets/trending, markets/category)
- 2 prompt templates (analyze, brief)
- Multi-tier LRU cache
- Token bucket rate limiting
- Polymarket + Kalshi API integration
- Smart matching with category priority
- Context-aware text analysis
- Sentiment analysis with negation
- Comprehensive error handling
- TypeScript strict mode
- Zod runtime validation

**Known Issues**:
- None (production ready)

**Future**:
- HTTP transport (SSE)
- Redis cache backend
- ML-based matching
- Historical data tracking

---

## Document Control

**Version**: 1.0.0
**Last Updated**: March 27, 2026
**Next Review**: June 27, 2026 (3 months)

**Approval**:
- Technical Lead: [Pending]
- Product Owner: [Pending]
- Security Review: [Pending]

**Distribution**:
- Engineering Team
- Product Team
- DevOps Team
- Documentation Portal

---

**END OF TECHNICAL DESIGN DOCUMENT**
