import type {
  ScrapeCreatorsPost,
  TikTokPost,
  CreatorProfile,
  CreatorSummary,
  PostAnalysisResult,
  CreatorAnalysisResult,
  TopicAnalysisResult,
  ThemeBreakdown,
  InfluencerTier,
} from './types';
import { searchHashtag, searchMultipleHashtags } from './scraper';
import { extractHashtags, generateHashtags } from './hashtags';
import { parseTikTokUrl } from './validators';
import { startActorRun, pollRunToCompletion, getDatasetItems } from '@/lib/apify';

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

function classifyTierByFollowers(followers: number): InfluencerTier {
  if (followers >= 1_000_000) return 'mega';
  if (followers >= 500_000) return 'macro';
  if (followers >= 100_000) return 'mid-tier';
  if (followers >= 10_000) return 'micro';
  return 'nano';
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function estimatePostingFrequency(postCount: number): string {
  if (postCount >= 8) return 'Very active (daily+)';
  if (postCount >= 4) return 'Active (several per week)';
  if (postCount >= 2) return 'Moderate (weekly)';
  return 'Occasional';
}

// Store extracted author metadata from Apify results
interface AuthorMeta {
  avatar?: string;
  displayName?: string;
  fans?: number;
}

// Module-level cache for author metadata extracted from Apify results
const authorMetaCache: Record<string, AuthorMeta> = {};

function buildCreatorProfile(posts: TikTokPost[], username: string): CreatorProfile {
  const userPosts = posts.filter((p) => p.username === username);
  const meta = authorMetaCache[username];

  if (userPosts.length === 0) {
    return {
      username,
      display_name: meta?.displayName || null,
      avatar_url: meta?.avatar || null,
      follower_count: meta?.fans || null,
      region: 'unknown',
      tier: meta?.fans ? classifyTierByFollowers(meta.fans) : 'nano',
      follower_estimate: meta?.fans ? formatFollowers(meta.fans) : null,
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

  const themes = topHashtags.slice(0, 5);

  // Use follower count for tier if available, otherwise fall back to avg views
  const tier = meta?.fans ? classifyTierByFollowers(meta.fans) : classifyTier(avgViews);

  return {
    username,
    display_name: meta?.displayName || null,
    avatar_url: meta?.avatar || null,
    follower_count: meta?.fans || null,
    region: userPosts[0].region,
    tier,
    follower_estimate: meta?.fans ? formatFollowers(meta.fans) : null,
    avg_views: avgViews,
    avg_likes: avgLikes,
    avg_shares: avgShares,
    posting_frequency: estimatePostingFrequency(userPosts.length),
    top_hashtags: topHashtags,
    content_themes: themes,
    posts_analyzed: userPosts.length,
  };
}

// Convert Apify TikTok scraper result to our TikTokPost type
function apifyToTikTokPost(raw: Record<string, unknown>): TikTokPost | null {
  const authorMeta = raw.authorMeta as Record<string, unknown> | undefined;
  const username = (authorMeta?.name as string) || (raw.author as string) || '';
  if (!username) return null;

  // Cache author metadata for profile building
  if (authorMeta && !authorMetaCache[username]) {
    authorMetaCache[username] = {
      avatar: (authorMeta.avatar as string) || undefined,
      displayName: (authorMeta.nickName as string) || (authorMeta.name as string) || undefined,
      fans: (authorMeta.fans as number) || undefined,
    };
  }

  const views = (raw.playCount as number) || 0;
  const likes = (raw.diggCount as number) || 0;
  const comments = (raw.commentCount as number) || 0;
  const shares = (raw.shareCount as number) || 0;
  const totalEng = likes + comments + shares;
  const engRate = views > 0 ? (totalEng / views) * 100 : 0;

  const desc = (raw.text as string) || '';
  const hashtags = ((raw.hashtags as { name: string }[]) || []).map((h) => h.name?.toLowerCase()).filter(Boolean);
  const videoUrl = (raw.webVideoUrl as string) || '';
  const awemeId = (raw.id as string) || videoUrl.split('/').pop() || '';

  return {
    aweme_id: awemeId,
    username,
    description: desc,
    region: 'unknown',
    url: videoUrl || `https://www.tiktok.com/@${username}/video/${awemeId}`,
    stats: {
      views,
      likes,
      comments,
      shares,
      engagement_rate: Math.round(engRate * 100) / 100,
    },
    hashtags: hashtags.length > 0 ? hashtags : extractHashtags(desc),
  };
}

export async function analyzePost(
  input: string,
  region: string
): Promise<PostAnalysisResult> {
  const parsed = parseTikTokUrl(input);
  if (!parsed) throw new Error('Invalid TikTok URL');

  const { username, awemeId } = parsed;

  // Step 1: Use Apify to search for the creator's content directly
  const hasApify = !!process.env.APIFY_API_KEY;
  let allPosts: TikTokPost[] = [];
  let targetPost: TikTokPost | undefined;

  if (hasApify) {
    try {
      // Search for the creator by username via Apify TikTok scraper
      const { runId } = await startActorRun('clockworks/tiktok-scraper', {
        searchQueries: [`@${username}`],
        resultsPerPage: 50,
        searchSection: '/video',
        proxyCountryCode: region === 'US' ? 'US' : 'None',
      });

      const run = await pollRunToCompletion(runId, 120_000);
      if (run.defaultDatasetId) {
        const items = await getDatasetItems(run.defaultDatasetId, 100);
        for (const item of items) {
          const post = apifyToTikTokPost(item);
          if (post) allPosts.push(post);
        }
      }

      targetPost = allPosts.find((p) => p.aweme_id === awemeId);
    } catch (err) {
      console.error('Apify TikTok search failed, falling back to ScrapeCreators:', err);
    }
  }

  // Step 2: Fallback to ScrapeCreators if Apify didn't find enough
  if (allPosts.length === 0) {
    const usernameClean = username.replace(/[._]/g, '');
    const seedHashtags = [username, usernameClean, 'fyp', 'viral'].filter(
      (v, i, a) => a.indexOf(v) === i
    ).slice(0, 4);
    const responses = await searchMultipleHashtags(seedHashtags, region);
    for (const res of responses) {
      allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
    }
    targetPost = allPosts.find((p) => p.aweme_id === awemeId);
  }

  // Filter to creator's posts
  let creatorPosts = allPosts.filter((p) => p.username === username);

  // Step 3: If we found creator posts, use their hashtags to expand via ScrapeCreators
  if (creatorPosts.length > 0) {
    const creatorHashtags = creatorPosts
      .flatMap((p) => p.hashtags)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);
    if (creatorHashtags.length > 0) {
      const moreResults = await searchMultipleHashtags(creatorHashtags, region);
      for (const res of moreResults) {
        allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
      }
      if (!targetPost) {
        targetPost = allPosts.find((p) => p.aweme_id === awemeId);
      }
      creatorPosts = allPosts.filter((p) => p.username === username);
    }
  }

  // Step 4: Use the target post if found, otherwise best creator post, otherwise synthetic
  if (!targetPost) {
    if (creatorPosts.length > 0) {
      targetPost = creatorPosts.sort((a, b) => b.stats.views - a.stats.views)[0];
    } else {
      targetPost = {
        aweme_id: awemeId,
        username,
        description: `Post by @${username}`,
        region: region,
        url: `https://www.tiktok.com/@${username}/video/${awemeId}`,
        stats: { views: 0, likes: 0, comments: 0, shares: 0, engagement_rate: 0 },
        hashtags: [],
      };
    }
  }

  // Step 5: Expand search using the post's hashtags for creator profile
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

  // Get creator's top posts for the report
  const creatorTopPosts = allPosts
    .filter((p) => p.username === username && p.aweme_id !== targetPost.aweme_id)
    .sort((a, b) => b.stats.views - a.stats.views)
    .slice(0, 10);

  return {
    kind: 'post',
    post: targetPost,
    creator,
    creator_top_posts: creatorTopPosts,
    themes,
  };
}

export async function analyzeCreator(
  username: string,
  region: string
): Promise<CreatorAnalysisResult> {
  const hasApify = !!process.env.APIFY_API_KEY;
  let allPosts: TikTokPost[] = [];

  // Step 1: Use Apify to search for the creator's content
  if (hasApify) {
    try {
      const { runId } = await startActorRun('clockworks/tiktok-scraper', {
        searchQueries: [`@${username}`],
        resultsPerPage: 100,
        searchSection: '/video',
        proxyCountryCode: region === 'US' ? 'US' : 'None',
      });

      const run = await pollRunToCompletion(runId, 120_000);
      if (run.defaultDatasetId) {
        const items = await getDatasetItems(run.defaultDatasetId, 200);
        for (const item of items) {
          const post = apifyToTikTokPost(item);
          if (post) allPosts.push(post);
        }
      }
    } catch (err) {
      console.error('Apify creator search failed, falling back to ScrapeCreators:', err);
    }
  }

  // Step 2: Fallback/supplement with ScrapeCreators
  if (allPosts.filter((p) => p.username === username).length < 5) {
    const cleanName = username.replace(/[._]/g, '');
    const seedHashtags = [username, cleanName, 'fyp', 'viral'].filter(
      (v, i, a) => a.indexOf(v) === i
    ).slice(0, 4);
    const responses = await searchMultipleHashtags(seedHashtags, region);
    for (const res of responses) {
      allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
    }
  }

  // Step 3: Expand with creator's own hashtags
  const creatorPosts = allPosts.filter((p) => p.username === username);
  if (creatorPosts.length > 0) {
    const creatorHashtags = creatorPosts
      .flatMap((p) => p.hashtags)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);
    if (creatorHashtags.length > 0) {
      const moreResults = await searchMultipleHashtags(creatorHashtags, region);
      for (const res of moreResults) {
        allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
      }
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
  const topPosts = allPosts
    .filter((p) => p.username === username)
    .sort((a, b) => b.stats.views - a.stats.views)
    .slice(0, 10);

  return {
    kind: 'creator',
    creator,
    top_posts: topPosts,
    themes: creator.content_themes,
  };
}

export async function analyzeTopic(
  topic: string,
  region: string
): Promise<TopicAnalysisResult> {
  const hashtags = generateHashtags(topic);
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

  const byCreator: Record<string, TikTokPost[]> = {};
  for (const post of allPosts) {
    if (!byCreator[post.username]) byCreator[post.username] = [];
    byCreator[post.username].push(post);
  }

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

  const trendingPosts = [...allPosts]
    .sort((a, b) => b.stats.views - a.stats.views)
    .slice(0, 20);

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
  sourceAnalysis: PostAnalysisResult | CreatorAnalysisResult | TopicAnalysisResult,
  depth: 'quick' | 'deep',
  region: string
): Promise<CreatorSummary[]> {
  let hashtags: string[];

  if (sourceAnalysis.kind === 'post') {
    hashtags = sourceAnalysis.post.hashtags.slice(0, depth === 'quick' ? 5 : 10);
    if (depth === 'deep') {
      for (const theme of sourceAnalysis.themes) {
        if (!hashtags.includes(theme)) hashtags.push(theme);
      }
      hashtags = hashtags.slice(0, 15);
    }
  } else if (sourceAnalysis.kind === 'creator') {
    hashtags = sourceAnalysis.creator.top_hashtags.slice(0, depth === 'quick' ? 5 : 10);
    if (depth === 'deep') {
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

  const excludeUsername = sourceAnalysis.kind === 'post' ? sourceAnalysis.creator.username : null;

  const byCreator: Record<string, TikTokPost[]> = {};
  for (const post of allPosts) {
    if (post.username === excludeUsername) continue;
    if (!byCreator[post.username]) byCreator[post.username] = [];
    byCreator[post.username].push(post);
  }

  const tierOrder: InfluencerTier[] = ['nano', 'micro', 'mid-tier', 'macro', 'mega'];
  const sourceTier = sourceAnalysis.kind === 'post' ? sourceAnalysis.creator.tier : null;
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
