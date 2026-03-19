import { NextRequest, NextResponse } from 'next/server';
import { getInfluencersFromSheet, getSheetCategories } from '@/lib/google-sheets';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const category = request.nextUrl.searchParams.get('category') || '';

  // If no category, return all categories
  if (!category) {
    const categories = await getSheetCategories();
    return NextResponse.json({ categories });
  }

  const allInfluencers = await getInfluencersFromSheet();
  const filtered = allInfluencers
    .filter((i) => i.category === category)
    .map((i, idx) => ({
      id: `sheet-${idx}-${i.handle}`,
      name: i.name,
      handle: i.handle,
      platform: i.platform === 'unknown' ? 'instagram' : i.platform,
      category: i.category,
      tier: 'curated',
      tier_display: 'Curated',
      tier_color: '#8B3F4F',
      followers: null,
      engagement_rate: null,
      geo: 'AU',
      profile_url: i.profileUrl,
    }));

  return NextResponse.json({ influencers: filtered });
}
