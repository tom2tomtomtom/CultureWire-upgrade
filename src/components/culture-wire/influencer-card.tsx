'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfluencerTierBadge } from './influencer-tier-badge';
import { Plus, User, Users } from 'lucide-react';
import type { InfluencerFeedItem } from '@/lib/culture-wire/influencers';

interface InfluencerCardProps {
  influencer: InfluencerFeedItem;
  onAddToCurated?: (influencer: InfluencerFeedItem) => void;
  showAddButton?: boolean;
}

function formatFollowers(count: number | null): string {
  if (!count) return '—';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: '♪',
    instagram: '📸',
    youtube: '▶',
    twitter: '𝕏',
    reddit: '🔴',
    linkedin: '💼',
    facebook: '📘',
  };
  return icons[platform] || '🌐';
}

export function InfluencerCard({ influencer, onAddToCurated, showAddButton = false }: InfluencerCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
              {platformIcon(influencer.platform)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{influencer.name}</p>
                <InfluencerTierBadge tierId={influencer.tier} />
              </div>
              <p className="text-xs text-muted-foreground truncate">@{influencer.handle}</p>
            </div>
          </div>
          {showAddButton && influencer.tier !== 'tier1_curated' && onAddToCurated && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onAddToCurated(influencer)}
              title="Add to curated list"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatFollowers(influencer.followers)}
          </span>
          {influencer.engagement_rate && (
            <span>{influencer.engagement_rate.toFixed(1)}% eng</span>
          )}
          {influencer.geo && (
            <span>{influencer.geo}</span>
          )}
          <span className="ml-auto capitalize">{influencer.platform}</span>
        </div>
      </CardContent>
    </Card>
  );
}
