export type RTPLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface RTPAssessment {
  level: RTPLevel;
  score: number; // 0-100
  factors: {
    mention_quality: number; // 0-25
    sentiment: number; // 0-25
    cultural_fit: number; // 0-25
    engagement_safety: number; // 0-25
  };
  rationale: string;
}

/**
 * Classify a brand's Right to Play for a given trend/opportunity.
 * GREEN (75-100): Safe to engage, strong brand alignment
 * YELLOW (40-74): Proceed with caution, moderate risk
 * RED (0-39): Avoid, high risk or poor fit
 */
export function classifyRTP(factors: {
  mention_quality: number;
  sentiment: number;
  cultural_fit: number;
  engagement_safety: number;
}): RTPAssessment {
  const score = factors.mention_quality + factors.sentiment + factors.cultural_fit + factors.engagement_safety;

  let level: RTPLevel;
  let rationale: string;

  if (score >= 75) {
    level = 'GREEN';
    rationale = 'Strong brand alignment with positive sentiment and safe engagement context.';
  } else if (score >= 40) {
    level = 'YELLOW';
    rationale = 'Moderate brand fit — proceed with caution. Consider tone and timing carefully.';
  } else {
    level = 'RED';
    rationale = 'Poor brand fit or high-risk engagement context. Avoid or monitor only.';
  }

  return { level, score, factors, rationale };
}

/**
 * Build a Right to Play prompt for Claude to assess brand-trend fit.
 */
export function buildRTPAnalysisPrompt(brandName: string, brandContext: { category: string; brand_values: string[]; tone: string }): string {
  return `You are a brand safety analyst. Assess the "Right to Play" for ${brandName} with each cultural trend or opportunity.

Brand context:
- Category: ${brandContext.category}
- Values: ${brandContext.brand_values.join(', ')}
- Tone: ${brandContext.tone}

For each trend, score these factors 0-25:
1. **mention_quality**: How naturally does the brand fit this conversation? (25 = perfect fit, 0 = forced/irrelevant)
2. **sentiment**: Is the overall sentiment safe for brand association? (25 = very positive, 0 = toxic/controversial)
3. **cultural_fit**: Does this align with brand values and tone? (25 = perfect alignment, 0 = contradicts brand)
4. **engagement_safety**: Is it safe for the brand to visibly engage? (25 = zero risk, 0 = high PR risk)

Classify: GREEN (75-100), YELLOW (40-74), RED (0-39)

Return JSON array of assessments:
[{
  "trend_title": "...",
  "level": "GREEN|YELLOW|RED",
  "score": 0-100,
  "factors": { "mention_quality": 0-25, "sentiment": 0-25, "cultural_fit": 0-25, "engagement_safety": 0-25 },
  "rationale": "Brief explanation"
}]`;
}
