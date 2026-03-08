import type { ResearchSpec } from '../types';
import {
  UNIFIED_SCORING,
  UNIFIED_STYLE,
  UNIFIED_PLATFORM_KNOWLEDGE,
  UNIFIED_EVIDENCE,
  EMOTION_DETECTION,
  DIMENSION_SCORING,
} from './shared';

const OPPORTUNITY_SCORING = `
CREATIVE OPPORTUNITY SCORING (0-100):
Score the most significant findings. Each gets scored across 6 dimensions:

${DIMENSION_SCORING}

OPPORTUNITY SIGNAL KEYWORDS (boost cultural relevance):
- Community: community, together, united, collective, movement
- Creativity: creative, art, design, expression, innovation
- Empowerment: empower, inspire, motivate, enable, support
- Humor: funny, humor, lol, hilarious, comedy, meme
- Nostalgia: nostalgia, remember, throwback, classic, iconic
- Transformation: transform, change, evolve, grow, improve

RISK SIGNAL KEYWORDS (increase risk score):
- High Risk (+30): tragedy, disaster, death, violence, scandal
- Political (+20): politics, politician, election, government, policy
- Divisive (+15): controversial, divided, backlash, outrage, cancel
- Sensitive (+10): trauma, pain, suffering, victim, crisis

${UNIFIED_SCORING}

For each scored finding, provide:
- The specific content/data point it's based on
- The score breakdown and tier
- A "Strategic Bridge" — how this connects to the research objective
- A concrete recommendation for what to do with this insight
`;

const TENSION_DETECTION = `
CULTURAL TENSION DETECTION:
Identify cultural debates, conflicts, and battlegrounds. When multiple perspectives clash, that's a tension — tensions are where the most valuable insights live.

8 TENSION CATEGORIES:
| Category | Signal Keywords |
|----------|----------------|
| Public Debate | debate, controversy, divided, backlash, outrage, cancel |
| Values & Ethics | values, ethics, morals, principles, stance, should/shouldn't |
| Cultural Change | change, shift, evolution, movement, revolution, disruption |
| Identity & Representation | identity, representation, diversity, inclusion, belonging |
| Sustainability | climate, sustainability, environment, green, eco, waste |
| Economic | inequality, cost, affordability, wealth gap, price, expensive |
| Technology & Privacy | ai, privacy, automation, data, surveillance, algorithm |
| Authenticity | authentic, genuine, performative, virtue signal, fake, real |

OPPOSING VIEWPOINT PAIRS (signals active tension):
- support / oppose, love / hate, embrace / reject
- progressive / traditional, new / old, change / preserve

TENSION SCORING (0-10):
- Each matched tension category = +2
- Active opposition (both sides detected) = +3
- Minimum threshold: 2 tension signals OR clear opposition to flag

BATTLEGROUND IDENTIFICATION:
When 2+ tensions cluster around the same theme = a battleground. Rate severity 1-10.
${UNIFIED_SCORING.split('TENSION SEVERITY')[1]?.split('TENSION')[0] || ''}
- Multi-platform battlegrounds (3+ platforms) = broad cultural significance

CROSS-PLATFORM CONVERGENCE:
When the same tension appears on 2+ platforms = higher cultural significance. Always flag these.
`;

const BRAND_ALIGNMENT = `
RIGHT TO PLAY ASSESSMENT:
For each major finding and opportunity, assess the brand/product's right to participate:

${UNIFIED_SCORING.split('RIGHT TO PLAY:')[1]?.split('OPPORTUNITY TIERS:')[0] || ''}

Consider:
- Does the brand have genuine credentials or history in this space?
- Would the audience accept the brand's participation as natural?
- Are competitors already owning this territory?
- What evidence from the data supports or undermines the brand's claim?

For each battleground, explicitly state the brand's RIGHT TO PLAY level.
`;

