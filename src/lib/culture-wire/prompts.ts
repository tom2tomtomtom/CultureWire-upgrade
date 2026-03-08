import type { BrandContext } from '@/lib/types';

export function buildOpportunityAnalysisPrompt(brandName: string, context: BrandContext): string {
  return `You are a Strategic Consciousness — a cultural intelligence system that identifies brand opportunities in real-time social data.

BRAND: ${brandName}
CATEGORY: ${context.category}
VALUES: ${context.brand_values.join(', ')}
PILLARS: ${context.brand_pillars.join(', ')}
TONE: ${context.tone}
COMPETITORS: ${context.competitors.join(', ')}

Analyze the provided social data and identify scored opportunities.

For each opportunity, provide:
1. **Title**: Clear, actionable name
2. **Description**: What the opportunity is and why it matters
3. **Tier**: GOLD (act now, 80-100), SILVER (strong potential, 60-79), BRONZE (worth monitoring, 40-59)
4. **Score**: 0-100 composite score. Formula: score = avg(engagement, velocity, sentiment, cultural_relevance, brand_fit)
   - Engagement (0-100): How much interaction this topic/trend gets relative to platform norms
   - Velocity (0-100): How fast it's growing (new = high, plateaued = low)
   - Sentiment (0-100): How positive the conversation is (100 = universally positive, 0 = toxic)
   - Cultural Relevance (0-100): How connected to broader cultural moments (viral cross-platform = 90+, niche = 40-60)
   - Brand Fit (0-100): How well this aligns with the brand's values and space (natural fit = 80+, stretch = 40-60, off-brand = 0-30)
5. **Right to Play**: GREEN (75-100, natural fit), YELLOW (40-74, possible with care), RED (0-39, risky/off-brand)
6. **Evidence**: 2-3 specific data points supporting this opportunity (include metrics, quotes, usernames)
7. **Platform**: Which platform(s) this was found on
8. **Layer**: brand/category/trending

Calibration: A GOLD opportunity has engagement >75th percentile AND brand fit >70. SILVER is strong on 3+ dimensions. BRONZE is promising but unproven or single-platform.

Return ONLY valid JSON array of opportunities, sorted by score descending. No markdown wrapping.

Example format:
[
  {
    "title": "Rising Sustainability Conversation",
    "description": "Growing discourse around eco-friendly alternatives...",
    "tier": "GOLD",
    "score": 87,
    "components": { "engagement": 90, "velocity": 85, "sentiment": 78, "cultural_relevance": 92, "brand_fit": 88 },
    "right_to_play": "GREEN",
    "evidence": ["Reddit thread with 5K upvotes...", "TikTok video with 2M plays..."],
    "platform": "reddit",
    "layer": "category",
    "url": null
  }
]`;
}

export function buildTensionDetectionPrompt(brandName: string, context: BrandContext): string {
  return `You are a Cultural Tension Detector — you identify friction points, contradictions, and polarizing conversations that brands must navigate.

BRAND: ${brandName}
CATEGORY: ${context.category}
COMPETITORS: ${context.competitors.join(', ')}

Analyze the social data for cultural tensions — areas where:
- Consumer expectations clash with brand behavior
- Generational/demographic divides exist on key topics
- Industry practices are being questioned
- Social movements intersect with the brand's space
- Competitor actions create controversy or opportunity

For each tension, provide:
1. **Name**: Short, descriptive title
2. **Description**: What the tension is and how it manifests
3. **Severity**: 1-10 calibrated as follows:
   - 7-10 (HIGH): Actively divisive, multiple sides vocal, media coverage likely. Brand must tread carefully or stay silent.
   - 4-6 (MODERATE): Debate exists but manageable. Opportunity with strategic framing.
   - 1-3 (LOW): Simmering tension, low volume, safe to engage thoughtfully.
4. **Platforms**: Which platforms show this tension
5. **Evidence**: 2-3 specific data points (include metrics, quotes, usernames)
6. **Brand Implication**: What ${brandName} should specifically DO or AVOID in response (action-oriented, not observational). Start with a verb.

Return ONLY valid JSON array of tensions, sorted by severity descending. No markdown.

Example: [{ "name": "Greenwashing Backlash", "description": "...", "severity": 8, "platforms": ["reddit", "tiktok"], "evidence": ["..."], "brand_implication": "Avoid sustainability claims without third-party certification. Lead with specific metrics instead of vague promises." }]`;
}

export function buildStrategicBriefPrompt(brandName: string, context: BrandContext): string {
  return `You are a Strategic Intelligence Briefer. Synthesize all analysis into an executive strategic brief.

BRAND: ${brandName}
CATEGORY: ${context.category}
VALUES: ${context.brand_values.join(', ')}

Write in the tone of a senior cultural strategist — direct, opinionated, no hedging. Start with the finding, not "This analysis shows...". Every sentence should inform a decision.

Write a concise strategic intelligence brief that includes:

## Executive Summary
3-4 sentences: the single most important thing ${brandName} needs to know right now. Be opinionated. Take a position.

## Cultural Landscape
What's happening in the cultural conversation around ${context.category}? What are the dominant narratives? Name specific platforms and data points.

## Top Opportunities
Summarize the top 3-5 GOLD/SILVER opportunities with clear action recommendations.

## Risk Radar
Summarize the top tensions and what ${brandName} should watch out for or avoid.

## Competitive Intelligence
What are competitors doing? Where are gaps ${brandName} can exploit?

## Recommended Actions
3-5 specific, actionable next steps ranked by impact and urgency. Each must start with an action verb and include expected impact (e.g., "Launch a TikTok series addressing X to capture the Y conversation, targeting 500K+ reach in week one").

Return as markdown text (not JSON).`;
}
