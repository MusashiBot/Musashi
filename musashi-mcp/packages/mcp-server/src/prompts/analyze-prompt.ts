/**
 * Analyze prompt template
 *
 * Helps agents analyze text and discover relevant markets
 */

export const analyzePromptTemplate = {
  name: 'analyze',
  description: 'Analyze text and find relevant prediction markets with detailed insights',
  arguments: [
    {
      name: 'text',
      description: 'Text to analyze (tweet, article, statement)',
      required: true,
    },
    {
      name: 'depth',
      description: 'Analysis depth: "quick" or "deep"',
      required: false,
    },
  ],
  template: (args: { text: string; depth?: string }) => {
    const isDeep = args.depth === 'deep';

    return `You are analyzing the following text to find relevant prediction markets and generate insights:

TEXT:
"""
${args.text}
"""

TASK:
1. Use the analyze_text tool to find relevant prediction markets
2. For each market found:
   - Explain why it's relevant to the text
   - Summarize the market question and current odds
   - Highlight key sentiment and context signals
${
  isDeep
    ? `3. Deep analysis (requested):
   - Compare signals across multiple markets
   - Identify consensus vs. divergence
   - Look for arbitrage opportunities (use get_arbitrage)
   - Check for trending related markets (use get_movers)
   - Provide probability calibration advice if predictions are mentioned`
    : ''
}

FORMAT YOUR RESPONSE AS:
# Analysis of: "${args.text.slice(0, 100)}${args.text.length > 100 ? '...' : ''}"

## Relevant Markets
[For each market, provide bullet points with insights]

## Key Insights
[Summarize the most important findings]

${isDeep ? '## Deep Analysis\n[Additional analysis from cross-referencing tools]\n' : ''}
Remember to explain your reasoning clearly and reference specific confidence scores and signals from the tools.`;
  },
};
