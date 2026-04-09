# Creator Intel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Creator Intel" feature to CultureWire that lets users paste a TikTok URL or search by topic to analyze posts, creators, and discover similar accounts.

**Architecture:** New parallel top-level route `/creator-intel` alongside existing `/culture-wire`. Shares auth, Supabase, UI components, and nav. Server-side ScrapeCreators API calls via Next.js API routes with `after()` for background processing. Single `creator_intel_analyses` table with JSONB results.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS), ScrapeCreators API, Zod, shadcn/ui, Tailwind, Lucide icons, sonner toasts.

---

## File Structure

```
# New files
src/app/creator-intel/page.tsx                    — Main page (URL input, topic search, history)
src/app/creator-intel/[id]/page.tsx               — Analysis report page
src/app/api/creator-intel/analyze/route.ts        — POST: start analysis
src/app/api/creator-intel/[id]/route.ts           — GET: fetch analysis
src/app/api/creator-intel/[id]/similar/route.ts   — POST: find similar creators
src/app/api/creator-intel/history/route.ts        — GET: user's past analyses
src/lib/creator-intel/scraper.ts                  — ScrapeCreators API client
src/lib/creator-intel/analyzer.ts                 — Analysis logic (tier classification, theme extraction)
src/lib/creator-intel/hashtags.ts                 — Hashtag generation from topics
src/lib/creator-intel/types.ts                    — Creator Intel types
src/lib/creator-intel/validators.ts               — Zod schemas
src/components/creator-intel/url-input.tsx         — TikTok URL paste field
src/components/creator-intel/topic-search.tsx      — Topic search with region selector
src/components/creator-intel/analysis-report.tsx   — Full report layout (post or topic)
src/components/creator-intel/post-metrics.tsx      — Post stats display
src/components/creator-intel/creator-overview.tsx  — Creator profile section
src/components/creator-intel/creator-card.tsx      — Reusable creator summary card
src/components/creator-intel/similar-results.tsx   — Find Similar results grid
src/components/creator-intel/theme-tags.tsx        — Content theme tag list
src/components/creator-intel/history-grid.tsx      — Past analyses grid
supabase/migrations/004_creator_intel.sql          — Database migration

# Modified files
src/components/layout/nav-header.tsx               — Add "Creator Intel" nav link
src/lib/types.ts                                   — Add CreatorIntelAnalysis type
```

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/004_creator_intel.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Creator Intel analyses table
create table if not exists creator_intel_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('post', 'creator', 'topic')),
  input text not null,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'complete', 'failed')),
  results jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table creator_intel_analyses enable row level security;

create policy "Users can read own analyses"
  on creator_intel_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on creator_intel_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyses"
  on creator_intel_analyses for update
  using (auth.uid() = user_id);

-- Index for history queries
create index idx_creator_intel_user_created
  on creator_intel_analyses (user_id, created_at desc);
```

- [ ] **Step 2: Apply the migration**

Run: `cd ~/Code_Projects/culturewire-client && npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_creator_intel.sql
git commit -m "feat: add creator_intel_analyses table with RLS"
```

---

### Task 2: Types and Validators

**Files:**
- Create: `src/lib/creator-intel/types.ts`
- Create: `src/lib/creator-intel/validators.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create Creator Intel types**

Write to `src/lib/creator-intel/types.ts`:

```typescript
export type AnalysisType = 'post' | 'creator' | 'topic';
export type AnalysisStatus = 'pending' | 'analyzing' | 'complete' | 'failed';
export type SimilarDepth = 'quick' | 'deep';

export type InfluencerTier = 'nano' | 'micro' | 'mid-tier' | 'macro' | 'mega';

export interface CreatorIntelAnalysis {
  id: string;
  user_id: string;
  type: AnalysisType;
  input: string;
  status: AnalysisStatus;
  results: PostAnalysisResult | TopicAnalysisResult | null;
  created_at: string;
}

export interface PostAnalysisResult {
  kind: 'post';
  post: TikTokPost;
  creator: CreatorProfile;
  themes: string[];
}

export interface TopicAnalysisResult {
  kind: 'topic';
  topic: string;
  hashtags_searched: string[];
  region: string;
  total_posts: number;
  top_creators: CreatorSummary[];
  trending_posts: TikTokPost[];
  theme_breakdown: ThemeBreakdown[];
}

export interface TikTokPost {
  aweme_id: string;
  username: string;
  description: string;
  region: string;
  url: string;
  stats: PostStats;
  hashtags: string[];
}

export interface PostStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}

export interface CreatorProfile {
  username: string;
  region: string;
  tier: InfluencerTier;
  follower_estimate: string | null;
  avg_views: number;
  avg_likes: number;
  avg_shares: number;
  posting_frequency: string;
  top_hashtags: string[];
  content_themes: string[];
  posts_analyzed: number;
}

export interface CreatorSummary {
  username: string;
  region: string;
  tier: InfluencerTier;
  avg_engagement_rate: number;
  top_themes: string[];
  post_count: number;
  total_views: number;
}

export interface ThemeBreakdown {
  theme: string;
  post_count: number;
  avg_engagement_rate: number;
}

export interface ScrapeCreatorsPost {
  aweme_id: string;
  desc: string;
  region: string;
  author: {
    unique_id: string;
    nickname: string;
  };
  statistics: {
    play_count: number;
    digg_count: number;
    share_count: number;
    comment_count: number;
  };
}

export interface ScrapeCreatorsResponse {
  success: boolean;
  credits_remaining: number;
  aweme_list: ScrapeCreatorsPost[];
}
```

- [ ] **Step 2: Create validators**

Write to `src/lib/creator-intel/validators.ts`:

