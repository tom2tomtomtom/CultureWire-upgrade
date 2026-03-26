/**
 * Deterministic engagement scoring for scraped items.
 * Scores each item 0-100 based on platform-specific engagement metrics.
 * Runs BEFORE synthesis so Claude gets pre-scored data.
 */

/**
 * Normalize raw items from Apify to consistent field names.
 * Different Apify actors use different schemas — this maps them all
 * to the canonical field names our scoring functions expect.
 */
export function normalizeItems(
  platform: string,
  items: Record<string, unknown>[]
): Record<string, unknown>[] {
  switch (platform) {
    case 'youtube':
      return items.map(normalizeYouTubeItem);
    case 'instagram':
      return items.map(normalizeInstagramItem);
    case 'tiktok':
      return items.map(normalizeTikTokItem);
    default:
      return items;
  }
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function normalizeYouTubeItem(item: Record<string, unknown>): Record<string, unknown> {
  const stats = item.statistics as Record<string, unknown> | undefined;
  const snippet = item.snippet as Record<string, unknown> | undefined;
  const contentDetails = item.contentDetails as Record<string, unknown> | undefined;

  return {
    ...item,
    // Title: try snippet.title → title
    title: str(item.title || snippet?.title || item.name || ''),
    // Description: try snippet.description → description → text
    description: str(item.description || snippet?.description || item.text || ''),
    // Channel: grow_media actor uses channelName, YouTube API uses channelTitle
    channelTitle: str(item.channelTitle || snippet?.channelTitle || item.channelName || item.channel || ''),
    // Published date: grow_media uses "date", YouTube API uses "publishedAt"
    publishedAt: str(item.publishedAt || snippet?.publishedAt || item.date || item.uploadDate || ''),
    // Video ID
    id: str(item.id || item.videoId || ''),
    videoId: str(item.videoId || item.id || ''),
    // Views: try multiple field names + nested statistics
    viewCount: num(item.viewCount || stats?.viewCount || item.views || item.view_count || 0),
    // Likes: grow_media uses "likes", YouTube API uses "likeCount"
    likeCount: num(item.likeCount || stats?.likeCount || item.likes || item.like_count || item.numberOfLikes || 0),
    // Comments: grow_media uses "commentsCount", YouTube API uses "commentCount"
    commentCount: num(item.commentCount || item.commentsCount || stats?.commentCount || item.comments || item.comment_count || item.numberOfComments || 0),
    // Duration
    duration: str(item.duration || contentDetails?.duration || ''),
    // URL
    url: str(item.url || item.link || ''),
    // Thumbnails: grow_media uses thumbnailUrl
    thumbnails: item.thumbnails || snippet?.thumbnails || item.thumbnailUrl || item.thumbnail || null,
  };
}

function normalizeInstagramItem(item: Record<string, unknown>): Record<string, unknown> {
  // Instagram scraper can return post-level data or hashtag-level metadata.
  // Post-level fields: likesCount, commentsCount, caption, ownerUsername, displayUrl, url, timestamp
  // Hashtag-level (apify/instagram-scraper): name, postsCount, url, searchTerm (no engagement!)
  // Some actors: likes, comments (no "Count" suffix)

  // Detect hashtag metadata vs post data
  const isHashtagMeta = Boolean(item.postsCount && item.name && !item.likesCount && !item.likes && !item.caption);

  if (isHashtagMeta) {
    // This is hashtag overview data — map to a useful structure
    return {
      ...item,
      // Use hashtag name as title
      caption: `#${item.name} — ${num(item.postsCount).toLocaleString()} posts`,
      likesCount: 0,
      commentsCount: 0,
      videoViewCount: 0,
      ownerUsername: '',
      // Build a useful explore URL
      url: str(item.url || `https://www.instagram.com/explore/tags/${item.name}`),
      displayUrl: '',
      timestamp: '',
      hashtags: [str(item.name)],
      // Preserve metadata for analysis
      _isHashtagMeta: true,
      _postsCount: num(item.postsCount),
    };
  }

  return {
    ...item,
    // Likes: try multiple field names
    likesCount: num(item.likesCount || item.likes || item.likeCount || item.like_count || 0),
    // Comments: try multiple field names
    commentsCount: num(item.commentsCount || item.comments || item.commentCount || item.comment_count || 0),
    // Video views
    videoViewCount: num(item.videoViewCount || item.videoViews || item.video_view_count || 0),
    // Caption
    caption: str(item.caption || item.text || item.description || ''),
    // Owner
    ownerUsername: str(item.ownerUsername || item.username || item.owner || item.authorUsername || ''),
    // URL
    url: str(item.url || item.link || item.postUrl || ''),
    // Display image
    displayUrl: str(item.displayUrl || item.thumbnailUrl || item.imageUrl || item.displaySrc || ''),
    // Timestamp
    timestamp: str(item.timestamp || item.takenAt || item.date || item.createdAt || ''),
    // Hashtags
    hashtags: item.hashtags || item.tags || [],
  };
}

function normalizeTikTokItem(item: Record<string, unknown>): Record<string, unknown> {
  const stats = item.stats as Record<string, unknown> | undefined;
  const videoMeta = item.videoMeta as Record<string, unknown> | undefined;
  const authorMeta = item.authorMeta as Record<string, unknown> | undefined;

  return {
    ...item,
    // Plays: try stats.playCount, playCount, plays
    playCount: num(item.playCount || stats?.playCount || item.plays || item.play_count || 0),
    // Likes: diggCount is TikTok's name for likes
    diggCount: num(item.diggCount || stats?.diggCount || item.likes || item.likeCount || stats?.likeCount || 0),
    // Shares
    shareCount: num(item.shareCount || stats?.shareCount || item.shares || 0),
    // Comments
    commentCount: num(item.commentCount || stats?.commentCount || item.comments || 0),
    // Text
    text: str(item.text || item.desc || item.description || item.caption || ''),
    // Author
    authorMeta: authorMeta || (item.author ? { name: str(item.author) } : undefined),
    // Video meta
    videoMeta: videoMeta || null,
    // Cover/thumbnail
    cover: str(item.cover || videoMeta?.coverUrl || item.thumbnail || ''),
    // URL
    webVideoUrl: str(item.webVideoUrl || item.url || item.link || ''),
  };
}

export interface TopItemDisplay {
  _score: number;
  _tier: string;
  _url: string | null;
  _thumbnail: string | null;
  _creator: string | null;
  _title: string | null;
  _platform_metric: string | null;
}

export interface ScoredItem extends TopItemDisplay {
  _engagement_rate: number | null;
  [key: string]: unknown;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function tierLabel(score: number): string {
  if (score >= 80) return 'STRIKE ZONE';
  if (score >= 65) return 'OPPORTUNITY';
  if (score >= 50) return 'MONITOR';
  return 'SKIP';
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function percentile(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v >= value);
  if (idx === -1) return 100;
  return (idx / sorted.length) * 100;
}

export function scoreItems(
  platform: string,
  items: Record<string, unknown>[]
): ScoredItem[] {
  if (items.length === 0) return [];

  // Normalize field names before scoring
  const normalized = normalizeItems(platform, items);

  switch (platform) {
    case 'reddit':
      return scoreReddit(normalized);
    case 'youtube':
      return scoreYouTube(normalized);
    case 'tiktok':
      return scoreTikTok(normalized);
    case 'instagram':
      return scoreInstagram(normalized);
    case 'trustpilot':
      return scoreTrustpilot(normalized);
    case 'twitter':
      return scoreTwitter(normalized);
    case 'linkedin':
      return scoreLinkedIn(normalized);
    case 'facebook':
      return scoreFacebook(normalized);
    case 'news':
      return scoreNews(normalized);
    default:
      return normalized.map((item) => ({
        ...item,
        _score: 50,
        _tier: 'MONITOR',
        _url: null,
        _thumbnail: null,
        _creator: null,
        _title: String(item.title || item.keyword || '').slice(0, 120) || null,
        _engagement_rate: null,
        _platform_metric: null,
      }));
  }
}

function scoreTwitter(items: Record<string, unknown>[]): ScoredItem[] {
  const likes = items.map((i) => num(i.likeCount || i.favoriteCount || 0));
  const retweets = items.map((i) => num(i.retweetCount || 0));

  return items.map((item, idx) => {
    const likeCount = likes[idx];
    const retweetCount = retweets[idx];
    const replyCount = num(item.replyCount || 0);
    const viewCount = num(item.viewCount || 0);

    const likeP = percentile(likeCount, likes);
    const rtP = percentile(retweetCount, retweets);
    const viralBonus = viewCount > 100000 ? 10 : 0;

    const engScore = clamp(likeP * 0.35 + rtP * 0.35 + viralBonus + 15, 0, 100);

    const user = item.user as Record<string, unknown> | undefined;
    const creator = user?.username || user?.screen_name || item.authorName;

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: null,
      _creator: creator ? `@${creator}` : null,
      _title: String(item.text || item.fullText || '').slice(0, 120) || null,
      _engagement_rate: viewCount > 0 ? Math.round(((likeCount + retweetCount) / viewCount) * 10000) / 100 : null,
      _platform_metric: `${formatNum(likeCount)} likes · ${formatNum(retweetCount)} RTs`,
    };
  });
}

function scoreLinkedIn(items: Record<string, unknown>[]): ScoredItem[] {
  const likes = items.map((i) => num(i.likeCount || i.likes || 0));

  return items.map((item, idx) => {
    const likeCount = likes[idx];
    const commentCount = num(item.commentCount || item.comments || 0);
    const shareCount = num(item.shareCount || item.shares || 0);

    const likeP = percentile(likeCount, likes);
    const commentBonus = clamp(commentCount * 2, 0, 20);
    const shareBonus = clamp(shareCount * 3, 0, 15);

    const engScore = clamp(likeP * 0.4 + commentBonus + shareBonus + 15, 0, 100);

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: null,
      _creator: String(item.authorName || item.author || '') || null,
      _title: String(item.text || item.content || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: `${formatNum(likeCount)} likes · ${formatNum(commentCount)} comments`,
    };
  });
}

function scoreFacebook(items: Record<string, unknown>[]): ScoredItem[] {
  // Handle both old actor (likes/comments/shares) and new powerai actor (reactions_count/comments_count/reshare_count)
  const likes = items.map((i) => num(i.reactions_count || i.likes || i.likeCount || 0));

  return items.map((item, idx) => {
    const likeCount = likes[idx];
    const commentCount = num(item.comments_count || item.comments || item.commentCount || 0);
    const shareCount = num(item.reshare_count || item.shares || item.shareCount || 0);

    const likeP = percentile(likeCount, likes);
    const commentBonus = clamp(commentCount * 1.5, 0, 20);
    const shareBonus = clamp(shareCount * 2, 0, 15);

    const engScore = clamp(likeP * 0.4 + commentBonus + shareBonus + 15, 0, 100);

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: null,
      _creator: String(item.author_title || (typeof item.author === 'object' && item.author !== null ? (item.author as any).name || (item.author as any).title || '' : item.author) || item.authorName || item.pageName || '') || null,
      _title: String(item.message || item.text || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: `${formatNum(likeCount)} reactions · ${formatNum(shareCount)} shares`,
    };
  });
}

function scoreNews(items: Record<string, unknown>[]): ScoredItem[] {
  return items.map((item) => {
    const titleLength = String(item.title || '').length;
    const hasImage = Boolean(item.urlToImage);
    const contentLength = String(item.content || item.description || '').length;

    // News scoring: recency + content quality proxy
    const lengthScore = clamp(contentLength / 20, 0, 30);
    const titleScore = clamp(titleLength / 5, 0, 20);
    const imageBonus = hasImage ? 10 : 0;
    const sourceBonus = item.source ? 15 : 0;

    const engScore = clamp(lengthScore + titleScore + imageBonus + sourceBonus + 10, 0, 100);

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: String(item.urlToImage || '') || null,
      _creator: String(item.source || item.author || '') || null,
      _title: String(item.title || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: String(item.source || ''),
    };
  });
}

function scoreReddit(items: Record<string, unknown>[]): ScoredItem[] {
  const scores = items.map((i) => Number(i.score) || 0);
  const comments = items.map((i) => Number(i.numberOfComments) || 0);

  return items.map((item, idx) => {
    const score = scores[idx];
    const commentCount = comments[idx];
    const upvoteRatio = Number(item.upvoteRatio) || 0.5;

    const scoreP = percentile(score, scores);
    const commentP = percentile(commentCount, comments);
    const ratioBonus = (upvoteRatio - 0.5) * 40;

    const engScore = clamp(scoreP * 0.4 + commentP * 0.35 + ratioBonus + 15, 0, 100);

    const permalink = String(item.permalink || item.url || '');
    const url = permalink.startsWith('http')
      ? permalink
      : permalink
        ? `https://reddit.com${permalink}`
        : null;

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: url,
      _thumbnail:
        item.thumbnail && String(item.thumbnail).startsWith('http')
          ? String(item.thumbnail)
          : null,
      _creator: item.author ? `u/${item.author}` : null,
      _title: String(item.title || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: `${formatNum(score)} upvotes · ${formatNum(commentCount)} comments`,
    };
  });
}

function scoreYouTube(items: Record<string, unknown>[]): ScoredItem[] {
  const views = items.map((i) => Number(i.viewCount) || 0);

  return items.map((item, idx) => {
    const viewCount = views[idx];
    const likeCount = Number(item.likeCount) || 0;
    const commentCount = Number(item.commentCount) || 0;

    const engRate =
      viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
    const viewP = percentile(viewCount, views);
    const engBonus = clamp(engRate * 8, 0, 40);

    const engScore = clamp(viewP * 0.4 + engBonus + 20, 0, 100);

    const videoId = String(item.id || item.videoId || '');

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: videoId
        ? `https://youtube.com/watch?v=${videoId}`
        : String(item.url || '') || null,
      _thumbnail: videoId
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : null,
      _creator: String(item.channelTitle || '') || null,
      _title: String(item.title || '').slice(0, 120) || null,
      _engagement_rate: Math.round(engRate * 100) / 100,
      _platform_metric: `${formatNum(viewCount)} views · ${formatNum(likeCount)} likes`,
    };
  });
}

