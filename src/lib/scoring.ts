/**
 * Deterministic engagement scoring for scraped items.
 * Scores each item 0-100 based on platform-specific engagement metrics.
 * Runs BEFORE synthesis so Claude gets pre-scored data.
 */

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

  switch (platform) {
    case 'reddit':
      return scoreReddit(items);
    case 'youtube':
      return scoreYouTube(items);
    case 'tiktok':
      return scoreTikTok(items);
    case 'instagram':
      return scoreInstagram(items);
    case 'trustpilot':
      return scoreTrustpilot(items);
    default:
      return items.map((item) => ({
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
