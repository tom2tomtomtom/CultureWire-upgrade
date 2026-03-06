import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { syncInfluencersToSheet } from '@/lib/integrations/google-sheets';

export async function POST() {
  const session = await getSession();

  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: influencers, error } = await supabase
    .from('lead_influencers')
    .select('name, handle, platform, category, added_by')
    .eq('tier', 'curated');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch influencers' }, { status: 500 });
  }

  if (!influencers || influencers.length === 0) {
    return NextResponse.json({ error: 'No curated influencers to sync' }, { status: 404 });
  }

  try {
    const count = await syncInfluencersToSheet(
      influencers.map((i) => ({
        name: i.name,
        handle: i.handle,
        platform: i.platform,
        category: i.category,
        added_by: i.added_by || '',
      }))
    );
    return NextResponse.json({ success: true, count });
  } catch (err) {
    console.error('[admin/sheets] Sync failed:', err);
    return NextResponse.json({ error: 'Sheets sync failed' }, { status: 500 });
  }
}
