# Creator Intel - Design Spec

**Date:** 2026-04-09
**Project:** CultureWire (culturewire-client)
**Feature:** Creator Intel - TikTok post and creator analysis tool

## Summary

A new top-level route within CultureWire that lets users paste a TikTok URL or search by topic to get a detailed analysis of posts, creators, and similar accounts. Uses ScrapeCreators API with a shared server-side key.

## User Stories

1. As a user, I can paste a TikTok post URL and get a full report on the post metrics and creator profile.
2. As a user, I can search a topic (e.g. "color grading") and see top creators and trending posts in that space.
3. As a user, I can click "Find Similar" on any analysis to discover creators with matching themes at the same or higher influencer tier.
4. As a user, I can revisit my past analyses from the main Creator Intel page.

## Routes

```
/creator-intel          - Main page: URL input, topic search, analysis history
/creator-intel/[id]     - Analysis report page (scrollable single-page report)
```

## API Routes

```
POST /api/creator-intel/analyze       - Start an analysis (accepts TikTok URL or topic string)
GET  /api/creator-intel/[id]          - Fetch a saved analysis by ID
POST /api/creator-intel/[id]/similar  - Find similar creators (accepts depth: quick|deep)
GET  /api/creator-intel/history       - Fetch user's past analyses
```

## Database

### Table: `creator_intel_analyses`

| Column     | Type      | Notes                                          |
|------------|-----------|------------------------------------------------|
| id         | uuid      | Primary key, default gen_random_uuid()         |
| user_id    | uuid      | FK to auth.users, RLS scoped                   |
| type       | text      | 'post', 'creator', or 'topic'                  |
| input      | text      | The URL or topic string the user entered        |
| status     | text      | 'pending', 'analyzing', 'complete', 'failed'   |
| results    | jsonb     | Full analysis results                          |
| created_at | timestamptz | Default now()                                |

**RLS Policy:** Users can only read/write their own rows (`auth.uid() = user_id`).

## API Key

The ScrapeCreators API key is stored as `SCRAPECREATORS_API_KEY` in Railway environment variables. No per-user key management. All API calls to ScrapeCreators happen server-side.

## ScrapeCreators Integration

### Post Analysis Flow

1. Parse TikTok URL to extract `username` and `aweme_id`
2. Search ScrapeCreators hashtag endpoint using the username as a hashtag (and common niche tags if detectable from the URL path)
3. Scan results for the specific post by `aweme_id` to get its full metadata (description, stats, hashtags)
4. Use the discovered hashtags from that post to run broader searches, building the creator's profile from their other content across those hashtags
5. Compile report

### Topic Search Flow

1. Generate 8-12 relevant hashtags from the topic string
2. Call ScrapeCreators hashtag endpoint for each hashtag (parallel)
3. Deduplicate posts, group by creator
4. Rank creators by total engagement across found posts
5. Classify influencer tiers, identify content themes

### Find Similar Flow

1. Extract hashtags and content themes from the source analysis
2. **Quick mode:** Search same hashtags, filter by matching themes + same or higher tier. ~5-10 credits.
3. **Deep mode:** Expand to adjacent/related hashtags, broader search. ~15-25 credits.
4. Return ranked list of creator cards

### Influencer Tier Classification

| Tier     | Followers   |
|----------|-------------|
| Nano     | 1K-10K      |
| Micro    | 10K-100K    |
| Mid-tier | 100K-500K   |
| Macro    | 500K-1M     |
| Mega     | >1M         |

### Hashtag Generation

For topic searches, generate hashtags across these categories:
- **Primary:** Direct topic hashtags
- **Product:** Related products/brands
- **Lifestyle:** Associated activities
- **Regional:** Location-specific (default AU)
- **Problem/Solution:** Pain points and fixes

## Report Layout

### Post Analysis Report (`/creator-intel/[id]`)

1. **Post Summary** - Video description, hashtags, region flag, link to original TikTok
2. **Post Metrics** - Views, likes, comments, shares, engagement rate
3. **Creator Overview** - Username, follower count, influencer tier badge, bio
4. **Creator Metrics** - Average engagement across recent posts, posting frequency
5. **Content Themes** - Top hashtags, content categories, format breakdown
6. **Find Similar** - Quick/Deep toggle button, results appear as creator card grid

### Topic Search Report (`/creator-intel/[id]`)

1. **Topic Summary** - Search term, hashtags searched, total posts found, region
2. **Top Creators** - Grid of creator cards ranked by engagement, clickable to full analysis
3. **Trending Posts** - Top performing posts with TikTok links
4. **Theme Breakdown** - Sub-topic traction analysis

### Creator Card Component

Used across both report types:
- Profile initial + color (no external avatar)
- Username and follower count
- Influencer tier badge (reuse existing `influencer-tier-badge.tsx` pattern)
- Top content themes as small tags
- Average engagement rate
- "Analyze" button to trigger full creator analysis

## Main Page Layout (`/creator-intel`)

1. **Header** - "Creator Intel" title
2. **Input Section** - Two tabs: "Analyze URL" (paste field) and "Search Topic" (text input + region selector)
3. **History** - Grid of past analysis cards, sorted by most recent, showing type, input, status, date

## Components

```
/src/components/creator-intel/
  url-input.tsx           - TikTok URL paste field with validation
  topic-search.tsx        - Topic input with region selector
  analysis-report.tsx     - Full scrollable report (post or topic)
  creator-card.tsx        - Reusable creator summary card
  similar-results.tsx     - Find Similar results grid with Quick/Deep toggle
  tier-badge.tsx          - Influencer tier badge (extend existing pattern)
  history-grid.tsx        - Past analyses grid for main page
  post-metrics.tsx        - Post stats display component
  theme-tags.tsx          - Content theme tag list
```

## Styling

Matches existing CultureWire patterns:
- Dark theme
- Same card styles, rounded corners, subtle borders
- Existing badge component patterns
- Lucide icons
- Tailwind utility classes
- sonner for toast notifications

## Auth

Uses existing CultureWire auth (Supabase magic link). No additional auth required. Nav header gets a new "Creator Intel" link.

## Error Handling

- Invalid TikTok URL: toast error with format hint
- ScrapeCreators API failure: save analysis as 'failed' status, show retry button
- No results found: friendly empty state with suggestion to try different hashtags
- Rate limiting: queue requests if needed, show progress indicator

## Credit Usage Estimates

| Action                | Credits | Approx Cost (Freelance) |
|-----------------------|---------|------------------------|
| Single post analysis  | 3-5     | $0.006-$0.01           |
| Topic search          | 8-12    | $0.016-$0.024          |
| Find Similar (Quick)  | 5-10    | $0.01-$0.02            |
| Find Similar (Deep)   | 15-25   | $0.03-$0.05            |
