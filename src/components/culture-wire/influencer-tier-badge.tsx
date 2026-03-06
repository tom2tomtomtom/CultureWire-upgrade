'use client';

import { TIER_CONFIG } from '@/lib/culture-wire/influencer-tiers';
import { Badge } from '@/components/ui/badge';

interface InfluencerTierBadgeProps {
  tierId: string;
  size?: 'sm' | 'md';
}

export function InfluencerTierBadge({ tierId, size = 'sm' }: InfluencerTierBadgeProps) {
  const tier = TIER_CONFIG[tierId];
  if (!tier) return null;

  return (
    <Badge
      variant="outline"
      className={size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}
      style={{
        borderColor: tier.color,
        color: tier.color,
        backgroundColor: `${tier.color}15`,
      }}
    >
      {tier.display_name}
    </Badge>
  );
}
