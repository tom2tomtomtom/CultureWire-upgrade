import type { ResearchSpec } from '../types';

const STYLE_GUIDE = `
WRITING STYLE:
- Write as a senior strategist briefing a client, not an academic writing a paper.
- Lead every point with the sharpest insight first. No throat-clearing.
- Short declarative sentences. Cut "suggests", "indicates", "it appears that".
- Bold the single most important stat or phrase in each point: **73%**, **4.2/5**, **12k mentions**.
- Prefer bullet points over paragraphs for any list of 3+ items.
- Use > blockquotes for standout verbatim quotes — one per theme max, with attribution.
- Section headings (##) must be opinionated insight titles, not generic labels.
  YES: "## Price Is the Battleground"
  NO:  "## Key Themes"
- Keep per-source analyses under 800 words.
`;

export function buildPerSourcePrompt(platform: string, spec: ResearchSpec): string {
  return `You are analyzing ${platform} data for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}

${STYLE_GUIDE}

Analyze the following data and produce these sections (use ## headings):

1. **Top-line Verdict** — 2-3 sentences, the single biggest story from this data.
2. **Key Themes** — 3-5 themes, each with a bold title + 2-3 bullet evidence points + one > blockquote with attribution.
3. **Sentiment Snapshot** — single-line summary: **X% positive**, **Y% negative**, Z% neutral. Then bullets for the strongest signals.
4. **Outliers & Surprises** — what broke the pattern. Brief bullets only.
5. **Data Gaps** — 1-3 bullets on what's missing or skewed.

Format as clean markdown. Be specific — cite actual data points, not generalizations.`;
}

export function buildCrossSourcePrompt(spec: ResearchSpec): string {
  return `You are performing cross-source analysis for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}

${STYLE_GUIDE}

You will receive per-source analyses from multiple platforms. Produce these sections (use ## headings):

1. **The Big Picture** — 3-4 sentences, the single narrative that emerges from all sources combined.
2. **Where Sources Agree** — converging signals with bold stats. What themes appear across multiple sources and how strong is the convergence?
3. **Where Sources Clash** — contradictions and why. Platform demographics, sampling bias, etc.
4. **Platform-Specific Wins** — one bold insight per platform that only that platform uniquely reveals.
5. **Answers to Research Questions** — address each key question directly. No hedging.
6. **Confidence Check** — how reliable are these findings? What would strengthen them?

Format as clean markdown with clear ## section headers.`;
}

export function buildStrategicNarrativePrompt(spec: ResearchSpec): string {
  return `You are writing the executive strategic summary for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}

${STYLE_GUIDE}

Additional directives:
- Start with the finding. Never start with "This analysis" or "Based on our research."
- The Executive Summary is the most important section. A CEO should read only that and walk away informed.
- Use --- horizontal rules between major sections for visual breathing room.
- Recommendations must start with an action verb.

Based on the cross-source analysis provided, write these sections (use ## headings):

1. **Executive Summary** — 3-4 sentences. The headline finding a senior decision-maker needs. This is the most important section.
2. **Key Insights** — 5-7 numbered insights, each with a bold title and 2-3 sentence explanation backed by evidence.
3. **Competitive Landscape** — where the brand/product stands relative to competitors based on the data.
4. **Audience Signals** — what the target audience actually says, thinks, and feels — with evidence.
5. **Strategic Recommendations** — 3-5 actionable recommendations. Each starts with an action verb. Clear rationale.
6. **White Space & Opportunities** — gaps in the market or unmet needs identified from the data.
7. **Risk Factors** — what could invalidate these findings, what to watch for.
8. **Suggested Next Steps** — what additional research would strengthen these conclusions.

Write for a senior decision-maker. Be direct, evidence-based, and actionable. No filler.`;
}
