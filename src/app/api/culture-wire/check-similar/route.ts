import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brandName');
  const geo = searchParams.get('geo');

  if (!brandName || brandName.trim().length === 0) {
    return NextResponse.json({ error: 'brandName is required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Query recent complete searches with similar brand name
  let query = supabase
    .from('culture_wire_searches')
    .select('id, brand_name, geo, created_at, user_id, platforms')
    .eq('status', 'complete')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .ilike('brand_name', `%${brandName.trim()}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (geo) {
    query = query.eq('geo', geo);
  }

  const { data: ownSearches, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also check searches shared with the user via report_shares
  const { data: sharedReports } = await (supabase as any)
    .from('report_shares')
    .select('report_id')
    .eq('report_type', 'culture_wire')
    .eq('shared_with', session.email);

  let sharedSearches: any[] = [];

  if (sharedReports && sharedReports.length > 0) {
    const sharedIds = sharedReports.map((r: any) => r.report_id);

    let sharedQuery = supabase
      .from('culture_wire_searches')
      .select('id, brand_name, geo, created_at, user_id, platforms')
      .eq('status', 'complete')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .ilike('brand_name', `%${brandName.trim()}%`)
      .in('id', sharedIds)
      .order('created_at', { ascending: false })
      .limit(10);

    if (geo) {
      sharedQuery = sharedQuery.eq('geo', geo);
    }

    const { data } = await sharedQuery;
    sharedSearches = data || [];
  }

  // Merge and deduplicate results
  const seenIds = new Set<string>();
  const similar: Array<{
    id: string;
    brand_name: string;
    geo: string;
    created_at: string;
    user_id: string;
    is_own: boolean;
    platforms: string[];
  }> = [];

  for (const search of ownSearches || []) {
    if (!seenIds.has(search.id)) {
      seenIds.add(search.id);
      similar.push({
        id: search.id,
        brand_name: search.brand_name,
        geo: search.geo,
        created_at: search.created_at,
        user_id: search.user_id,
        is_own: search.user_id === session.sub,
        platforms: search.platforms || [],
      });
    }
  }

  for (const search of sharedSearches) {
    if (!seenIds.has(search.id)) {
      seenIds.add(search.id);
      similar.push({
        id: search.id,
        brand_name: search.brand_name,
        geo: search.geo,
        created_at: search.created_at,
        user_id: search.user_id,
        is_own: false,
        platforms: search.platforms || [],
      });
    }
  }

  return NextResponse.json({ similar });
}
