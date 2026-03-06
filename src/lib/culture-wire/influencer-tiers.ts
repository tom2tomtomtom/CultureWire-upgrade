export interface TierConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  weight: number;
  color: string;
  icon: string;
  max_results: number;
  filters?: {
    country?: string;
    min_engagement?: number;
    min_followers?: number;
    exclude_curated?: boolean;
    exclude_au_discovery?: boolean;
  };
  relevance_threshold?: number;
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  tier1_curated: {
    id: 'tier1_curated',
    name: 'Curated',
    display_name: 'CURATED',
    description: 'Handpicked influencers from your trusted list',
    weight: 0.70,
    color: '#10B981',
    icon: 'star',
    max_results: 15,
  },
  tier2_au_discovery: {
    id: 'tier2_au_discovery',
    name: 'Discovered AU',
    display_name: 'DISCOVERED AU',
    description: 'Australian voices discovered by AI',
    weight: 0.20,
    color: '#F59E0B',
    icon: 'compass',
    max_results: 10,
    filters: {
      country: 'Australia',
      min_engagement: 1000,
      min_followers: 5000,
      exclude_curated: true,
    },
  },
  tier3_global: {
    id: 'tier3_global',
    name: 'Global',
    display_name: 'GLOBAL',
    description: 'International voices with high relevance',
    weight: 0.10,
    color: '#6366F1',
    icon: 'globe',
    max_results: 5,
    relevance_threshold: 0.75,
    filters: {
      min_followers: 100000,
      min_engagement: 10000,
      exclude_curated: true,
      exclude_au_discovery: true,
    },
  },
};

export const TIER_ORDER = ['tier1_curated', 'tier2_au_discovery', 'tier3_global'] as const;

export const EMPTY_TIER_MESSAGES: Record<string, string> = {
  tier1_curated: 'No curated influencers found for this topic. Consider adding some!',
  tier2_au_discovery: 'No Australian discoveries for this topic yet.',
  tier3_global: 'No highly relevant global voices found.',
};

export function getTierConfig(tierId: string): TierConfig | undefined {
  return TIER_CONFIG[tierId];
}
