import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { sendSlackMessage, formatSearchResultsForSlack } from '@/lib/integrations/slack';
import type { ScoredOpportunity } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchId, teamId } = await request.json();
  if (!searchId) return NextResponse.json({ error: 'searchId required' }, { status: 400 });

  const admin = createAdminClient();

  // Get search data
  const { data: search } = await admin
    .from('culture_wire_searches')
    .select('*')
    .eq('id', searchId)
    .single();

  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 });

  // Get opportunities
  const { data: analyses } = await admin
    .from('culture_wire_analyses')
    .select('*')
    .eq('search_id', searchId)
    .eq('analysis_type', 'opportunities')
    .single();

  const opportunities = ((analyses?.content as { opportunities?: ScoredOpportunity[] })?.opportunities || [])
    .map((o: ScoredOpportunity) => ({ title: o.title, score: o.score, tier: o.tier }));

  // Get Slack installation
  const { data: slackInstall } = await admin
    .from('slack_installations')
    .select('*')
    .eq('team_id', teamId || '')
    .single();

  if (!slackInstall) {
    // Try first available installation
    const { data: anyInstall } = await admin
      .from('slack_installations')
      .select('*')
      .limit(1)
      .single();

    if (!anyInstall) {
      return NextResponse.json({ error: 'No Slack installation found' }, { status: 404 });
    }

    const { text, blocks } = formatSearchResultsForSlack(search.brand_name, opportunities, searchId);
    await sendSlackMessage(anyInstall.access_token, anyInstall.channel_id, text, blocks);
    return NextResponse.json({ success: true });
  }

  const { text, blocks } = formatSearchResultsForSlack(search.brand_name, opportunities, searchId);
  await sendSlackMessage(slackInstall.access_token, slackInstall.channel_id, text, blocks);

  return NextResponse.json({ success: true });
}
