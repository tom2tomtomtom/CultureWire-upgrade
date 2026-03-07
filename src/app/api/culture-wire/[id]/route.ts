import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [searchResult, resultsResult, analysesResult] = await Promise.all([
    supabase.from('culture_wire_searches').select('*').eq('id', id).single(),
    supabase
      .from('culture_wire_results')
      .select('*')
      .eq('search_id', id)
      .order('created_at'),
    supabase
      .from('culture_wire_analyses')
      .select('*')
      .eq('search_id', id)
      .order('created_at'),
  ]);

  if (searchResult.error) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 });
  }

  const search = searchResult.data;

  // Auto-recover stale searches stuck in collecting/analyzing
  if (
    (search.status === 'collecting' || search.status === 'analyzing') &&
    Date.now() - new Date(search.created_at).getTime() > STALE_THRESHOLD_MS
  ) {
    const results = resultsResult.data || [];
    const analyses = analysesResult.data || [];
    const hasData = results.length > 0 || analyses.length > 0;

    const admin = createAdminClient();
    await admin
      .from('culture_wire_searches')
      .update({
        status: hasData ? 'complete' : 'failed',
        completed_at: new Date().toISOString(),
        result_summary: {
          ...(search.result_summary || {}),
          auto_recovered: true,
          recovery_reason: 'Stale search detected (>10min)',
          total_items: results.reduce((sum: number, r: { item_count: number }) => sum + r.item_count, 0),
        },
      })
      .eq('id', id);

    search.status = hasData ? 'complete' : 'failed';
  }

  return NextResponse.json({
    search,
    results: resultsResult.data || [],
    analyses: analysesResult.data || [],
  });
}