function scoreTikTok(items: Record<string, unknown>[]): ScoredItem[] {
  const plays = items.map((i) => Number(i.playCount) || 0);

  return items.map((item, idx) => {
    const playCount = plays[idx];
    const likeCount = Number(item.diggCount) || 0;
    const shareCount = Number(item.shareCount) || 0;
    const commentCount = Number(item.commentCount) || 0;

    const engRate =
      playCount > 0
        ? ((likeCount + commentCount + shareCount) / playCount) * 100
        : 0;
    const viralSignal = playCount > 0 ? (shareCount / playCount) * 100 : 0;
    const playP = percentile(playCount, plays);

    const engBonus = clamp(engRate * 5, 0, 30);
    const viralBonus = clamp(viralSignal * 100, 0, 20);

    const engScore = clamp(playP * 0.3 + engBonus + viralBonus + 15, 0, 100);

    const authorMeta = item.authorMeta as Record<string, unknown> | undefined;
    const creatorName =
      authorMeta?.name || authorMeta?.nickName || item.author;
    const coverUrl =
      (item.videoMeta as Record<string, unknown>)?.coverUrl ||
      item.cover ||
      '';

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.webVideoUrl || item.url || '') || null,
      _thumbnail: String(coverUrl) || null,
      _creator: creatorName ? `@${creatorName}` : null,
      _title: String(item.text || item.desc || '').slice(0, 120) || null,
      _engagement_rate: Math.round(engRate * 100) / 100,
      _platform_metric: `${formatNum(playCount)} plays · ${formatNum(shareCount)} shares`,
    };
  });
}

