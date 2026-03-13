import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets } from '@/lib/markets-cache';
import { KeywordMatcher } from '@/lib/matcher/keyword-matcher';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, minConfidence = 0.25, maxResults = 5 } = body;

    // Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid "text" field in request body.',
        },
        { status: 400 }
      );
    }

    if (typeof minConfidence !== 'number' || minConfidence < 0 || minConfidence > 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'minConfidence must be between 0.0 and 1.0',
        },
        { status: 400 }
      );
    }

    // Fetch live markets from Kalshi + Polymarket
    const markets = await getAllMarkets();

    if (markets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No markets available at this time. Please try again later.',
        },
        { status: 503 }
      );
    }

    // Match text to markets
    const matcher = new KeywordMatcher(markets, minConfidence, maxResults);
    const matches = matcher.match(text);

    return NextResponse.json(
      {
        success: true,
        data: {
          markets: matches,
          matchCount: matches.length,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API] /api/analyze-text error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