```typescript
import { z } from 'zod';

export const AnalyzeRequestSchema = z.object({
  type: z.enum(['url', 'topic']),
  input: z.string().min(1).max(500),
  region: z.string().length(2).default('AU'),
});

export const SimilarRequestSchema = z.object({
  depth: z.enum(['quick', 'deep']).default('quick'),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type SimilarRequest = z.infer<typeof SimilarRequestSchema>;

const TIKTOK_URL_PATTERN = /tiktok\.com\/@([\w.]+)\/video\/(\d+)/;

export function parseTikTokUrl(url: string): { username: string; awemeId: string } | null {
  const match = url.match(TIKTOK_URL_PATTERN);
  if (!match) return null;
  return { username: match[1], awemeId: match[2] };
}
```

- [ ] **Step 3: Add type export to main types file**

Add to the bottom of `src/lib/types.ts`:

```typescript
// Creator Intel
export type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';
```

- [ ] **Step 4: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/creator-intel/types.ts src/lib/creator-intel/validators.ts src/lib/types.ts
git commit -m "feat: add Creator Intel types and validators"
```

---

### Task 3: ScrapeCreators API Client

**Files:**
- Create: `src/lib/creator-intel/scraper.ts`

- [ ] **Step 1: Write the scraper module**

```typescript
import type { ScrapeCreatorsResponse } from './types';

const API_BASE = 'https://api.scrapecreators.com/v1/tiktok/search/hashtag';

function getApiKey(): string {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new Error('SCRAPECREATORS_API_KEY not configured');
  return key;
}

