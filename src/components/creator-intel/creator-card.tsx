'use client';

import { TrendingUp } from 'lucide-react';
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