function scoreInstagram(items: Record<string, unknown>[]): ScoredItem[] {
  const likes = items.map((i) => Number(i.likesCount) || 0);

  return items.map((item, idx) => {
    const likeCount = likes[idx];
    const commentCount = Number(item.commentsCount) || 0;
    const videoViews = Number(item.videoViewCount) || 0;

    const likeP = percentile(likeCount, likes);
    const videoBonus = videoViews > 0 ? 5 : 0;

    const engScore = clamp(
      likeP * 0.5 +
        (commentCount > 50 ? 20 : commentCount * 0.4) +
        videoBonus +
        15,
      0,
      100
    );

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: String(item.displayUrl || item.thumbnailUrl || '') || null,
      _creator: item.ownerUsername ? `@${item.ownerUsername}` : null,
      _title: String(item.caption || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: `${formatNum(likeCount)} likes · ${formatNum(commentCount)} comments`,
    };
  });
}

function scoreTrustpilot(items: Record<string, unknown>[]): ScoredItem[] {
  return items.map((item) => {
    const rating = Number(item.rating) || 3;
    const textLength = String(item.text || '').length;
    const hasReply = Boolean(item.companyReply);

    const ratingScore = rating * 18;
    const lengthBonus = clamp(textLength / 50, 0, 5);
    const replyBonus = hasReply ? 3 : 0;

    const engScore = clamp(ratingScore + lengthBonus + replyBonus, 0, 100);

    return {
      ...item,
      _score: Math.round(engScore),
      _tier: tierLabel(engScore),
      _url: String(item.url || '') || null,
      _thumbnail: null,
      _creator: String(item.author || item.consumer || '') || null,
      _title: String(item.title || '').slice(0, 120) || null,
      _engagement_rate: null,
      _platform_metric: `${rating}★ · ${textLength} chars`,
    };
  });
}

