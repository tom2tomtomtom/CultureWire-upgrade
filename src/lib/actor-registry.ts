import { z } from 'zod';
import type { Platform } from './types';

export interface ActorRegistryEntry {
  id: string;
  platform: Platform;
  displayName: string;
  description: string;
  useCases: string[];
  inputSchema: z.ZodType;
  buildInput: (params: PlannerParams) => Record<string, unknown>;
  extractFields: string[];
  costProfile: {
    model: 'free' | 'pay_per_result' | 'flat';
    estimatedCostPer100: number; // cents
  };
  defaults: {
    maxResults: number;
    timeout: number;
  };
}

export interface PlannerParams {
  keywords: string[];
  brands: string[];
  subreddits: string[];
  hashtags: string[];
  urls: string[];
  geo: string;
  timeRange: string;
  maxResults: number;
}

// ============================================
// INPUT SCHEMAS
// ============================================

const RedditInputSchema = z.object({
  searches: z.array(z.string()).min(1),
  searchCommunityName: z.string().optional(),
  searchPosts: z.boolean().default(true),
  searchComments: z.boolean().default(false),
  sort: z.enum(['relevance', 'hot', 'top', 'new', 'rising', 'comments']).default('top'),
  time: z.enum(['all', 'hour', 'day', 'week', 'month', 'year']).default('month'),
  maxItems: z.number().min(1).max(500).default(100),
  maxPostCount: z.number().min(1).max(100).default(50),
  maxComments: z.number().min(0).max(50).default(10),
  proxy: z.object({
    useApifyProxy: z.boolean().default(true),
    apifyProxyGroups: z.array(z.string()).default(['RESIDENTIAL']),
  }).default({ useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }),
});

const TrustpilotInputSchema = z.object({
  startUrls: z.array(z.string().url()).min(1),
  maxItems: z.number().min(1).max(1000).default(200),
});

const YouTubeInputSchema = z.object({
  q: z.string().min(1),
  maxResults: z.number().min(1).max(500).default(100),
  order: z.enum(['date', 'rating', 'relevance', 'title', 'viewCount']).default('relevance'),
  publishedAfter: z.string().optional(),
  regionCode: z.string().length(2).optional(),
});

const TikTokInputSchema = z.object({
  searchQueries: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  resultsPerPage: z.number().min(1).max(500).default(100),
  searchSection: z.enum(['', '/video', '/user']).default('/video'),
  proxyCountryCode: z.string().default('None'),
});

const InstagramInputSchema = z.object({
  hashtags: z.array(z.string()).min(1),
  resultsLimit: z.number().min(1).max(500).default(100),
});

const GoogleTrendsInputSchema = z.object({
  keywords: z.array(z.string()).min(1).max(5),
  geo: z.string().default('US'),
  timeRange: z.enum([
    'now 1-H', 'now 4-H', 'now 1-d', 'now 7-d',
    'today 1-m', 'today 3-m', 'today 12-m', 'today 5-y', 'all',
  ]).default('today 12-m'),
  includeRelatedSearches: z.boolean().default(true),
  includeRelatedTopics: z.boolean().default(true),
  includeGeoData: z.boolean().default(true),
  includeInterestOverTime: z.boolean().default(true),
});

// ============================================
// REGISTRY
// ============================================

