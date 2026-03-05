import { getAnthropicClient } from '@/lib/anthropic';
import type { BrandContext } from '@/lib/types';

const BRAND_CONTEXT_PROMPT = `You are a brand intelligence analyst. Given a brand name, analyze it and return a structured brand context.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "category": "Primary industry category (e.g., Athletic Footwear, Fast Food, Streaming Entertainment)",
  "subcategory": "More specific niche",
  "brand_values": ["3-5 core brand values"],
  "brand_pillars": ["3-5 strategic pillars the brand is known for"],
  "tone": "Brand's communication tone in 2-3 words",
  "competitors": ["3-5 direct competitors"],
  "keywords": {
    "brand": ["5-8 brand-specific search terms including brand name, slogans, products, campaigns"],
    "category": ["5-8 category-level search terms for the industry/space"],
    "trending": ["5-8 trending/cultural terms adjacent to this brand's space"]
  }
}`;

export async function generateBrandContext(brandName: string): Promise<BrandContext> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Analyze this brand and generate brand context: "${brandName}"`,
    }],
    system: BRAND_CONTEXT_PROMPT,
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

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
