import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

/**
 * Debug endpoint: shows raw field names from scraped data.
 * GET /api/debug-data?projectId=xxx&platform=youtube&limit=2
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  const platform = request.nextUrl.searchParams.get('platform');
  const limit = Number(request.nextUrl.searchParams.get('limit') || '2');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', session.sub)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let query = supabase
    .from('scrape_results')
    .select('source_platform, raw_data, item_count')
    .eq('project_id', projectId);

  if (platform) {
    query = query.eq('source_platform', platform);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No results found' }, { status: 404 });
  }

  // For each result set, show field names and a sample item
  const debug = data.map((r) => {
    const items = r.raw_data as Record<string, unknown>[];
    const sample = items.slice(0, limit);
    const fieldNames = items.length > 0 ? Object.keys(items[0]) : [];

    return {
      platform: r.source_platform,
      item_count: r.item_count,
      field_names: fieldNames,
      sample_items: sample,
    };
  });

  return NextResponse.json({ debug });
}