export const ACTOR_REGISTRY: Record<string, ActorRegistryEntry> = {
  reddit: {
    id: 'reddit-direct-api',
    platform: 'reddit',
    displayName: 'Reddit Scraper',
    description: 'Search subreddits, posts, and comments. Best for community sentiment, product discussions, and niche opinions.',
    useCases: [
      'Community sentiment analysis',
      'Product feedback and complaints',
      'Niche audience understanding',
      'Competitor mentions in discussions',
      'Trend identification in communities',
    ],
    inputSchema: RedditInputSchema,
    buildInput: (params) => ({
      searches: params.keywords,
      searchCommunityName: params.subreddits[0] || undefined,
      searchPosts: true,
      searchComments: true,
      sort: 'top',
      time: 'month',
      maxItems: Math.min(params.maxResults, 200),
      maxPostCount: 50,
      maxComments: 10,
      proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
    }),
    extractFields: ['title', 'body', 'url', 'score', 'numberOfComments', 'communityName', 'createdAt', 'author'],
    costProfile: { model: 'free', estimatedCostPer100: 0 },
    defaults: { maxResults: 100, timeout: 300 },
  },

  trustpilot: {
    id: 'agents/trustpilot-reviews',
    platform: 'trustpilot',
    displayName: 'Trustpilot Reviews',
    description: 'Extract reviews from Trustpilot. Best for brand reputation and competitive review benchmarking.',
    useCases: [
      'Brand reputation analysis',
      'Competitive review benchmarking',
      'Customer pain point identification',
      'Service quality assessment',
    ],
    inputSchema: TrustpilotInputSchema,
    buildInput: (params) => ({
      startUrls: params.brands.map(
        (brand) => `https://www.trustpilot.com/review/${brand.toLowerCase().replace(/\s+/g, '')}.com`
      ),
      maxItems: Math.min(params.maxResults, 500),
    }),
    extractFields: ['title', 'text', 'rating', 'date', 'author', 'companyReply', 'url'],
    costProfile: { model: 'pay_per_result', estimatedCostPer100: 5 },
    defaults: { maxResults: 200, timeout: 180 },
  },

  youtube: {
    id: 'grow_media/youtube-search-api',
    platform: 'youtube',
    displayName: 'YouTube Search',
    description: 'Search YouTube videos with metadata. Best for content landscape and influencer identification.',
    useCases: [
      'Content landscape analysis',
      'Influencer identification',
      'Video topic trend analysis',
      'Competitor content audit',
    ],
    inputSchema: YouTubeInputSchema,
    buildInput: (params) => ({
      q: params.keywords.length <= 3
        ? params.keywords.join(' | ')
        : params.keywords.slice(0, 3).join(' | '),
      maxResults: Math.min(params.maxResults, 200),
      order: 'relevance',
      regionCode: params.geo || 'US',
    }),
    extractFields: ['title', 'text', 'channelName', 'date', 'viewCount', 'likes', 'commentsCount', 'url', 'thumbnailUrl', 'duration', 'hashtags'],
    costProfile: { model: 'pay_per_result', estimatedCostPer100: 10 },
    defaults: { maxResults: 100, timeout: 120 },
  },

  tiktok: {
    id: 'clockworks/tiktok-scraper',
    platform: 'tiktok',
    displayName: 'TikTok Scraper',
    description: 'Scrape TikTok by hashtag or search. Best for viral trends and Gen Z sentiment.',
    useCases: [
      'Viral trend identification',
      'Gen Z / youth sentiment',
      'Hashtag campaign performance',
      'Short-form content landscape',
    ],
    inputSchema: TikTokInputSchema,
    buildInput: (params) => {
      // Sanitize hashtags for TikTok — must be clean alphanumeric, no spaces
      const cleanHashtags = (params.hashtags || [])
        .map((h) => h.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        .filter((h) => h.length > 0);
      return {
        searchQueries: params.keywords.length > 0 ? params.keywords : undefined,
        hashtags: cleanHashtags.length > 0 ? cleanHashtags : undefined,
        resultsPerPage: Math.min(params.maxResults, 200),
        searchSection: '/video',
        proxyCountryCode: params.geo === 'US' ? 'US' : 'None',
      };
    },
    extractFields: ['text', 'createTime', 'authorMeta', 'diggCount', 'shareCount', 'playCount', 'commentCount', 'hashtags', 'webVideoUrl'],
    costProfile: { model: 'pay_per_result', estimatedCostPer100: 20 },
    defaults: { maxResults: 100, timeout: 300 },
  },

  google_trends: {
    id: 'agenscrape/google-trends-scraper',
    platform: 'google_trends',
    displayName: 'Google Trends',
    description: 'Interest over time, related queries, geographic data. Best for macro trend analysis.',
    useCases: [
      'Macro trend identification',
      'Keyword interest comparison',
      'Geographic demand mapping',
      'Seasonal pattern analysis',
    ],
    inputSchema: GoogleTrendsInputSchema,
    buildInput: (params) => ({
      keywords: params.keywords.slice(0, 5),
      geo: params.geo || 'US',
      timeRange: 'today 12-m',
      includeRelatedSearches: true,
      includeRelatedTopics: true,
      includeGeoData: true,
      includeInterestOverTime: true,
    }),
    extractFields: ['keyword', 'interestOverTime', 'relatedQueries', 'relatedTopics', 'interestByRegion'],
    costProfile: { model: 'pay_per_result', estimatedCostPer100: 250 },
    defaults: { maxResults: 5, timeout: 120 },
  },

  instagram: {
    id: 'apify/instagram-hashtag-scraper',
    platform: 'instagram',
    displayName: 'Instagram',
    description: 'Scrape Instagram posts and reels by hashtag. Returns real posts with captions, likes, comments, images, creators, and locations.',
    useCases: [
      'Visual trend identification',
      'Influencer and creator landscape',
      'Brand aesthetic benchmarking',
      'Hashtag performance analysis',
      'Audience sentiment via comments',
    ],
    inputSchema: InstagramInputSchema,
    buildInput: (params) => {
      const raw = params.hashtags.length > 0 ? params.hashtags : params.keywords.slice(0, 3);
      // Sanitize: strip spaces and special chars, Instagram hashtags must be clean alphanumeric
      const hashtags = raw
        .map((h) => h.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        .filter((h) => h.length > 0);
      return {
        hashtags: hashtags.length > 0 ? hashtags : ['trending'],
        resultsLimit: Math.min(params.maxResults, 200),
      };
    },
    extractFields: ['caption', 'likesCount', 'commentsCount', 'timestamp', 'ownerUsername', 'hashtags', 'url', 'displayUrl', 'locationName', 'type'],
    costProfile: { model: 'pay_per_result', estimatedCostPer100: 23 },
    defaults: { maxResults: 100, timeout: 300 },
  },
};

const TwitterInputSchema = z.object({
  searchTerms: z.array(z.string()).min(1),
  maxTweets: z.number().min(1).max(500).default(100),
  sort: z.enum(['Latest', 'Top']).default('Top'),
});

const FacebookInputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(10).max(200).default(50),
});

