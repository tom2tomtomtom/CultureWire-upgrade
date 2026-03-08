'use client';

import { ExternalLink } from 'lucide-react';

export interface SamplePost {
  platform: string;
  title?: string;
  text?: string;
  author?: string;
  engagement: string; // pre-formatted: "4.2K upvotes" or "1.2M plays"
  url?: string;
  date?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

const platformColors: Record<string, string> = {
  reddit: 'border-orange-500/40 bg-orange-500/5',
  youtube: 'border-red-500/40 bg-red-500/5',
  tiktok: 'border-cyan-500/40 bg-cyan-500/5',
  instagram: 'border-pink-500/40 bg-pink-500/5',
  trustpilot: 'border-green-500/40 bg-green-500/5',
  twitter: 'border-blue-500/40 bg-blue-500/5',
  linkedin: 'border-blue-700/40 bg-blue-700/5',
  google_trends: 'border-yellow-500/40 bg-yellow-500/5',
};

const sentimentDot: Record<string, string> = {
  positive: 'bg-green-500',
  negative: 'bg-red-500',
  neutral: 'bg-zinc-500',
};

export function SamplePostCard({ post }: { post: SamplePost }) {
  const colorClass = platformColors[post.platform] || 'border-[#2a2a38] bg-[#0a0a0f]';
  const displayText = post.title || post.text || '';
  const truncated = displayText.length > 200 ? displayText.slice(0, 200) + '...' : displayText;

  return (
    <div className={`border ${colorClass} p-3 space-y-1.5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[#ccccdd] leading-relaxed">{truncated}</p>
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[#555566] hover:text-[#FF4400] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[#666677]">
        {post.author && <span>@{post.author}</span>}
        {post.author && <span className="text-[#333344]">/</span>}
        <span className="font-mono font-bold text-[#999aaa]">{post.engagement}</span>
        {post.date && (
          <>
            <span className="text-[#333344]">/</span>
            <span>{post.date}</span>
          </>
        )}
        {post.sentiment && (
          <span className={`h-1.5 w-1.5 rounded-full ${sentimentDot[post.sentiment]}`} />
        )}
      </div>
    </div>
  );
}

/**
 * Extract the best sample posts from raw platform data.
 * Sorts by the platform's primary engagement metric and returns the top N.
 */
export function extractSamplePosts(
  rawData: Record<string, unknown>[],
  platform: string,
  limit: number = 3
): SamplePost[] {
  const metricKey = getEngagementKey(platform);
  const sorted = [...rawData]
    .filter((item) => {
      const val = getNestedValue(item, metricKey);
      return val !== undefined && val !== null;
    })
    .sort((a, b) => {
      const aVal = Number(getNestedValue(a, metricKey)) || 0;
      const bVal = Number(getNestedValue(b, metricKey)) || 0;
      return bVal - aVal;
    })
    .slice(0, limit);

  return sorted.map((item) => toSamplePost(item, platform));
}

/**
 * Search raw data for posts matching keywords from evidence strings.
 * Returns posts whose text/title contains any of the evidence keywords.
 */
export function findMatchingPosts(
  rawData: Record<string, unknown>[],
  platform: string,
  evidenceStrings: string[],
  limit: number = 2
): SamplePost[] {
  // Extract significant words from evidence strings (4+ chars, skip common words)
  const skipWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'about', 'which', 'would', 'could', 'should', 'there', 'where', 'these', 'those', 'than', 'more', 'some', 'most', 'also', 'into', 'over', 'such', 'only', 'very', 'just', 'like', 'being', 'after', 'before', 'between', 'same', 'each', 'when', 'what', 'your', 'much', 'many', 'well', 'other', 'brand', 'post', 'posts', 'data', 'content', 'users', 'platform', 'engagement', 'score', 'high', 'across']);
  const keywords = evidenceStrings
    .join(' ')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4 && !skipWords.has(w));

  if (keywords.length === 0) return [];

  const uniqueKeywords = [...new Set(keywords)].slice(0, 15);

  const scored = rawData.map((item) => {
    const text = getPostText(item).toLowerCase();
    const matchCount = uniqueKeywords.filter((kw) => text.includes(kw)).length;
    return { item, matchCount };
  });

  return scored
    .filter((s) => s.matchCount >= 2)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit)
    .map((s) => toSamplePost(s.item, platform));
}

// --- Helpers ---

function getEngagementKey(platform: string): string {
  const map: Record<string, string> = {
    reddit: 'score',
    youtube: 'viewCount',
    tiktok: 'playCount',
    instagram: 'likesCount',
    trustpilot: 'rating',
    twitter: 'likeCount',
    linkedin: 'likeCount',
    google_trends: 'interestOverTime',
  };
  return map[platform] || 'score';
}

function formatEngagement(value: unknown, platform: string): string {
  const num = Number(value) || 0;
  const label: Record<string, string> = {
    reddit: 'upvotes',
    youtube: 'views',
    tiktok: 'plays',
    instagram: 'likes',
    trustpilot: '/5',
    twitter: 'likes',
    linkedin: 'likes',
  };
  if (platform === 'trustpilot') return `${num}${label[platform]}`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M ${label[platform] || ''}`.trim();
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K ${label[platform] || ''}`.trim();
  return `${num} ${label[platform] || ''}`.trim();
}

function getPostText(item: Record<string, unknown>): string {
  const title = String(item.title || '');
  const text = String(item.text || item.body || item.caption || item.description || '');
  return `${title} ${text}`.trim();
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

function toSamplePost(item: Record<string, unknown>, platform: string): SamplePost {
  const metricKey = getEngagementKey(platform);
  const author = String(
    item.author ||
    item.ownerUsername ||
    item.channelName ||
    item.channelTitle ||
    (item.authorMeta as Record<string, unknown>)?.name ||
    (item.authorMeta as Record<string, unknown>)?.nickName ||
    item.authorName ||
    (item.user as Record<string, unknown>)?.name ||
    ''
  );

  const dateRaw = item.date || item.createdAt || item.createTime || item.publishedAt || item.timestamp || item.postedAt;
  let dateStr = '';
  if (dateRaw) {
    try {
      const d = new Date(typeof dateRaw === 'number' ? dateRaw * 1000 : String(dateRaw));
      if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString();
    } catch { /* skip */ }
  }

  const url = String(item.url || item.webVideoUrl || '');

  return {
    platform,
    title: String(item.title || ''),
    text: String(item.text || item.body || item.caption || item.description || ''),
    author: author || undefined,
    engagement: formatEngagement(item[metricKey], platform),
    url: url || undefined,
    date: dateStr || undefined,
  };
}