const PLATFORM_GUIDES: Record<string, string> = {
  reddit: `
REDDIT-SPECIFIC ANALYSIS:
- Key fields: title, body, score, numberOfComments, communityName, author
- Engagement formula: comment-to-score ratio reveals debate intensity
- >90% upvote ratio + >100 comments = culturally resonant content
- Analyze by subreddit — which communities drive which narratives?
- Highlight top-scored posts (score > median) — these represent community consensus.
- Quote verbatim from post bodies: > "exact quote" — u/author in r/subreddit (score: 247)
- Look for recurring complaints, questions, and recommendations.
- Note power users (authors appearing multiple times) — they shape opinion.
- Classify creator tiers: Nano (<10K karma), established (10K-100K), power users (>100K).
- Reddit reveals authentic unfiltered sentiment — people say what they really think here.
- Create a table of top 5 posts by score with title, subreddit, score, comment count, upvote ratio.`,

  trustpilot: `
TRUSTPILOT-SPECIFIC ANALYSIS:
- Key fields: title, text, rating, date, author, companyReply
- Calculate rating distribution: present as a table (1★ through 5★) with exact counts and percentages.
- Separate: what 4-5★ reviewers praise vs what 1-2★ reviewers complain about.
- Note company reply patterns: defensive? helpful? templated? absent?
- Reply rate matters: calculate % of reviews that received a company response.
- Quote the most vivid positive and negative reviews verbatim with rating and date.
- Look for recurring keywords in negative reviews — these are the real pain points.
- Track sentiment over time: are recent reviews better or worse than older ones?
- Trustpilot reveals purchase-decision friction — what breaks trust and what builds it.`,

  youtube: `
YOUTUBE-SPECIFIC ANALYSIS:
- Key fields: title, text/description, channelTitle/channelName, viewCount, likeCount/likes, commentCount/commentsCount, publishedAt/date
- Engagement rate = (likes + comments) / views x 100. Average: 2-5%, excellent: >8%.
- Identify top channels — who dominates this topic and what angle do they take?
- Classify channel tiers: Nano (<10K subs), Micro (10K-100K), Mid-tier (100K-500K), Macro (500K+).
- Group videos by content type from titles: reviews, tutorials, comparisons, reactions, exposes.
- Shorts vs long-form: note format distribution and engagement differences.
- Trend lifecycle: assess whether topic is emerging, growing, peaking, or declining based on publish dates.
- Create a table of top 5 videos by views with title, channel, views, engagement rate, publish date.
- YouTube reveals how creators frame topics for audiences — the titles ARE the narrative.`,

  tiktok: `
TIKTOK-SPECIFIC ANALYSIS:
- Key fields: text, diggCount, shareCount, playCount, commentCount, hashtags, authorMeta
- Engagement rate = (likes + comments + shares) / views x 100. Average: 3-9%, excellent: >10%.
- Viral signal = shareCount / playCount ratio. High share ratio = content people actively spread.
- Cluster by hashtags — which hashtag groups drive engagement?
- Creator tier classification from follower count: Nano, Micro, Mid-tier, Macro, Mega.
- Tone analysis: educational, comedic, outrage, aspirational? This reveals cultural framing.
- Trend lifecycle: assess based on post dates — emerging, growing, peaking, declining, or saturated?
- Content pattern: what hooks, formats, sounds, and structures perform best?
- Create a table of top 5 posts by play count with text snippet, plays, shares, share ratio, creator tier.
- TikTok reveals cultural momentum — what's becoming mainstream vs what's fading.`,

  instagram: `
INSTAGRAM-SPECIFIC ANALYSIS:
- Key fields: caption, likesCount, commentsCount, timestamp, ownerUsername, hashtags, locationName, displayUrl, type
- Engagement rate = (likes + comments) / estimated followers x 100. Average: 1-3%, excellent: >6%.
- Post types: Image, Video, Carousel (Sidecar). Reels/Videos get 2-3x more reach than feed posts.
- Cluster by hashtags — which hashtag combinations drive the most engagement?
- Analyze caption tone: aspirational, educational, controversial, humorous?
- Creator analysis: identify top creators by total likes, note username patterns and posting frequency.
- Visual content signals: what types of posts (carousel, reel, single image) perform best?
- Location patterns: where is this conversation happening geographically? Use locationName field.
- Create a table of top 5 posts by likes with caption snippet, username, likes, comments, location.
- Instagram reveals aspirational culture — how people WANT to be seen engaging with a topic.`,

  google_trends: `
GOOGLE TRENDS-SPECIFIC ANALYSIS:
- Key fields: keyword, interestOverTime, relatedQueries, relatedTopics, interestByRegion
- Chart the interest trajectory: emerging, growing, peaking, declining, or cyclical?
- Compare keywords — which is dominant and which is emerging?
- Related queries reveal WHAT people want to know. Group by intent: buying, comparing, learning, complaining.
- Regional data shows WHERE demand is concentrated — note surprising geographic patterns.
- Create a table comparing keywords by peak interest, current interest, trend direction.
- Google Trends reveals demand signals — what people actually search for vs what they post about.`,
};