export async function searchHashtag(
  hashtag: string,
  region: string = 'AU'
): Promise<ScrapeCreatorsResponse> {
  const url = `${API_BASE}?hashtag=${encodeURIComponent(hashtag)}&region=${encodeURIComponent(region)}&trim=true`;

  const res = await fetch(url, {
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`ScrapeCreators API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function searchMultipleHashtags(
  hashtags: string[],
  region: string = 'AU'
): Promise<ScrapeCreatorsResponse[]> {
  const results = await Promise.all(
    hashtags.map((tag) => searchHashtag(tag, region).catch(() => ({ success: false, credits_remaining: 0, aweme_list: [] })))
  );
  return results;
}
```

- [ ] **Step 2: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/creator-intel/scraper.ts
git commit -m "feat: add ScrapeCreators API client"
```

---

### Task 4: Analysis Logic

**Files:**
- Create: `src/lib/creator-intel/analyzer.ts`
- Create: `src/lib/creator-intel/hashtags.ts`

- [ ] **Step 1: Write hashtag generator**

Write to `src/lib/creator-intel/hashtags.ts`:

```typescript
const COMMON_SUFFIXES = ['tiktok', 'content', 'creator', 'tips', 'hack', 'tutorial'];

export function generateHashtags(topic: string): string[] {
  const base = topic.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const words = base.split(/\s+/);

  const hashtags: string[] = [];

  // Primary: the topic as-is (no spaces)
  hashtags.push(words.join(''));

  // If multi-word, add individual words that are 4+ chars
  if (words.length > 1) {
    for (const word of words) {
      if (word.length >= 4 && !hashtags.includes(word)) {
        hashtags.push(word);
      }
    }
  }

  // Suffixed variants
  for (const suffix of COMMON_SUFFIXES.slice(0, 3)) {
    const variant = words.join('') + suffix;
    if (!hashtags.includes(variant)) {
      hashtags.push(variant);
    }
  }

  // Cap at 10 hashtags
  return hashtags.slice(0, 10);
}

export function extractHashtags(description: string): string[] {
  const matches = description.match(/#(\w+)/g);
  if (!matches) return [];
  return matches.map((m) => m.replace('#', '').toLowerCase());
}
```

- [ ] **Step 2: Write analyzer module**

Write to `src/lib/creator-intel/analyzer.ts`:

```typescript
import type {
  ScrapeCreatorsPost,
  TikTokPost,
  CreatorProfile,
  CreatorSummary,
  PostStats,
  PostAnalysisResult,
  TopicAnalysisResult,
  ThemeBreakdown,
  InfluencerTier,
} from './types';
import { searchHashtag, searchMultipleHashtags } from './scraper';
import { extractHashtags, generateHashtags } from './hashtags';
import { parseTikTokUrl } from './validators';

function toTikTokPost(raw: ScrapeCreatorsPost): TikTokPost {
  const totalEngagement = raw.statistics.digg_count + raw.statistics.comment_count + raw.statistics.share_count;
  const engagementRate = raw.statistics.play_count > 0
    ? (totalEngagement / raw.statistics.play_count) * 100
    : 0;

  return {
    aweme_id: raw.aweme_id,
    username: raw.author.unique_id,
    description: raw.desc,
    region: raw.region || 'unknown',
    url: `https://www.tiktok.com/@${raw.author.unique_id}/video/${raw.aweme_id}`,
    stats: {
      views: raw.statistics.play_count,
      likes: raw.statistics.digg_count,
      comments: raw.statistics.comment_count,
      shares: raw.statistics.share_count,
      engagement_rate: Math.round(engagementRate * 100) / 100,
    },
    hashtags: extractHashtags(raw.desc),
  };
}

export function classifyTier(avgViews: number): InfluencerTier {
  if (avgViews >= 1_000_000) return 'mega';
  if (avgViews >= 500_000) return 'macro';
  if (avgViews >= 100_000) return 'mid-tier';
  if (avgViews >= 10_000) return 'micro';
  return 'nano';
}

function estimatePostingFrequency(postCount: number): string {
  if (postCount >= 8) return 'Very active (daily+)';
  if (postCount >= 4) return 'Active (several per week)';
  if (postCount >= 2) return 'Moderate (weekly)';
  return 'Occasional';
}

function buildCreatorProfile(posts: TikTokPost[], username: string): CreatorProfile {
  const userPosts = posts.filter((p) => p.username === username);
  if (userPosts.length === 0) {
    return {
      username,
      region: 'unknown',
      tier: 'nano',
      follower_estimate: null,
      avg_views: 0,
      avg_likes: 0,
      avg_shares: 0,
      posting_frequency: 'Unknown',
      top_hashtags: [],
      content_themes: [],
      posts_analyzed: 0,
    };
  }

  const avgViews = Math.round(userPosts.reduce((sum, p) => sum + p.stats.views, 0) / userPosts.length);
  const avgLikes = Math.round(userPosts.reduce((sum, p) => sum + p.stats.likes, 0) / userPosts.length);
  const avgShares = Math.round(userPosts.reduce((sum, p) => sum + p.stats.shares, 0) / userPosts.length);

  // Count hashtag frequency
  const tagCounts: Record<string, number> = {};
  for (const post of userPosts) {
    for (const tag of post.hashtags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topHashtags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  // Derive themes from top hashtags (simplified: use top 5 unique hashtags as themes)
  const themes = topHashtags.slice(0, 5);

  return {
    username,
    region: userPosts[0].region,
    tier: classifyTier(avgViews),
    follower_estimate: null,
    avg_views: avgViews,
    avg_likes: avgLikes,
    avg_shares: avgShares,
    posting_frequency: estimatePostingFrequency(userPosts.length),
    top_hashtags: topHashtags,
    content_themes: themes,
    posts_analyzed: userPosts.length,
  };
}

export async function analyzePost(
  input: string,
  region: string
): Promise<PostAnalysisResult> {
  const parsed = parseTikTokUrl(input);
  if (!parsed) throw new Error('Invalid TikTok URL');

  const { username, awemeId } = parsed;

  // Step 1: Search by username as hashtag to find the post
  const initialResults = await searchHashtag(username, region);
  let allPosts = initialResults.aweme_list.map(toTikTokPost);

  // Try to find the target post
  let targetPost = allPosts.find((p) => p.aweme_id === awemeId);

  // Step 2: If not found in initial search, try common hashtags from found posts
  if (!targetPost && allPosts.length > 0) {
    // Use hashtags from the creator's other posts
    const creatorPosts = allPosts.filter((p) => p.username === username);
    const creatorHashtags = creatorPosts.flatMap((p) => p.hashtags).slice(0, 3);

    if (creatorHashtags.length > 0) {
      const moreResults = await searchMultipleHashtags(creatorHashtags, region);
      for (const res of moreResults) {
        allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
      }
      targetPost = allPosts.find((p) => p.aweme_id === awemeId);
    }
  }

  // If still not found, use first post by this creator as reference
  if (!targetPost) {
    const creatorPost = allPosts.find((p) => p.username === username);
    if (!creatorPost) throw new Error('Could not find any posts for this creator');
    targetPost = creatorPost;
  }

  // Step 3: Expand search using the post's hashtags for creator profile
  const postHashtags = targetPost.hashtags.slice(0, 5);
  if (postHashtags.length > 0) {
    const expandedResults = await searchMultipleHashtags(postHashtags, region);
    for (const res of expandedResults) {
      allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  allPosts = allPosts.filter((p) => {
    if (seen.has(p.aweme_id)) return false;
    seen.add(p.aweme_id);
    return true;
  });

  const creator = buildCreatorProfile(allPosts, username);
  const themes = creator.content_themes;

  return {
    kind: 'post',
    post: targetPost,
    creator,
    themes,
  };
}

export async function analyzeTopic(
  topic: string,
  region: string
): Promise<TopicAnalysisResult> {
  const hashtags = generateHashtags(topic);
  const responses = await searchMultipleHashtags(hashtags, region);

  // Collect all posts, deduplicate
  const seen = new Set<string>();
  const allPosts: TikTokPost[] = [];
  for (const res of responses) {
    for (const raw of res.aweme_list) {
      const post = toTikTokPost(raw);
      if (!seen.has(post.aweme_id)) {
        seen.add(post.aweme_id);
        allPosts.push(post);
      }
    }
  }

  // Group by creator
  const byCreator: Record<string, TikTokPost[]> = {};
  for (const post of allPosts) {
    if (!byCreator[post.username]) byCreator[post.username] = [];
    byCreator[post.username].push(post);
  }

  // Build creator summaries, rank by total engagement
  const topCreators: CreatorSummary[] = Object.entries(byCreator)
    .map(([username, posts]) => {
      const totalViews = posts.reduce((sum, p) => sum + p.stats.views, 0);
      const totalEngagement = posts.reduce(
        (sum, p) => sum + p.stats.likes + p.stats.comments + p.stats.shares,
        0
      );
      const avgEngRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

      const tagCounts: Record<string, number> = {};
      for (const post of posts) {
        for (const tag of post.hashtags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      const topThemes = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      return {
        username,
        region: posts[0].region,
        tier: classifyTier(totalViews / posts.length),
        avg_engagement_rate: Math.round(avgEngRate * 100) / 100,
        top_themes: topThemes,
        post_count: posts.length,
        total_views: totalViews,
      };
    })
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 20);

  // Trending posts (top 20 by views)
  const trendingPosts = [...allPosts]
    .sort((a, b) => b.stats.views - a.stats.views)
    .slice(0, 20);

  // Theme breakdown
  const themeCounts: Record<string, { count: number; totalEngRate: number }> = {};
  for (const post of allPosts) {
    for (const tag of post.hashtags) {
      if (!themeCounts[tag]) themeCounts[tag] = { count: 0, totalEngRate: 0 };
      themeCounts[tag].count++;
      themeCounts[tag].totalEngRate += post.stats.engagement_rate;
    }
  }
  const themeBreakdown: ThemeBreakdown[] = Object.entries(themeCounts)
    .map(([theme, data]) => ({
      theme,
      post_count: data.count,
      avg_engagement_rate: Math.round((data.totalEngRate / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.post_count - a.post_count)
    .slice(0, 15);

  return {
    kind: 'topic',
    topic,
    hashtags_searched: hashtags,
    region,
    total_posts: allPosts.length,
    top_creators: topCreators,
    trending_posts: trendingPosts,
    theme_breakdown: themeBreakdown,
  };
}

export async function findSimilar(
  sourceAnalysis: PostAnalysisResult | TopicAnalysisResult,
  depth: 'quick' | 'deep',
  region: string
): Promise<CreatorSummary[]> {
  let hashtags: string[];

  if (sourceAnalysis.kind === 'post') {
    hashtags = sourceAnalysis.post.hashtags.slice(0, depth === 'quick' ? 5 : 10);
    if (depth === 'deep') {
      // Add theme-based hashtags
      for (const theme of sourceAnalysis.themes) {
        if (!hashtags.includes(theme)) hashtags.push(theme);
      }
      hashtags = hashtags.slice(0, 15);
    }
  } else {
    hashtags = sourceAnalysis.hashtags_searched.slice(0, depth === 'quick' ? 5 : 10);
  }

  const responses = await searchMultipleHashtags(hashtags, region);

  const seen = new Set<string>();
  const allPosts: TikTokPost[] = [];
  for (const res of responses) {
    for (const raw of res.aweme_list) {
      const post = toTikTokPost(raw);
      if (!seen.has(post.aweme_id)) {
        seen.add(post.aweme_id);
        allPosts.push(post);
      }
    }
  }

  // Exclude the source creator if post analysis
  const excludeUsername = sourceAnalysis.kind === 'post' ? sourceAnalysis.creator.username : null;

  const byCreator: Record<string, TikTokPost[]> = {};
  for (const post of allPosts) {
    if (post.username === excludeUsername) continue;
    if (!byCreator[post.username]) byCreator[post.username] = [];
    byCreator[post.username].push(post);
  }

  // Filter by tier: same or higher
  const sourceTier = sourceAnalysis.kind === 'post' ? sourceAnalysis.creator.tier : null;
  const tierOrder: InfluencerTier[] = ['nano', 'micro', 'mid-tier', 'macro', 'mega'];
  const minTierIndex = sourceTier ? tierOrder.indexOf(sourceTier) : 0;

  return Object.entries(byCreator)
    .map(([username, posts]) => {
      const totalViews = posts.reduce((sum, p) => sum + p.stats.views, 0);
      const totalEng = posts.reduce((sum, p) => sum + p.stats.likes + p.stats.comments + p.stats.shares, 0);
      const avgEngRate = totalViews > 0 ? (totalEng / totalViews) * 100 : 0;

      const tagCounts: Record<string, number> = {};
      for (const post of posts) {
        for (const tag of post.hashtags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      const topThemes = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      return {
        username,
        region: posts[0].region,
        tier: classifyTier(totalViews / posts.length),
        avg_engagement_rate: Math.round(avgEngRate * 100) / 100,
        top_themes: topThemes,
        post_count: posts.length,
        total_views: totalViews,
      };
    })
    .filter((c) => tierOrder.indexOf(c.tier) >= minTierIndex)
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 20);
}
```

- [ ] **Step 3: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/creator-intel/analyzer.ts src/lib/creator-intel/hashtags.ts
git commit -m "feat: add Creator Intel analysis logic and hashtag generator"
```

---

### Task 5: API Routes

**Files:**
- Create: `src/app/api/creator-intel/analyze/route.ts`
- Create: `src/app/api/creator-intel/[id]/route.ts`
- Create: `src/app/api/creator-intel/[id]/similar/route.ts`
- Create: `src/app/api/creator-intel/history/route.ts`

- [ ] **Step 1: Write the analyze route**

Write to `src/app/api/creator-intel/analyze/route.ts`:

```typescript
import { NextRequest, NextResponse, after } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { AnalyzeRequestSchema, parseTikTokUrl } from '@/lib/creator-intel/validators';
import { analyzePost, analyzeTopic } from '@/lib/creator-intel/analyzer';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, input, region } = parsed.data;

  // Validate URL if type is 'url'
  if (type === 'url' && !parseTikTokUrl(input)) {
    return NextResponse.json(
      { error: 'Invalid TikTok URL. Expected format: https://www.tiktok.com/@username/video/1234567890' },
      { status: 400 }
    );
  }

  const analysisType = type === 'url' ? 'post' : 'topic';

  const supabase = await createServerClient();
  const { data: analysis, error } = await supabase
    .from('creator_intel_analyses')
    .insert({
      user_id: session.sub,
      type: analysisType,
      input,
      status: 'analyzing',
    })
    .select()
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: error?.message || 'Failed to create analysis' }, { status: 500 });
  }

  after(async () => {
    const admin = createAdminClient();
    try {
      const results = analysisType === 'post'
        ? await analyzePost(input, region)
        : await analyzeTopic(input, region);

      await admin
        .from('creator_intel_analyses')
        .update({ status: 'complete', results })
        .eq('id', analysis.id);
    } catch (err) {
      console.error('Creator Intel analysis failed:', err);
      await admin
        .from('creator_intel_analyses')
        .update({ status: 'failed' })
        .eq('id', analysis.id);
    }
  });

  return NextResponse.json({ analysis }, { status: 201 });
}
```

- [ ] **Step 2: Write the single analysis route**

Write to `src/app/api/creator-intel/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data: analysis, error } = await supabase
    .from('creator_intel_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  return NextResponse.json({ analysis });
}
```

- [ ] **Step 3: Write the find similar route**

Write to `src/app/api/creator-intel/[id]/similar/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { SimilarRequestSchema } from '@/lib/creator-intel/validators';
import { findSimilar } from '@/lib/creator-intel/analyzer';
import type { PostAnalysisResult, TopicAnalysisResult } from '@/lib/creator-intel/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = SimilarRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: analysis, error } = await supabase
    .from('creator_intel_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  if (analysis.status !== 'complete' || !analysis.results) {
    return NextResponse.json({ error: 'Analysis not yet complete' }, { status: 400 });
  }

  const results = analysis.results as PostAnalysisResult | TopicAnalysisResult;
  const region = results.kind === 'topic' ? results.region : 'AU';

  const similar = await findSimilar(results, parsed.data.depth, region);

  return NextResponse.json({ similar });
}
```

- [ ] **Step 4: Write the history route**

Write to `src/app/api/creator-intel/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: analyses, error } = await supabase
    .from('creator_intel_analyses')
    .select('id, type, input, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analyses: analyses || [] });
}
```

- [ ] **Step 5: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/creator-intel/
git commit -m "feat: add Creator Intel API routes (analyze, fetch, similar, history)"
```

---

### Task 6: Nav Header Update

**Files:**
- Modify: `src/components/layout/nav-header.tsx`

- [ ] **Step 1: Add Creator Intel link to nav**

In `src/components/layout/nav-header.tsx`, find the nav links section and add the Creator Intel link after the Influencers link. Look for the pattern:

```typescript
<Link href="/culture-wire/influencers">Influencers</Link>
```

Add after it:

```typescript
<Link href="/creator-intel">Creator Intel</Link>
```

Use the same link component pattern and styling as the existing nav links (the exact implementation depends on whether the links use a helper component or inline `<Link>` with conditional classes).

- [ ] **Step 2: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/nav-header.tsx
git commit -m "feat: add Creator Intel link to nav header"
```

---

### Task 7: UI Components

**Files:**
- Create: `src/components/creator-intel/url-input.tsx`
- Create: `src/components/creator-intel/topic-search.tsx`
- Create: `src/components/creator-intel/creator-card.tsx`
- Create: `src/components/creator-intel/theme-tags.tsx`
- Create: `src/components/creator-intel/post-metrics.tsx`
- Create: `src/components/creator-intel/creator-overview.tsx`

- [ ] **Step 1: Write URL input component**

Write to `src/components/creator-intel/url-input.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export function UrlInput({ onSubmit, loading }: UrlInputProps) {
  const [url, setUrl] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a TikTok URL (e.g. https://www.tiktok.com/@creator/video/123)"
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!url.trim() || loading}
        className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Analyze
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write topic search component**

Write to `src/components/creator-intel/topic-search.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const REGIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'CA', label: 'Canada' },
];

interface TopicSearchProps {
  onSubmit: (topic: string, region: string) => void;
  loading: boolean;
}

export function TopicSearch({ onSubmit, loading }: TopicSearchProps) {
  const [topic, setTopic] = useState('');
  const [region, setRegion] = useState('AU');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    onSubmit(topic.trim(), region);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Search a topic (e.g. color grading, sustainable fashion)"
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      />
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      >
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!topic.trim() || loading}
        className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Search
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Write theme tags component**

Write to `src/components/creator-intel/theme-tags.tsx`:

```typescript
interface ThemeTagsProps {
  themes: string[];
  max?: number;
}

export function ThemeTags({ themes, max = 5 }: ThemeTagsProps) {
  const display = themes.slice(0, max);
  const remaining = themes.length - max;

  return (
    <div className="flex flex-wrap gap-1.5">
      {display.map((theme) => (
        <span
          key={theme}
          className="rounded-full bg-[#8B3F4F]/10 px-2.5 py-0.5 text-xs text-[#8B3F4F]"
        >
          #{theme}
        </span>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write post metrics component**

Write to `src/components/creator-intel/post-metrics.tsx`:

```typescript
import { Eye, Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import type { PostStats } from '@/lib/creator-intel/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface PostMetricsProps {
  stats: PostStats;
}

export function PostMetrics({ stats }: PostMetricsProps) {
  const metrics = [
    { icon: Eye, label: 'Views', value: formatNumber(stats.views) },
    { icon: Heart, label: 'Likes', value: formatNumber(stats.likes) },
    { icon: MessageCircle, label: 'Comments', value: formatNumber(stats.comments) },
    { icon: Share2, label: 'Shares', value: formatNumber(stats.shares) },
    { icon: TrendingUp, label: 'Engagement', value: `${stats.engagement_rate}%` },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <m.icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
          <div className="text-lg font-semibold text-gray-900">{m.value}</div>
          <div className="text-xs text-gray-500">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write creator overview component**

Write to `src/components/creator-intel/creator-overview.tsx`:

```typescript
import { User, MapPin, BarChart3, Clock } from 'lucide-react';
import type { CreatorProfile, InfluencerTier } from '@/lib/creator-intel/types';
import { ThemeTags } from './theme-tags';

const TIER_COLORS: Record<InfluencerTier, string> = {
  nano: '#6B7280',
  micro: '#10B981',
  'mid-tier': '#F59E0B',
  macro: '#8B5CF6',
  mega: '#EF4444',
};

const TIER_LABELS: Record<InfluencerTier, string> = {
  nano: 'NANO (1K-10K)',
  micro: 'MICRO (10K-100K)',
  'mid-tier': 'MID-TIER (100K-500K)',
  macro: 'MACRO (500K-1M)',
  mega: 'MEGA (1M+)',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface CreatorOverviewProps {
  creator: CreatorProfile;
}

export function CreatorOverview({ creator }: CreatorOverviewProps) {
  const tierColor = TIER_COLORS[creator.tier];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: tierColor }}
        >
          {creator.username[0].toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.tiktok.com/@${creator.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-[#8B3F4F]"
            >
              @{creator.username}
            </a>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              style={{
                color: tierColor,
                backgroundColor: `${tierColor}15`,
                border: `1px solid ${tierColor}`,
              }}
            >
              {TIER_LABELS[creator.tier]}
            </span>
          </div>
          {creator.region !== 'unknown' && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3 w-3" />
              {creator.region}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-sm font-semibold text-gray-900">{formatNumber(creator.avg_views)}</div>
          <div className="text-xs text-gray-500">Avg Views</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-sm font-semibold text-gray-900">{formatNumber(creator.avg_likes)}</div>
          <div className="text-xs text-gray-500">Avg Likes</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-sm font-semibold text-gray-900">{formatNumber(creator.avg_shares)}</div>
          <div className="text-xs text-gray-500">Avg Shares</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-sm font-semibold text-gray-900">{creator.posts_analyzed}</div>
          <div className="text-xs text-gray-500">Posts Found</div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4" />
        {creator.posting_frequency}
      </div>

      {creator.content_themes.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-gray-500">Content Themes</div>
          <ThemeTags themes={creator.content_themes} max={8} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write creator card component**

Write to `src/components/creator-intel/creator-card.tsx`:

```typescript
'use client';

import { User, TrendingUp } from 'lucide-react';
import type { CreatorSummary, InfluencerTier } from '@/lib/creator-intel/types';
import { ThemeTags } from './theme-tags';

const TIER_COLORS: Record<InfluencerTier, string> = {
  nano: '#6B7280',
  micro: '#10B981',
  'mid-tier': '#F59E0B',
  macro: '#8B5CF6',
  mega: '#EF4444',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface CreatorCardProps {
  creator: CreatorSummary;
  onAnalyze?: (username: string) => void;
}

export function CreatorCard({ creator, onAnalyze }: CreatorCardProps) {
  const tierColor = TIER_COLORS[creator.tier];

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#8B3F4F]/50 hover:shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: tierColor }}
        >
          {creator.username[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={`https://www.tiktok.com/@${creator.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-semibold text-gray-900 hover:text-[#8B3F4F]"
          >
            @{creator.username}
          </a>
          <span
            className="inline-block rounded-full px-2 py-0 text-[10px] font-bold uppercase"
            style={{
              color: tierColor,
              backgroundColor: `${tierColor}15`,
              border: `1px solid ${tierColor}`,
            }}
          >
            {creator.tier}
          </span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>{formatNumber(creator.total_views)} total views</span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {creator.avg_engagement_rate}%
        </span>
      </div>

      {creator.top_themes.length > 0 && (
        <div className="mb-3">
          <ThemeTags themes={creator.top_themes} max={3} />
        </div>
      )}

      {onAnalyze && (
        <button
          onClick={() => onAnalyze(creator.username)}
          className="w-full rounded-lg border border-[#8B3F4F] px-3 py-1.5 text-xs font-medium text-[#8B3F4F] transition-colors hover:bg-[#8B3F4F] hover:text-white"
        >
          Full Analysis
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/creator-intel/
git commit -m "feat: add Creator Intel UI components"
```

---

### Task 8: Report Page Components

**Files:**
- Create: `src/components/creator-intel/similar-results.tsx`
- Create: `src/components/creator-intel/analysis-report.tsx`
- Create: `src/components/creator-intel/history-grid.tsx`

- [ ] **Step 1: Write similar results component**

Write to `src/components/creator-intel/similar-results.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import type { CreatorSummary } from '@/lib/creator-intel/types';
import { CreatorCard } from './creator-card';

interface SimilarResultsProps {
  analysisId: string;
  onAnalyzeCreator: (username: string) => void;
}

export function SimilarResults({ analysisId, onAnalyzeCreator }: SimilarResultsProps) {
  const [results, setResults] = useState<CreatorSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');

  async function handleSearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator-intel/${analysisId}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.similar);
      }
    } catch (err) {
      console.error('Find similar failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="h-5 w-5" />
          Find Similar Creators
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as 'quick' | 'deep')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-[#8B3F4F] focus:outline-none"
            disabled={loading}
          >
            <option value="quick">Quick (5-10 credits)</option>
            <option value="deep">Deep (15-25 credits)</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Searching...' : 'Find Similar'}
          </button>
        </div>
      </div>

      {results && results.length === 0 && (
        <p className="text-sm text-gray-500">No similar creators found. Try the Deep search for broader results.</p>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((creator) => (
            <CreatorCard
              key={creator.username}
              creator={creator}
              onAnalyze={onAnalyzeCreator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write analysis report component**

Write to `src/components/creator-intel/analysis-report.tsx`:

```typescript
'use client';

import { ExternalLink, Hash, Globe } from 'lucide-react';
import type { PostAnalysisResult, TopicAnalysisResult, CreatorIntelAnalysis } from '@/lib/creator-intel/types';
import { PostMetrics } from './post-metrics';
import { CreatorOverview } from './creator-overview';
import { CreatorCard } from './creator-card';
import { ThemeTags } from './theme-tags';
import { SimilarResults } from './similar-results';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const REGION_FLAGS: Record<string, string> = {
  AU: '\u{1F1E6}\u{1F1FA}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  NZ: '\u{1F1F3}\u{1F1FF}',
  CA: '\u{1F1E8}\u{1F1E6}',
};

interface AnalysisReportProps {
  analysis: CreatorIntelAnalysis;
  onAnalyzeCreator: (username: string) => void;
}

export function AnalysisReport({ analysis, onAnalyzeCreator }: AnalysisReportProps) {
  const results = analysis.results;
  if (!results) return null;

  if (results.kind === 'post') {
    return <PostReport analysis={analysis} results={results} onAnalyzeCreator={onAnalyzeCreator} />;
  }

  return <TopicReport analysis={analysis} results={results} onAnalyzeCreator={onAnalyzeCreator} />;
}

function PostReport({
  analysis,
  results,
  onAnalyzeCreator,
}: {
  analysis: CreatorIntelAnalysis;
  results: PostAnalysisResult;
  onAnalyzeCreator: (username: string) => void;
}) {
  const { post, creator } = results;

  return (
    <div className="space-y-6">
      {/* Post Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Post Summary</h2>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-[#8B3F4F] hover:underline"
          >
            Open in TikTok <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="mb-3 text-sm text-gray-700">{post.description}</p>
        <div className="flex items-center gap-3">
          {post.region && post.region !== 'unknown' && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              {REGION_FLAGS[post.region] || ''} {post.region}
            </span>
          )}
          {post.hashtags.length > 0 && <ThemeTags themes={post.hashtags} max={8} />}
        </div>
      </div>

      {/* Post Metrics */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Post Metrics</h2>
        <PostMetrics stats={post.stats} />
      </div>

      {/* Creator Overview */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Creator Overview</h2>
        <CreatorOverview creator={creator} />
      </div>

      {/* Find Similar */}
      <SimilarResults analysisId={analysis.id} onAnalyzeCreator={onAnalyzeCreator} />
    </div>
  );
}

function TopicReport({
  analysis,
  results,
  onAnalyzeCreator,
}: {
  analysis: CreatorIntelAnalysis;
  results: TopicAnalysisResult;
  onAnalyzeCreator: (username: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Topic Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Topic: {results.topic}</h2>
        <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
          <span>{results.total_posts} posts found</span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {results.region}
          </span>
          <span>{results.hashtags_searched.length} hashtags searched</span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="h-4 w-4 text-gray-400" />
          <ThemeTags themes={results.hashtags_searched} max={10} />
        </div>
      </div>

      {/* Top Creators */}
      {results.top_creators.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Top Creators</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.top_creators.map((creator) => (
              <CreatorCard
                key={creator.username}
                creator={creator}
                onAnalyze={onAnalyzeCreator}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending Posts */}
      {results.trending_posts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Trending Posts</h2>
          <div className="space-y-2">
            {results.trending_posts.slice(0, 10).map((post) => (
              <a
                key={post.aweme_id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-[#8B3F4F]/50 hover:shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>@{post.username}</span>
                  {post.region !== 'unknown' && (
                    <span>{REGION_FLAGS[post.region] || post.region}</span>
                  )}
                </div>
                <p className="mb-2 text-sm text-gray-700 line-clamp-2">{post.description}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{formatNumber(post.stats.views)} views</span>
                  <span>{formatNumber(post.stats.likes)} likes</span>
                  <span>{formatNumber(post.stats.shares)} shares</span>
                  <span>{post.stats.engagement_rate}% eng</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Theme Breakdown */}
      {results.theme_breakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Theme Breakdown</h2>
          <div className="space-y-2">
            {results.theme_breakdown.slice(0, 10).map((theme) => (
              <div key={theme.theme} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-900">#{theme.theme}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{theme.post_count} posts</span>
                  <span>{theme.avg_engagement_rate}% avg eng</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Find Similar */}
      <SimilarResults analysisId={analysis.id} onAnalyzeCreator={onAnalyzeCreator} />
    </div>
  );
}
```

- [ ] **Step 3: Write history grid component**

Write to `src/components/creator-intel/history-grid.tsx`:

```typescript
'use client';

import { Clock, Search, Link as LinkIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

function statusColor(status: string) {
  switch (status) {
    case 'analyzing': return 'border-blue-500 text-blue-600 bg-blue-50';
    case 'complete': return 'border-green-500 text-green-600 bg-green-50';
    case 'failed': return 'border-red-500 text-red-600 bg-red-50';
    default: return 'border-gray-300 text-gray-500 bg-gray-50';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'post': return LinkIcon;
    case 'topic': return Search;
    default: return MessageSquare;
  }
}

interface HistoryGridProps {
  analyses: Pick<CreatorIntelAnalysis, 'id' | 'type' | 'input' | 'status' | 'created_at'>[];
}

export function HistoryGrid({ analyses }: HistoryGridProps) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No analyses yet. Paste a URL or search a topic to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {analyses.map((a) => {
        const Icon = typeIcon(a.type);
        const date = new Date(a.created_at);

        return (
          <Link
            key={a.id}
            href={`/creator-intel/${a.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#8B3F4F]/50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium uppercase text-gray-500">{a.type}</span>
              <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor(a.status)}`}>
                {a.status}
              </span>
            </div>
            <p className="mb-2 truncate text-sm font-medium text-gray-900">{a.input}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/creator-intel/
git commit -m "feat: add Creator Intel report, similar results, and history components"
```

---

### Task 9: Page Routes

**Files:**
- Create: `src/app/creator-intel/page.tsx`
- Create: `src/app/creator-intel/[id]/page.tsx`

- [ ] **Step 1: Write the main Creator Intel page**

Write to `src/app/creator-intel/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { UrlInput } from '@/components/creator-intel/url-input';
import { TopicSearch } from '@/components/creator-intel/topic-search';
import { HistoryGrid } from '@/components/creator-intel/history-grid';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

type Tab = 'url' | 'topic';

export default function CreatorIntelPage() {
  const [tab, setTab] = useState<Tab>('url');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Pick<CreatorIntelAnalysis, 'id' | 'type' | 'input' | 'status' | 'created_at'>[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/creator-intel/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.analyses || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  async function handleAnalyze(type: 'url' | 'topic', input: string, region: string = 'AU') {
    setLoading(true);
    try {
      const res = await fetch('/api/creator-intel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Analysis failed');
        return;
      }
      router.push(`/creator-intel/${data.analysis.id}`);
    } catch (err) {
      toast.error('Failed to start analysis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Creator Intel</h1>

      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab('url')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'url'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Analyze URL
        </button>
        <button
          onClick={() => setTab('topic')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'topic'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Search Topic
        </button>
      </div>

      {/* Input area */}
      <div className="mb-8">
        {tab === 'url' ? (
          <UrlInput onSubmit={(url) => handleAnalyze('url', url)} loading={loading} />
        ) : (
          <TopicSearch onSubmit={(topic, region) => handleAnalyze('topic', topic, region)} loading={loading} />
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Analyses</h2>
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <HistoryGrid analyses={history} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the analysis report page**

Write to `src/app/creator-intel/[id]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AnalysisReport } from '@/components/creator-intel/analysis-report';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

export default function CreatorIntelReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CreatorIntelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/creator-intel/${id}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to load analysis');
          setLoading(false);
          return;
        }
        setAnalysis(data.analysis);

        // Poll if still analyzing
        if (data.analysis.status === 'analyzing' || data.analysis.status === 'pending') {
          if (!interval) {
            interval = setInterval(fetchAnalysis, 2000);
          }
        } else if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        toast.error('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  function handleAnalyzeCreator(username: string) {
    const url = `https://www.tiktok.com/@${username}`;
    // Navigate to main page and trigger URL analysis
    router.push(`/creator-intel?analyze=${encodeURIComponent(url)}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B3F4F]" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="text-gray-500">Analysis not found.</p>
        <Link href="/creator-intel" className="mt-4 inline-block text-sm text-[#8B3F4F] hover:underline">
          Back to Creator Intel
        </Link>
      </div>
    );
  }

  const isProcessing = analysis.status === 'pending' || analysis.status === 'analyzing';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/creator-intel" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {analysis.type === 'post' ? 'Post Analysis' : 'Topic Search'}
          </h1>
          <p className="text-sm text-gray-500">{analysis.input}</p>
        </div>
      </div>

      {isProcessing && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">
            Analyzing... This usually takes 10-30 seconds.
          </span>
        </div>
      )}

      {analysis.status === 'failed' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            Analysis failed. This can happen if the TikTok URL is not accessible or the API is temporarily unavailable.
          </p>
          <Link href="/creator-intel" className="mt-2 inline-block text-sm font-medium text-red-700 hover:underline">
            Try again
          </Link>
        </div>
      )}

      {analysis.status === 'complete' && analysis.results && (
        <AnalysisReport analysis={analysis} onAnalyzeCreator={handleAnalyzeCreator} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Verify dev server renders pages**

Run: `cd ~/Code_Projects/culturewire-client && npm run dev`

Visit `http://localhost:3000/creator-intel` and verify:
- Page renders with tab switcher and empty history
- URL input and topic search tabs switch correctly

- [ ] **Step 5: Commit**

```bash
git add src/app/creator-intel/
git commit -m "feat: add Creator Intel main page and report page"
```

---

### Task 10: Handle analyze query param for creator drill-down

**Files:**
- Modify: `src/app/creator-intel/page.tsx`

- [ ] **Step 1: Add query param handling to main page**

In `src/app/creator-intel/page.tsx`, add `useSearchParams` import and auto-trigger analysis when `?analyze=` is present. Add to the imports:

```typescript
import { useRouter, useSearchParams } from 'next/navigation';
```

Add inside the component, after the `historyLoading` effect:

```typescript
const searchParams = useSearchParams();

useEffect(() => {
  const analyzeUrl = searchParams.get('analyze');
  if (analyzeUrl && !loading) {
    handleAnalyze('url', analyzeUrl);
  }
  // Only run on mount with the param
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 2: Run type check**

Run: `cd ~/Code_Projects/culturewire-client && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/creator-intel/page.tsx
git commit -m "feat: handle analyze query param for creator drill-down"
```

---

### Task 11: Environment Variable

**Files:** None (Railway config)

- [ ] **Step 1: Verify env var is accessible**

Check that `SCRAPECREATORS_API_KEY` is in the Railway environment for the CultureWire service. If deploying locally first, add to `.env.local`:

```
SCRAPECREATORS_API_KEY=your_key_here
```

- [ ] **Step 2: Add to Railway env vars**

In the Railway dashboard for the CultureWire service, add:
- `SCRAPECREATORS_API_KEY` = (the key from `~/.env`)

---

### Task 12: End-to-end Smoke Test

- [ ] **Step 1: Start dev server**

Run: `cd ~/Code_Projects/culturewire-client && npm run dev`

- [ ] **Step 2: Test URL analysis flow**

1. Navigate to `http://localhost:3000/creator-intel`
2. Paste a real TikTok URL (e.g. `https://www.tiktok.com/@dailymailuk/video/7389963380674612513`)
3. Click "Analyze"
4. Verify redirect to `/creator-intel/[id]`
5. Verify "Analyzing..." state appears
6. Wait for completion. Verify post summary, metrics, creator overview, and themes render.

- [ ] **Step 3: Test topic search flow**

1. Go back to `/creator-intel`
2. Switch to "Search Topic" tab
3. Enter "post production" with region AU
4. Click "Search"
5. Verify redirect and results: top creators grid, trending posts, theme breakdown.

- [ ] **Step 4: Test Find Similar**

1. On any completed analysis, click "Find Similar" with Quick mode
2. Verify creator cards appear
3. Click "Full Analysis" on a card
4. Verify it redirects and starts a new analysis

- [ ] **Step 5: Test history**

1. Go back to `/creator-intel`
2. Verify past analyses appear in the history grid
3. Click one to verify it loads the saved report

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes for Creator Intel"
```