const NewsInputSchema = z.object({
  keywords: z.array(z.string()).min(1),
  language: z.string().default('en'),
  pageSize: z.number().min(1).max(100).default(20),
});

// Extended platforms (Phase 3)
ACTOR_REGISTRY.twitter = {
  id: 'apidojo/tweet-scraper',
  platform: 'twitter' as Platform,
  displayName: 'Twitter/X',
  description: 'Search Twitter/X posts. Best for real-time conversation and trending topics.',
  useCases: ['Real-time conversation tracking', 'Trending topic analysis', 'Brand mention monitoring', 'Public sentiment on current events'],
  inputSchema: TwitterInputSchema,
  buildInput: (params) => ({
    searchTerms: params.keywords.slice(0, 5),
    maxItems: Math.min(params.maxResults, 200),
    sort: 'Latest',
  }),
  extractFields: ['text', 'fullText', 'createdAt', 'author', 'replyCount', 'retweetCount', 'likeCount', 'viewCount', 'url', 'twitterUrl'],
  costProfile: { model: 'pay_per_result', estimatedCostPer100: 15 },
  defaults: { maxResults: 100, timeout: 180 },
};

// LinkedIn: requires paid Apify rental — disabled
// Rent at https://console.apify.com/actors/kfiWbq3boy3dWKbiL then add back

ACTOR_REGISTRY.facebook = {
  id: 'powerai/facebook-post-search-scraper',
  platform: 'facebook' as Platform,
  displayName: 'Facebook',
  description: 'Search Facebook posts. Best for community insights and older demographics.',
  useCases: ['Community group insights', 'Brand page engagement', 'Older demographic sentiment', 'Local community trends'],
  inputSchema: FacebookInputSchema,
  buildInput: (params) => ({
    query: params.keywords.slice(0, 3).join(' '),
    maxResults: Math.min(params.maxResults, 100),
  }),
  extractFields: ['message', 'author', 'author_title', 'reactions_count', 'comments_count', 'reshare_count', 'timestamp', 'url', 'type'],
  costProfile: { model: 'pay_per_result', estimatedCostPer100: 15 },
  defaults: { maxResults: 50, timeout: 180 },
};

ACTOR_REGISTRY.news = {
  id: 'news-api-direct',
  platform: 'news' as Platform,
  displayName: 'News',
  description: 'Search news articles via NewsAPI. Best for mainstream media coverage and press mentions.',
  useCases: ['Press coverage monitoring', 'Industry news tracking', 'Crisis monitoring', 'Competitor news analysis'],
  inputSchema: NewsInputSchema,
  buildInput: (params) => ({
    keywords: params.keywords.slice(0, 5),
    language: 'en',
    pageSize: Math.min(params.maxResults, 100),
  }),
  extractFields: ['title', 'description', 'content', 'author', 'source', 'publishedAt', 'url', 'urlToImage'],
  costProfile: { model: 'free', estimatedCostPer100: 0 },
  defaults: { maxResults: 20, timeout: 30 },
};

export function getActorsForPlatforms(platforms: Platform[]): ActorRegistryEntry[] {
  return platforms.map((p) => ACTOR_REGISTRY[p]);
}

export function getRegistrySummary(): string {
  return Object.values(ACTOR_REGISTRY)
    .map((a) => `| ${a.displayName} | ${a.description} | ~$${(a.costProfile.estimatedCostPer100 / 100).toFixed(2)}/100 results |`)
    .join('\n');
}
