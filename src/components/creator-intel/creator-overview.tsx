import { MapPin, Clock } from 'lucide-react';
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
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.username}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: tierColor }}
          >
            {creator.username[0].toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.tiktok.com/@${creator.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-[#8B3F4F]"
            >
              {creator.display_name || `@${creator.username}`}
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
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {creator.display_name && <span>@{creator.username}</span>}
            {creator.follower_count && (
              <span>{formatNumber(creator.follower_count)} followers</span>
            )}
            {creator.region !== 'unknown' && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {creator.region}
              </span>
            )}
          </div>
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
