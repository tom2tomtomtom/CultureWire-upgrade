import { callAnthropicWithFallback } from '@/lib/anthropic';
import type { BrandContext } from '@/lib/types';

const GEO_LABELS: Record<string, string> = {
  AU: 'Australia',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  NZ: 'New Zealand',
};

function buildBrandContextPrompt(geo: string): string {
  const market = GEO_LABELS[geo] || geo;
  return `You are a brand intelligence analyst specializing in the ${market} market.

Given a brand name, analyze it specifically for the ${market} market context. Competitors, keywords, and cultural references must be relevant to ${market} consumers.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "category": "Primary industry category (e.g., Athletic Footwear, Fast Food, Streaming Entertainment)",
  "subcategory": "More specific niche",
  "brand_values": ["3-5 core brand values"],
  "brand_pillars": ["3-5 strategic pillars the brand is known for"],
  "brand_positioning": "One sentence: how the brand positions itself vs competitors (e.g., 'The affordable premium option for health-conscious millennials')",
  "tone": "Brand's communication tone in 2-3 descriptive words (e.g., 'playful, irreverent', 'premium, authoritative', 'warm, community-driven')",
  "competitors": ["5-7 direct competitors that actually operate in ${market} - do NOT include competitors that don't have a presence in this market"],
  "keywords": {
    "brand": ["5-8 brand-specific search terms. MUST include the exact brand name as the first keyword. Include brand name + product combinations, official hashtags, and campaign slogans. Do NOT include generic industry terms - every keyword must contain the brand name or be uniquely identifiable to this brand (e.g., for Officeworks: 'Officeworks', 'Officeworks back to school', '#officeworks', 'Officeworks price beat guarantee', NOT 'office supplies' or 'stationery')"],
    "category": ["5-8 category-level search terms for the industry/space in ${market}"],
    "trending": ["5-8 trending/cultural terms adjacent to this brand's space in ${market}"]
  }
}`;
}

export async function generateBrandContext(brandName: string, geo: string = 'AU'): Promise<BrandContext> {
  const market = GEO_LABELS[geo] || geo;

  const text = await callAnthropicWithFallback(
    buildBrandContextPrompt(geo),
    `Analyze this brand for the ${market} market and generate brand context: "${brandName}"`,
    2048,
  );

  try {
    return JSON.parse(text) as BrandContext;
  } catch {
    // Try to extract JSON from potential markdown wrapping
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as BrandContext;
    }
    throw new Error(`Failed to parse brand context: ${text.slice(0, 200)}`);
  }
}
