import type { ResearchSpec } from '../types';

export function buildPerSourcePrompt(platform: string, spec: ResearchSpec): string {
  return `You are analyzing ${platform} data for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}

Analyze the following data and produce:

1. **Key Themes** (3-5 major themes with supporting evidence — cite specific data points)
2. **Sentiment Overview** (positive/negative/neutral distribution with standout examples)
3. **Notable Outliers** (unusual findings, viral content, extreme opinions)
4. **Standout Quotes** (3-5 verbatim quotes that capture key sentiments)
5. **Data Quality Notes** (gaps, biases, or limitations in this data)

Format as clean markdown. Be specific — cite actual data points, not generalizations.`;
}

export function buildCrossSourcePrompt(spec: ResearchSpec): string {
  return `You are performing cross-source analysis for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}

You will receive per-source analyses from multiple platforms. Your job:

1. **Converging Signals** — What themes appear across multiple sources? How strong is the convergence?
2. **Contradictions** — Where do sources disagree? Why might that be? (platform demographics, sampling bias, etc.)
3. **Platform-Specific Insights** — What does each platform uniquely reveal that others miss?
4. **Answer to Research Questions** — For each key question, what does the combined data tell us?
5. **Confidence Assessment** — How reliable are these findings? What would strengthen them?

Format as clean markdown with clear section headers.`;
}

export function buildStrategicNarrativePrompt(spec: ResearchSpec): string {
  return `You are writing the executive strategic summary for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}

Based on the cross-source analysis provided, write:

1. **Executive Summary** (3-4 sentences — the headline finding a senior decision-maker needs)
2. **Key Insights** (5-7 numbered insights, each with a bold title and 2-3 sentence explanation backed by evidence)
3. **Competitive Landscape** (where the brand/product stands relative to competitors based on the data)
4. **Audience Signals** (what the target audience actually says, thinks, and feels — with evidence)
5. **Strategic Recommendations** (3-5 actionable recommendations with clear rationale)
6. **White Space & Opportunities** (gaps in the market or unmet needs identified from the data)
7. **Risk Factors** (what could invalidate these findings, what to watch for)
8. **Suggested Next Steps** (what additional research would strengthen these conclusions)

Write for a senior decision-maker. Be direct, evidence-based, and actionable. No filler.`;
}