/**
 * Boost scores based on relevance to research objective keywords.
 * Items mentioning the research subject get a significant boost so they
 * aren't buried by high-engagement but irrelevant content.
 */
export function boostRelevance(
  items: ScoredItem[],
  relevanceKeywords: string[]
): ScoredItem[] {
  if (relevanceKeywords.length === 0) return items;

  const lowerKeywords = relevanceKeywords.map((k) => k.toLowerCase());

  return items.map((item) => {
    // Build a text blob from all string content fields
    const textBlob = [
      str(item.title),
      str(item.text),
      str(item.body),
      str(item.caption),
      str(item.description),
      str(item.communityName),
      str(item._title),
    ]
      .join(' ')
      .toLowerCase();

    // Count how many distinct keywords match
    const matchCount = lowerKeywords.filter((kw) => textBlob.includes(kw)).length;

    if (matchCount === 0) {
      // Penalize high-engagement but irrelevant posts (e.g. viral Reddit posts
      // that slip through keyword search but aren't about the research topic)
      const penalty = Math.round(item._score * 0.4);
      const penalizedScore = clamp(item._score - penalty, 0, 100);
      return {
        ...item,
        _score: penalizedScore,
        _tier: tierLabel(penalizedScore),
        _relevance_boost: -penalty,
      };
    }

    // Boost: +15 for first keyword match, +5 for each additional
    const boost = 15 + Math.min(matchCount - 1, 3) * 5;
    const boostedScore = clamp(item._score + boost, 0, 100);

    return {
      ...item,
      _score: Math.round(boostedScore),
      _tier: tierLabel(boostedScore),
      _relevance_boost: boost,
    };
  });
}

