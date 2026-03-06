import { createAdminClient } from '@/lib/supabase/server';
import { TIER_CONFIG, TIER_ORDER } from './influencer-tiers';
import type { LeadInfluencer } from '@/lib/types';

export interface InfluencerFeedItem {
  id: string;
  name: string;
  handle: string;
  platform: string;
  category: string;
  tier: string;
  tier_display: string;
  tier_color: string;
  followers: number | null;
  engagement_rate: number | null;
  geo: string | null;
}

/**
 * Get influencer feed for a category, using 3-tier mixing:
 * Curated 70% / Discovered AU 20% / Global 10%
 */
export async function getInfluencerFeed(
  category: string,
  limit: number = 30
): Promise<InfluencerFeedItem[]> {
  const supabase = createAdminClient();
  const feed: InfluencerFeedItem[] = [];

  for (const tierId of TIER_ORDER) {
    const tierConfig = TIER_CONFIG[tierId];
    const tierLimit = Math.ceil(limit * tierConfig.weight);

    const query = supabase
      .from('lead_influencers')
      .select('*')
      .eq('category', category)
      .eq('tier', tierId === 'tier1_curated' ? 'curated' : tierId === 'tier2_au_discovery' ? 'discovered_au' : 'global')
      .limit(tierLimit);

    if (tierConfig.filters?.min_followers) {
      query.gte('followers', tierConfig.filters.min_followers);
    }

    const { data } = await query;

    if (data) {
      feed.push(...data.map((item: LeadInfluencer) => ({
        id: item.id,
        name: item.name,
        handle: item.handle,
        platform: item.platform,
        category: item.category,
        tier: tierId,
        tier_display: tierConfig.display_name,
        tier_color: tierConfig.color,
        followers: item.followers,
        engagement_rate: item.engagement_rate,
        geo: item.geo,
      })));
    }
  }

  return feed;
}

/**
 * Auto-discover influencers from scraped social data.
 * Extracts creator handles/names from collected results.
 */
export function discoverInfluencers(
  items: Record<string, unknown>[],
  platform: string
): { name: string; handle: string; platform: string }[] {
  const discovered: { name: string; handle: string; platform: string }[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    let handle = '';
    let name = '';

    switch (platform) {
      case 'tiktok': {
        const authorMeta = item.authorMeta as Record<string, unknown> | undefined;
        handle = String(authorMeta?.uniqueId || item.author || '');
        name = String(authorMeta?.name || authorMeta?.nickName || handle);
        break;
      }
      case 'instagram':
        handle = String(item.ownerUsername || '');
        name = handle;
        break;
      case 'youtube':
        handle = String(item.channelTitle || item.channelName || '');
        name = handle;
        break;
      case 'reddit':
        handle = String(item.author || '');
        name = handle;
        break;
      default:
        continue;
    }

    if (handle && !seen.has(handle.toLowerCase())) {
      seen.add(handle.toLowerCase());
      discovered.push({ name, handle, platform });
    }
  }

  return discovered;
}

/**
 * Add an influencer to the curated list.
 */
export async function addToCurated(influencer: {
  name: string;
  handle: string;
  platform: string;
  category: string;
  followers?: number;
  engagement_rate?: number;
  geo?: string;
  added_by?: string;
}): Promise<{ id: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('lead_influencers')
    .insert({
      name: influencer.name,
      handle: influencer.handle,
      platform: influencer.platform,
      category: influencer.category,
      tier: 'curated',
      followers: influencer.followers || null,
      engagement_rate: influencer.engagement_rate || null,
      geo: influencer.geo || null,
      added_by: influencer.added_by || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[influencers] Failed to add to curated:', error);
    return null;
  }

  return data;
}