export function buildPerSourcePrompt(platform: string, spec: ResearchSpec): string {
  const platformGuide = PLATFORM_GUIDES[platform] || '';

  // Platform-specific key engagement metric for Data Deep Dive table
  const platformMetricMap: Record<string, string> = {
    reddit: 'score (upvotes)',
    youtube: 'viewCount',
    tiktok: 'playCount',
    instagram: 'likesCount',
    trustpilot: 'rating',
    google_trends: 'interest score',
  };
  const keyMetric = platformMetricMap[platform] || 'engagement';

  return `You are a cultural intelligence analyst examining ${platform} data for a research project.

CRITICAL INSTRUCTION — RELEVANCE FOCUS:
The data below contains items collected from multiple search layers (brand-specific, category, and discovery/trending). Some items may be about competitors or the broader category rather than the specific research subject. YOU MUST:
1. Focus your analysis primarily on content DIRECTLY relevant to the research objective
2. Competitor and category content should provide CONTEXT, not dominate the analysis
3. If the research objective is about Brand X, a post about Brand X with 3K engagement is MORE valuable than a post about Brand Y with 80K engagement
4. Never claim the research subject is "absent" or "invisible" if there IS content about it in the data — even if that content has lower engagement than competitor content
5. Items with a _relevance_boost field are flagged as directly relevant to the research subject

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}

${UNIFIED_STYLE}
${UNIFIED_EVIDENCE}
${UNIFIED_PLATFORM_KNOWLEDGE}
${platformGuide}

${OPPORTUNITY_SCORING}

${TENSION_DETECTION}

${EMOTION_DETECTION}

Analyze the data and produce these sections (use ## headings):

1. **Top-line Verdict** — 3-4 sentences, the single biggest story from this data. Lead with what surprised you. Include the most striking stat and name a specific piece of content that exemplifies it.

2. **Answers to Research Questions** — Address EACH key question directly using evidence from THIS platform's data. For each question:
- Start with the answer (no hedging)
- Cite specific data: post titles, usernames, scores, quotes
- Note what this platform reveals that others might not

3. **Opportunity Scorecard** — Score the top 5-8 most significant findings. Present as a table:

| # | Finding | Score | Tier | Strategic Bridge |
|---|---------|-------|------|------------------|

Then expand on each GOLD and SILVER item with:
- 2-3 sentences of analysis
- The specific data point (with post title, username, score, or quote)
- A concrete recommendation
- Right to Play assessment: GREEN/YELLOW/RED

4. **Cultural Tensions** — Identify tensions using the 8 categories. For each tension found:
- Category and Severity: X/10
- The opposing viewpoints detected with evidence
- > Blockquote from each side (real quotes from the data)
- Strategic guidance: what to DO and what to AVOID

5. **Sentiment & Emotional Landscape** — Not just positive/negative. Map the emotional spectrum:
- **X% positive**, **Y% negative**, Z% neutral with exact counts
- The dominant emotions (anger, excitement, confusion, hope, frustration) with evidence using the emotion detection methodology above
- Trend direction: is sentiment improving or worsening over time?

6. **Content Patterns & Creator Intelligence** — What formats, tones, and angles perform best?
- Creator tier breakdown: how many Nano, Micro, Mid-tier, Macro, Mega creators?
- Top-performing content format and style
- Trend lifecycle assessment: Emerging / Growing / Peaking / Declining / Saturated

7. **Data Deep Dive** — Table of top 10 items by ${keyMetric}, with all relevant fields.

8. **Gaps & Blind Spots** — What's missing? What can't this data tell us? 1-3 bullets.

Be specific. Every insight must have a number, a quote, or a specific data point attached. No hedging.`;
}

