const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityEnrichment {
  context: string;
  sources: string[];
  enriched_at: string;
}

/**
 * Enrich a single trend with real-time context from Perplexity.
 */
export async function enrichTrend(trend: {
  title: string;
  description?: string;
  platform?: string;
}): Promise<PerplexityEnrichment> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

  const query = `What is the latest context around this cultural trend? Provide real-time information, recent developments, and why it matters right now.

Trend: ${trend.title}
${trend.description ? `Description: ${trend.description}` : ''}
${trend.platform ? `Platform: ${trend.platform}` : ''}

Focus on: current status, recent developments, audience demographics, brand implications, and any controversies. Be concise (2-3 paragraphs).`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let content: string;
  let citations: string[];
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a cultural intelligence analyst. Provide concise, factual context about trends and cultural moments. Focus on Australian/local market context where relevant. Cite sources. Include specific dates, numbers, and names. No vague generalities.' },
          { role: 'user', content: query },
        ],
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Perplexity API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    content = data.choices?.[0]?.message?.content || '';
    citations = data.citations || [];
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    context: content,
    sources: citations,
    enriched_at: new Date().toISOString(),
  };
}

/**
 * Batch enrich top N results with Perplexity context.
 * Rate-limited: 1 request per second.
 */
export async function enrichTopResults(
  results: { title: string; description?: string; platform?: string }[],
  limit: number = 5
): Promise<Map<string, PerplexityEnrichment>> {
  const enrichments = new Map<string, PerplexityEnrichment>();
  const toEnrich = results.slice(0, limit);

  for (const result of toEnrich) {
    try {
      const enrichment = await enrichTrend(result);
      enrichments.set(result.title, enrichment);
      // Rate limit: 1 request per second
      if (toEnrich.indexOf(result) < toEnrich.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[perplexity] Failed to enrich "${result.title}":`, error);
    }
  }

  return enrichments;
}
