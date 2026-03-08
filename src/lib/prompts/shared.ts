/**
 * Unified prompt constants — single source of truth for scoring, style, and evidence.
 * Import these into synthesizer.ts and culture-wire prompts to eliminate drift.
 */

export const UNIFIED_SCORING = `
SCORING CONSTANTS (use these exact thresholds everywhere):

RIGHT TO PLAY:
| Level  | Score  | Meaning |
|--------|--------|---------|
| GREEN  | 75-100 | Strong right to play — authentic connection to the topic |
| YELLOW | 40-74  | Conditional — needs careful strategic framing to credibly engage |
| RED    | 0-39   | Weak right to play — risk of appearing opportunistic or inauthentic |

Calibration: GREEN = the brand has genuine credentials or history here and the audience would accept its participation as natural. YELLOW = the brand can credibly enter with the right angle but needs strategic framing. RED = audience would question why this brand is here.

OPPORTUNITY TIERS:
| Tier   | Score  | Action |
|--------|--------|--------|
| GOLD   | 80-100 | High-value — act on this immediately |
| SILVER | 60-79  | Strong potential — worth pursuing with strategy |
| BRONZE | 40-59  | Worth monitoring — not ready to act yet |
| SKIP   | 0-39   | Low priority — focus elsewhere |

Calibration: GOLD = engagement >75th percentile AND brand fit >70. SILVER = strong on 3+ dimensions. BRONZE = promising but unproven or single-platform.

TENSION SEVERITY (1-10):
| Level    | Score | Meaning |
|----------|-------|---------|
| HIGH     | 7-10  | Actively divisive, multiple sides vocal, media coverage likely |
| MODERATE | 4-6   | Debate exists but manageable, opportunity with strategic framing |
| LOW      | 1-3   | Simmering tension, low volume, safe to engage thoughtfully |
`;

export const UNIFIED_STYLE = `
WRITING STYLE:
- Write as a senior cultural strategist briefing a client, not an academic writing a paper.
- Lead every point with the sharpest insight first. No throat-clearing.
- Short declarative sentences. Cut "suggests", "indicates", "it appears that".
- Bold the single most important stat or phrase in each point: **73%**, **4.2/5**, **12k mentions**.
- Prefer bullet points over paragraphs for any list of 3+ items.
- Use > blockquotes for standout verbatim quotes — one per theme max, with attribution.
- Section headings (##) must be opinionated insight titles, not generic labels.
  YES: "## Price Is the Battleground"
  NO:  "## Key Themes"

EVIDENCE REQUIREMENTS:
- Every claim must cite a specific data point: a number, a quote, a post title, a username, a date.
- When referencing volume, give the actual count: "mentioned in **23 of 156 posts**", not "frequently mentioned".
- When referencing sentiment, give the ratio: "**4:1 negative to positive**", not "mostly negative".
- Include at least one markdown table (| col | col |) per analysis when comparing items.
`;

export const UNIFIED_PLATFORM_KNOWLEDGE = `
PLATFORM ENGAGEMENT BENCHMARKS:

TikTok:
- Engagement rate = (likes + comments + shares) / views x 100
- 3-9% is average, >10% is excellent
- Viral signal = share-to-view ratio. High share ratio = content people actively spread.
- Content lifecycle: 2-7 days for trending; sounds trend 2-4 weeks

YouTube:
- Engagement rate = (likes + comments) / views x 100
- 2-5% is average, >8% is excellent
- Shorts get higher views but lower watch time; long-form drives subscribers

Instagram:
- Engagement rate = (likes + comments + saves) / followers x 100
- 1-3% average for accounts >10K, >6% is excellent
- Reels get 2-3x more reach than feed posts

Reddit:
- Key metrics: upvote ratio, comment count, crosspost count
- >90% upvote ratio + >100 comments = culturally resonant
- High comment-to-upvote ratio = debate/controversy signal

INFLUENCER TIER CLASSIFICATION:
| Tier | Followers | Significance |
|------|-----------|--------------|
| Nano | 1K-10K | Highest engagement, niche authority, authentic voice |
| Micro | 10K-100K | Category expertise, community trust — trend indicators |
| Mid-tier | 100K-500K | When they adopt, it's growing — key signal |
| Macro | 500K-1M | Mainstream validation |
| Mega | >1M | Mass awareness, lower engagement rates |

TREND LIFECYCLE STAGES:
| Stage | Timeframe | Signal |
|-------|-----------|--------|
| Emerging | Days 1-3 | Early adopters, <1000 posts, high engagement per post |
| Growing | Days 3-7 | Mid-tier creators adopt, exponential growth, mainstream hashtags form |
| Peaking | Days 7-14 | Maximum visibility, brand participation, media coverage |
| Declining | Days 14-30 | Volume plateaus, engagement drops, audience fatigue |
| Saturated | 30+ days | Oversaturated, low engagement, only evergreen performs |

RED FLAGS IN DATA:
- Engagement-to-follower ratio too high = possible bot activity
- Views massively exceed followers = paid promotion (not organic trend)
- Generic/repetitive comments = engagement pods
`;