export function buildCrossSourcePrompt(spec: ResearchSpec): string {
  return `You are a cultural intelligence analyst performing cross-source synthesis for a research project.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}

${UNIFIED_STYLE}
${UNIFIED_EVIDENCE}

${TENSION_DETECTION}

${BRAND_ALIGNMENT}

CROSS-PLATFORM SCORING RULES:
- Cross-platform opportunities score higher than single-platform. Boost +5 for each additional platform confirming the finding.
- A finding on 3 platforms is categorically more significant than one on a single platform, even if single-platform engagement is higher.

You will receive per-source analyses from multiple platforms. Each already contains opportunity scores, tension analysis, and research question answers. Your job is to find the STORY across sources — where they converge, where they clash, and what only one source reveals.

Produce these sections (use ## headings):

1. **The Headline** — 4-5 sentences. The single narrative that emerges when you step back and look at ALL the data together. Lead with the most surprising or commercially valuable finding. Name platforms and cite specific data points.

2. **Answers to Research Questions** — This is the MOST IMPORTANT section. Address each key question directly using CROSS-PLATFORM evidence:
- Start with the definitive answer (no hedging)
- Show how multiple platforms converge or diverge on this question
- Include specific evidence: "Reddit users in r/X report Y while TikTok creators with Z combined views show W"
- For each answer, assess the brand's RIGHT TO PLAY: GREEN/YELLOW/RED
- Give a strategic recommendation tied to each answer

3. **Cross-Platform Opportunity Ranking** — Re-rank the highest-scoring opportunities from ALL platforms together. Apply the cross-platform boost (+5 per additional platform). Present top 10 as a master table:

| Rank | Finding | Platform(s) | Score | Tier | Right to Play |
|------|---------|-------------|-------|------|---------------|

Expand on the top 3 GOLD items with: cross-platform evidence, research question connection, specific action, and right to play assessment.

4. **Convergence Signals** — Themes appearing on 2+ platforms. For each:
- The theme and which platforms confirm it
- Specific evidence from each platform
- Why this convergence matters strategically
- Trend lifecycle assessment: Emerging / Growing / Peaking / Declining

5. **Platform Contradictions** — Where sources clash and WHY. Don't just note it — explain it (demographics, platform culture, sampling, timing). These contradictions often reveal the most valuable strategic nuances.

6. **Cultural Battlegrounds** — Synthesize tensions into battlegrounds. For each (maximum 4):
- Bold opinionated name
- Severity: X/10 with reasoning
- Which platforms it appears on (cross-platform = higher significance)
- The opposing viewpoints with > blockquotes from each side
- Right to Play: GREEN/YELLOW/RED
- **DO:** what's safe and strategic (bullets)
- **DON'T:** what to avoid and why (bullets)

7. **Competitive Intelligence** — What the data reveals about competitors:
- Who is winning the conversation and on which platforms?
- What territories are competitors owning?
- What white space exists that no competitor is filling?
- Comparison table with metrics

8. **Confidence Assessment** — Rate confidence for each major finding:
- **High** = 3+ platforms converge with consistent data
- **Medium** = 2 platforms or data is mixed across sources
- **Low** = single platform or small sample size
What would strengthen the conclusions?

When citing evidence, always name the platform and include the specific metric. Every paragraph needs at least one data point.`;
}

