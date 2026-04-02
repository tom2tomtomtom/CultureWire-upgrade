import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

const STALE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes
const STALE_BATCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes since last batch update

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [searchResult, resultsResult, analysesResult] = await Promise.all([
    supabase.from('culture_wire_searches').select('*').eq('id', id).eq('user_id', session.sub).single(),
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
  // But don't auto-recover if we have results but no analyses (analysis may still be running)
  if (search.status === 'collecting' || search.status === 'analyzing') {
    const lastUpdate = search.result_summary?.last_update;
    const batchStale = lastUpdate && Date.now() - new Date(lastUpdate).getTime() > STALE_BATCH_THRESHOLD_MS;
    const createdStale = Date.now() - new Date(search.created_at).getTime() > STALE_THRESHOLD_MS;

    if (batchStale || createdStale) {
      const results = resultsResult.data || [];
      const analyses = analysesResult.data || [];
      const hasResults = results.length > 0;
      const hasAnalyses = analyses.length > 0;

      // If we have results but no analyses and status is 'analyzing', let the analysis pipeline finish
      // Only auto-recover analyzing if analyses exist (partial completion) or no data at all
      if (search.status === 'analyzing' && hasResults && !hasAnalyses) {
        // Don't auto-recover - analysis pipeline is likely still running
      } else {
        const hasData = hasResults || hasAnalyses;
        const recoveryReason = batchStale
          ? `Pipeline stalled (no batch update for >5min, last: ${lastUpdate})`
          : 'Stale search detected (>20min since creation)';

        const admin = createAdminClient();
        await admin
          .from('culture_wire_searches')
          .update({
            status: hasData ? 'complete' : 'failed',
            completed_at: new Date().toISOString(),
            result_summary: {
              ...(search.result_summary || {}),
              auto_recovered: true,
              recovery_reason: recoveryReason,
              total_items: results.reduce((sum: number, r: { item_count: number }) => sum + r.item_count, 0),
            },
          })
          .eq('id', id);

        search.status = hasData ? 'complete' : 'failed';
      }
    }
  }

  return NextResponse.json({
    search,
    results: resultsResult.data || [],
    analyses: analysesResult.data || [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (body.action === 'cancel') {
    const supabase = await createServerClient();

    // Get current search to read active runs (verify ownership)
    const { data: currentSearch } = await supabase
      .from('culture_wire_searches')
      .select('result_summary')
      .eq('id', id)
      .eq('user_id', session.sub)
      .single();

    // Abort active Apify runs to save credits
    const activeRuns = (currentSearch?.result_summary as Record<string, unknown>)?.active_runs as string[] | undefined;
    if (activeRuns && activeRuns.length > 0) {
      await Promise.allSettled(
        activeRuns
          .filter(runId => /^[a-zA-Z0-9]+$/.test(runId))
          .map(runId =>
            fetch(`https://api.apify.com/v2/actor-runs/${runId}/abort`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${process.env.APIFY_API_KEY}` },
            })
          )
      );
    }

    // Get current results count
    const { data: results } = await supabase
      .from('culture_wire_results')
      .select('item_count')
      .eq('search_id', id);

    const totalItems = (results || []).reduce((sum, r) => sum + r.item_count, 0);
    const hasData = totalItems > 0;

    const admin = createAdminClient();
    const { error } = await admin
      .from('culture_wire_searches')
      .update({
        status: hasData ? 'complete' : 'failed',
        completed_at: new Date().toISOString(),
        result_summary: {
          total_items: totalItems,
          cancelled: true,
          cancelled_by: session.email,
        },
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: hasData ? 'complete' : 'failed' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