export const UNIFIED_EVIDENCE = `
EVIDENCE STANDARDS:
- A data point = a quote, metric, username, or date from the collected data.
- Strong evidence = metric + quote together (e.g., "**4.2K upvotes** on a post where u/user says '...'").
- Weak evidence = vague reference without numbers (e.g., "some users mentioned..."). Avoid this.
- Every claim must be backed by at least one data point. No unsupported assertions.
- When multiple data points converge, say so explicitly: "Confirmed across 3 platforms with X, Y, Z."
`;

export const EMOTION_DETECTION = `
EMOTION DETECTION METHODOLOGY:
Identify dominant emotions in the data using these signal patterns:

| Emotion | Signal Keywords | Example |
|---------|----------------|---------|
| Anger | angry, furious, unacceptable, outrage, scam, rip-off, boycott, disgusting | "This is absolutely unacceptable, I'm done with this brand" |
| Excitement | excited, amazing, love, can't wait, obsessed, game-changer, incredible | "OMG this is a game-changer, literally obsessed" |
| Confusion | confused, unclear, why, doesn't make sense, what happened, lost | "Can someone explain why they changed this? Makes no sense" |
| Hope | hope, looking forward, finally, about time, promising, optimistic | "Finally they're listening to us, really hoping this works" |
| Frustration | frustrated, annoying, again, still, broken, useless, disappointed | "Still broken after 3 updates, so frustrated with this" |

Detection rules:
- Count posts containing 2+ signal keywords for each emotion
- Weight by engagement: a frustrated post with 5K upvotes matters more than one with 10
- Report as percentages of emotionally-coded posts (neutral posts excluded from denominator)
`;

export const DIMENSION_SCORING = `
DIMENSION SCORING GUIDANCE (0-100 each):

| Dimension | Weight | How to Score |
|-----------|--------|--------------|
| Cultural Relevance | 25% | Based on engagement volume relative to platform norms. >75th percentile on the platform = 80+. Average engagement = 50. Below average = 30 or less. |
| Strategic Fit | 22% | Does it directly answer a research question? Yes = 80+. Tangentially related = 50-70. Irrelevant to the objective = 0-30. |
| Authenticity | 18% | Community-driven organic conversation = 80+. Mix of organic and commercial = 50-70. Manufactured/bot/astroturfed = 0-30. |
| Virality Potential | 20% | Based on share ratio and cross-platform presence. High shares + cross-platform = 80+. Moderate sharing = 50-70. Low/no sharing = 0-30. |
| Novelty | 7% | First time seeing this angle in the data = 80+. Emerging/growing angle = 60. Well-known/obvious = 30. |
| Risk Level | 8% (inverse) | Use risk signal keywords below. No risk flags = score 0 (safe). Multiple risk keywords = score 70+. Formula uses (100-risk). |

Formula: total = cultural*0.25 + fit*0.22 + authenticity*0.18 + virality*0.20 + novelty*0.07 + (100-risk)*0.08
`;