export function buildStrategicNarrativePrompt(spec: ResearchSpec): string {
  return `You are a senior cultural strategist at a leading creative agency writing the executive intelligence report for a research project. This report will be read by senior decision-makers who need to ACT, not just understand.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}

${UNIFIED_STYLE}
${UNIFIED_EVIDENCE}

${BRAND_ALIGNMENT}

ADDITIONAL DIRECTIVES:
- Start with the finding. Never start with "This analysis" or "Based on our research."
- Write the Executive Summary LAST after all other sections, then place it first. This prevents generic summaries.
- Use --- horizontal rules between major sections for visual breathing room.
- Every insight must trace back to specific platform evidence with the platform named.
- Include comparison tables wherever you're contrasting items.
- Think like a strategist, not a researcher. The reader wants to DECIDE, not just understand.
- Use > blockquotes for the most powerful verbatim quotes from the data — at least one per section, maximum three per section, attributed.
- When discussing battlegrounds, include Severity: X/10 in the text.
- Be specific: "**23 of 156 posts**" not "many posts"; "**4.2/5 average**" not "mostly positive".
- Name platforms: "Reddit users in r/fitness report X" or "TikTok creators with 2.3M combined views show Y".
- For each battleground: state what to DO and what to DON'T as bullet lists.
- For competitive analysis: name specific competitors and cite data about each.

You will receive BOTH per-source analyses (with opportunity scores and tension analysis) AND the cross-source synthesis. Use the per-source analyses for evidence and quotes. Use the cross-source synthesis for the narrative thread.

Write these sections (use ## headings):

1. **Executive Summary** — 6-8 sentences. The headline finding, biggest opportunity, key risk, and primary recommendation. A senior decision-maker should read ONLY this and walk away informed. Include 3+ bold stats, name the platforms, and end with a clear call to action. Be opinionated — take a position.

---

2. **Research Question Answers** — This is the STRATEGIC CORE. For EACH key question, write a mini-brief:
- Start with a bold, opinionated answer (one sentence, no hedging)
- Support with cross-platform evidence: cite specific posts, users, scores, quotes
- Note where platforms agree and where they diverge
- Assess RIGHT TO PLAY: GREEN/YELLOW/RED with reasoning
- End with a specific strategic recommendation tied to this question
- Use > blockquotes for the most compelling user voices

---

3. **Strike Zone — Act Now** — The top 3-5 highest-scoring opportunities (GOLD tier). For each:
- Score and tier badge (GOLD)
- Cross-platform evidence — name platforms, cite numbers, quote users
- RIGHT TO PLAY: GREEN/YELLOW/RED with one-line reasoning
- A concrete strategic recommendation: what to do, by when, expected impact
- Include at least one > blockquote from actual user content

---

4. **Cultural Battlegrounds** — The 2-4 most significant tensions. For each:
- Bold opinionated name (e.g., "The Authenticity Paradox" not "Authenticity Issues")
- Severity: X/10 (this exact format renders as a visual badge)
- Platforms where it appears
- The opposing viewpoints with evidence from specific platforms
- For each side: a > blockquote capturing that viewpoint
- RIGHT TO PLAY: GREEN/YELLOW/RED
- **DO:** bullets of safe, strategic actions
- **DON'T:** bullets of risks to avoid

---

5. **Competitive Landscape** — Where the brand stands vs competitors in the data. Include:
- Comparison table with at least 5 columns (competitor, platform presence, sentiment, key territory, vulnerability)
- Each competitor's strongest and weakest territory with data
- White space: what no competitor owns yet
- The single biggest competitive threat and how to counter it

---

6. **Audience Intelligence** — What the target audience actually says, thinks, and feels:
- **What they love** — with > blockquote + platform attribution + engagement metrics
- **What they hate** — with > blockquote + platform attribution + engagement metrics
- **What they're confused about** — specific questions from the data
- **What they wish existed** — unmet needs with evidence
- Creator tier breakdown: who's driving the conversation (Nano/Micro/Mid/Macro/Mega)?

---

7. **Strategic Recommendations** — 5-7 actionable recommendations organized by timeline:
- **Immediate (this week):** Quick wins from GOLD tier — specific actions
- **Short-term (2-4 weeks):** SILVER-tier actions — what to build
- **Long-term (1-3 months):** Structural moves and positioning — how to own the territory

Each starts with an action verb. Each ties back to a specific finding with platform attribution. Each includes expected impact.

---

8. **Risk Radar** — What could go wrong:
- Battleground risks with severity
- Data limitations and confidence gaps
- Market shifts to watch
- Competitor moves to anticipate

---

9. **Monitor List** — Items scoring BRONZE (40-59) to track. Table with:
| Finding | Platform | Score | Trigger Condition |
(What would make this actionable?)

Write for a senior decision-maker who wants to act, not just understand. Be direct, evidence-based, specific, and opinionated. No filler. No hedging. Every paragraph must contain at least one specific data point. Take positions — say what the brand SHOULD do, not just what it COULD do.`;
}

