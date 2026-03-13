import { NextRequest, NextResponse } from 'next/server';
import { getAllMarkets } from '@/lib/markets-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const timeframe = searchParams.get('timeframe') || '1h';
    const minChange = parseFloat(searchParams.get('minChange') || '0.05');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const platform = searchParams.get('platform') || undefined;

    // Validation
    if (!['1h', '24h'].includes(timeframe)) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeframe must be "1h" or "24h"',
        },
        { status: 400 }
      );
    }

    if (isNaN(minChange) || minChange < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'minChange must be a positive number',
        },
        { status: 400 }
      );
    }

    // Fetch live markets
    let markets = await getAllMarkets();

    if (markets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No markets available at this time.',
        },
        { status: 503 }
      );
    }

    // Filter by platform if specified
    if (platform) {
      if (!['polymarket', 'kalshi'].includes(platform)) {
        return NextResponse.json(
          {
            success: false,
            error: 'platform must be "polymarket" or "kalshi"',
          },
          { status: 400 }
        );
      }
      markets = markets.filter(m => m.platform === platform);
    }

    // For now, we'll use oneDayPriceChange as a proxy for price movement
    // In a production system, you'd track historical prices
    const movers = markets
      .filter(m => m.oneDayPriceChange != null && Math.abs(m.oneDayPriceChange) >= minChange)
      .map(m => {
        const priceChange24h = m.oneDayPriceChange || 0;
        const priceChange1h = timeframe === '1h' ? priceChange24h * 0.3 : priceChange24h; // Estimate
        const previousPrice = m.yesPrice - priceChange24h;
        const direction = priceChange24h > 0 ? 'up' : 'down';

        return {
          market: m,
          priceChange1h: +priceChange1h.toFixed(2),
          priceChange24h: +priceChange24h.toFixed(2),
          percentChange1h: `${(priceChange1h * 100).toFixed(1)}%`,
          percentChange24h: `${(priceChange24h * 100).toFixed(1)}%`,
          previousPrice: +previousPrice.toFixed(2),
          direction,
        };
      })
      .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
      .slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          movers,
          count: movers.length,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API] /api/markets/movers error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
