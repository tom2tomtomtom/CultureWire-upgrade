'use client';

import { InfluencerTierBadge } from './influencer-tier-badge';
import { Plus, Users } from 'lucide-react';
import type { InfluencerFeedItem } from '@/lib/culture-wire/influencers';

interface InfluencerCardProps {
  influencer: InfluencerFeedItem;
  onAddToCurated?: (influencer: InfluencerFeedItem) => void;
  showAddButton?: boolean;
}

function formatFollowers(count: number | null): string {
  if (!count) return '-';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: '♪',
    instagram: '◻',
    youtube: '▶',
    twitter: '𝕏',
    reddit: '●',
    linkedin: '■',
    facebook: '▣',
  };
  return icons[platform] || '○';
}

export function InfluencerCard({ influencer, onAddToCurated, showAddButton = false }: InfluencerCardProps) {
  return (
    <div className="group border border-gray-200 bg-white p-4 transition-all hover:border-[#8B3F4F]/50 rounded-xl shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-lg font-mono rounded-lg">
            {platformIcon(influencer.platform)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate uppercase tracking-wide text-gray-900">{influencer.name}</p>
              <InfluencerTierBadge tierId={influencer.tier} />
            </div>
            <p className="text-xs font-mono text-gray-500 truncate">@{influencer.handle}</p>
          </div>
        </div>
        {showAddButton && influencer.tier !== 'tier1_curated' && onAddToCurated && (
          <button
            className="h-8 w-8 flex items-center justify-center border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 transition-all hover:border-[#8B3F4F] hover:text-[#8B3F4F] rounded-lg"
            onClick={() => onAddToCurated(influencer)}
            title="Add to curated list"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1 font-mono">
          <Users className="h-3 w-3" />
          {formatFollowers(influencer.followers)}
        </span>
        {influencer.engagement_rate && (
          <span className="font-mono">{influencer.engagement_rate.toFixed(1)}% eng</span>
        )}
        {influencer.geo && (
          <span className="font-mono uppercase">{influencer.geo}</span>
        )}
        <span className="ml-auto uppercase font-bold tracking-wide text-gray-900">{influencer.platform}</span>
      </div>
    </div>
  );
}