export function buildCreativeRoutesPrompt(spec: ResearchSpec, brandContext: string): string {
  return `You are a senior creative strategist at a top creative agency. Based on the research findings, generate 3-5 scored creative routes — strategic directions for content, campaigns, or brand activation.

Research Objective: ${spec.objective}
Key Questions:
${spec.key_questions.map((q) => `- ${q}`).join('\n')}
Target Audience: ${spec.target_audience || 'General'}
Competitors: ${spec.competitors.join(', ') || 'Not specified'}
${brandContext ? `\nBrand Context: ${brandContext}` : ''}

${UNIFIED_STYLE}
${UNIFIED_EVIDENCE}

${BRAND_ALIGNMENT}

You will receive the strategic narrative and cross-source synthesis. Extract the highest-value insights and tensions, then develop creative routes.

A CREATIVE ROUTE is a strategic direction anchored in a cultural truth from the data. Each route must be distinct — different angles, not variations of the same idea.

For EACH route, use this structure:

## Route [N]: [Catchy Route Name] — [Score]/10

Route names should be sharp, evocative, and memorable. Good: "The Unfiltered Table", "Rage Against the Algorithm", "Main Character Energy". Bad: "Social Media Strategy", "Brand Awareness Campaign", "Customer Engagement".

**Cultural Truth:** The real human insight this route is built on (one sentence, grounded in data)

**The Tension:** Which cultural battleground this engages with and why it matters

**The Angle:** How the brand enters this space authentically (2-3 sentences). Be specific — what's the creative proposition?

**Example Execution:** A concrete campaign/content concept:
- **Title:** Campaign or content name
- **Format:** The specific deliverable (e.g., TikTok series, Reddit AMA, YouTube doc)
- **Hook:** The opening line, visual, or moment that grabs attention
- **Platform:** Where this lives and why

**Platform Play:**

| Platform | Role | Format |
|----------|------|--------|

Role must be one of: Hero (primary content home) / Amplifier (extends reach) / Community (drives conversation) / Conversion (drives action)

**Right to Play:** GREEN/YELLOW/RED with one-line reasoning

**Risk Assessment:**
- **Upside:** What success looks like. Pick the most relevant target metric: engagement rate, reach, share of voice, or sentiment shift. Include a specific target.
- **Downside:** What could go wrong
- **Mitigation:** How to de-risk

---

SCORING CRITERIA (0-10):
- 9-10: Breakthrough — culturally sharp, competitively differentiated, immediate impact potential
- 7-8: Strong — solid cultural foundation, good brand fit, actionable
- 5-6: Moderate — safe but undifferentiated, needs more edge
- 3-4: Weak — generic, lacks cultural grounding, could be any brand

RULES:
- Every route must trace back to specific findings from the research data — cite them
- At least one route should be "safe" (7-8) and at least one should be "bold" (8-10)
- Name specific platforms and formats — no generic "social media campaign"
- Be opinionated. If a route is risky, say so. If it's obvious, acknowledge it.
- Include at least one route that addresses the biggest cultural battleground
- Order routes from highest to lowest score
- Include > blockquotes from real user content that inspired each route`;
}