/** Strip scored items down to display-only fields for storage in metadata. */
export function toDisplayItems(items: ScoredItem[], limit = 15): TopItemDisplay[] {
  return items
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, _tier, _url, _thumbnail, _creator, _title, _platform_metric }) => ({
      _score,
      _tier,
      _url,
      _thumbnail,
      _creator,
      _title,
      _platform_metric,
    }));
}

/** Build a text summary of top scored items for inclusion in Claude prompts. */
export function buildScoredItemsSummary(platform: string, items: ScoredItem[]): string {
  const sorted = [...items].sort((a, b) => b._score - a._score);
  const top = sorted.slice(0, 15);

  if (top.length === 0) return '';

  const lines = [`\nTOP SCORED ITEMS (${platform}, ranked by engagement score):\n`];
  lines.push('| # | Score | Tier | Title | Creator | Metric |');
  lines.push('|---|-------|------|-------|---------|--------|');

  for (let i = 0; i < top.length; i++) {
    const item = top[i];
    const title = (item._title || '—').slice(0, 60);
    lines.push(
      `| ${i + 1} | ${item._score} | ${item._tier} | ${title} | ${item._creator || '—'} | ${item._platform_metric || '—'} |`
    );
  }

  const tiers = {
    'STRIKE ZONE': top.filter((i) => i._tier === 'STRIKE ZONE').length,
    OPPORTUNITY: top.filter((i) => i._tier === 'OPPORTUNITY').length,
    MONITOR: top.filter((i) => i._tier === 'MONITOR').length,
    SKIP: top.filter((i) => i._tier === 'SKIP').length,
  };

  lines.push(
    `\nTier distribution: ${Object.entries(tiers)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')}`
  );

  return lines.join('\n');
}
