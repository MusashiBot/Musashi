import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets } from '@/lib/markets-cache';
import { detectArbitrage } from '@/lib/matcher/arbitrage';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const minSpread = parseFloat(searchParams.get('minSpread') || '0.03');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.50');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const category = searchParams.get('category') || undefined;

    // Validation
    if (isNaN(minSpread) || minSpread < 0 || minSpread > 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'minSpread must be between 0.0 and 1.0',
        },
        { status: 400 }
      );
    }

    // Fetch live markets
    const markets = await getAllMarkets();

    if (markets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No markets available at this time.',
        },
        { status: 503 }
      );
    }

    // Detect arbitrage
    let opportunities = detectArbitrage(markets, minSpread);

    // Filter by confidence
    opportunities = opportunities.filter(opp => opp.matchConfidence >= minConfidence);

    // Filter by category if specified
    if (category) {
      opportunities = opportunities.filter(opp => opp.category === category);
    }

    // Apply limit
    opportunities = opportunities.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          opportunities,
          count: opportunities.length,
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
    console.error('[API] /api/markets/arbitrage error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
