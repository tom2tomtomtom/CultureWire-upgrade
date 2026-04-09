import type {
  ScrapeCreatorsPost,
  TikTokPost,
  CreatorProfile,
  CreatorSummary,
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

  // Step 1: Cast a wide net with high-traffic hashtags to find the post or creator
  // Searching username as hashtag rarely works, so use popular discovery hashtags
  const discoveryHashtags = [
    'fyp', 'viral', 'trending', 'foryou', 'foryoupage',
    'edit', 'tutorial', 'creative', 'film', 'video',
  ];
  // Also try the username stripped of dots/underscores
  const usernameClean = username.replace(/[._]/g, '');
  const firstBatch = [username, usernameClean, ...discoveryHashtags.slice(0, 8)].filter(
    (v, i, a) => a.indexOf(v) === i
  ).slice(0, 10);

  const initialResponses = await searchMultipleHashtags(firstBatch, region);

  let allPosts: TikTokPost[] = [];
  for (const res of initialResponses) {
    allPosts = allPosts.concat(res.aweme_list.map(toTikTokPost));
  }

  // Try to find the target post or any post by this creator
  let targetPost = allPosts.find((p) => p.aweme_id === awemeId);
  let creatorPosts = allPosts.filter((p) => p.username === username);

  // Step 2: If we found creator posts, use their hashtags to find more
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

  // Step 3: Use the target post if found, otherwise best creator post, otherwise synthetic
  if (!targetPost) {
    if (creatorPosts.length > 0) {
      targetPost = creatorPosts.sort((a, b) => b.stats.views - a.stats.views)[0];
    } else {
      // Create a minimal post entry. Stats will be zero but creator profile
      // may still be populated from the broader search results.
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
  sourceAnalysis: PostAnalysisResult | TopicAnalysisResult,
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
