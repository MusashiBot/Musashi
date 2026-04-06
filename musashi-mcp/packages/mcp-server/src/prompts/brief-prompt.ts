/**
 * Brief prompt template
 *
 * Provides a daily briefing of prediction markets
 */

export const briefPromptTemplate = {
  name: 'brief',
  description: 'Generate a daily briefing of prediction markets and insights',
  arguments: [
    {
      name: 'categories',
      description: 'Comma-separated categories to focus on (e.g., "ai,crypto,politics")',
      required: false,
    },
    {
      name: 'format',
      description: 'Brief format: "executive" or "detailed"',
      required: false,
    },
  ],
  template: (args: { categories?: string; format?: string }) => {
    const categories = args.categories ? args.categories.split(',').map((c) => c.trim()) : undefined;
    const isDetailed = args.format === 'detailed';

    return `You are generating a daily briefing of prediction markets${categories ? ` focused on: ${categories.join(', ')}` : ''}.

TASK:
1. Use get_movers to find trending markets (biggest price movements)
2. ${categories ? `Filter for categories: ${categories.join(', ')}` : 'Focus on all active categories'}
3. Use search_markets to find high-liquidity markets in ${categories ? 'specified categories' : 'key categories'}
${isDetailed ? '4. Use get_arbitrage to find interesting price discrepancies\n5. Provide deeper context and analysis for each market' : ''}

FORMAT YOUR RESPONSE AS:
# Prediction Markets Daily Brief - ${new Date().toLocaleDateString()}

## 🚀 Trending Markets (Top Movers)
[List 5-10 markets with biggest movements, including:
- Market question
- Current probability
- Price change
- Why it matters]

## 💰 High-Confidence Markets
[List 3-5 liquid markets with interesting odds:
- Market question
- Current probability
- Liquidity level
- Key insight]

${
  isDetailed
    ? `## ⚡ Arbitrage Opportunities
[If found, list 2-3 cross-platform discrepancies:
- Market pair
- Price difference
- Potential profit
- Risk assessment]

## 🔍 Deep Dive
[Pick 1-2 markets for detailed analysis:
- Historical context
- What moved the market
- Expert opinions/signals
- Implications]
`
    : ''
}

## 📊 Summary Stats
[Provide overview:
- Total markets analyzed
- Average liquidity
- Top categories by volume
- Market sentiment (bullish/bearish)]

Keep the tone ${isDetailed ? 'analytical and detailed' : 'concise and actionable'}. Include specific probabilities and confidence scores.`;
  },
};
