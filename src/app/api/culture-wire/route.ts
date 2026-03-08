import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { CreateCultureWireSearchSchema } from '@/lib/validators';
import { generateBrandContext } from '@/lib/culture-wire/brand-context';
import { runThreeLayerCollection } from '@/lib/culture-wire/collector';
import { runAnalysisPipeline } from '@/lib/culture-wire/analyzer';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();

  // 1. Own searches
  const { data: ownSearches, error: ownError } = await supabase
    .from('culture_wire_searches')
    .select('*')
    .eq('user_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(50);

  if (ownError) return NextResponse.json({ error: ownError.message }, { status: 500 });

  // 2. Searches shared with this user
  const { data: sharedRecords } = await (supabase as any)
    .from('report_shares')
    .select('report_id')
    .eq('report_type', 'culture_wire')
    .eq('shared_with', session.sub);

  const sharedIds = (sharedRecords || []).map((r: { report_id: string }) => r.report_id);

  let sharedSearches: typeof ownSearches = [];
  if (sharedIds.length > 0) {
    const { data } = await supabase
      .from('culture_wire_searches')
      .select('*')
      .in('id', sharedIds)
      .order('created_at', { ascending: false });
    sharedSearches = data || [];
  }

  // Merge and dedupe by id, sort by created_at desc
  const mergedMap = new Map<string, (typeof ownSearches)[number]>();
  for (const s of [...(ownSearches || []), ...(sharedSearches || [])]) {
    if (!mergedMap.has(s.id)) mergedMap.set(s.id, s);
  }
  const searches = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ searches });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateCultureWireSearchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { brandName, geo, timeWindowHours, platforms } = parsed.data;

  // Create search record
  const { data: search, error } = await supabase
    .from('culture_wire_searches')
    .insert({
      user_id: session.sub,
      brand_name: brandName,
      geo,
      time_window_hours: timeWindowHours,
      platforms,
      status: 'collecting',
    })
    .select()
    .single();

  if (error || !search) {
    return NextResponse.json({ error: error?.message || 'Failed to create search' }, { status: 500 });
  }

  // Run collection + analysis in background
  after(async () => {
    const admin = createAdminClient();

    try {
      // Step 1: Generate brand context
      const brandContext = await generateBrandContext(brandName, geo);

      await admin
        .from('culture_wire_searches')
        .update({
          brand_context: brandContext,
          result_summary: { phase: 'context_complete', last_update: new Date().toISOString() },
        })
        .eq('id', search.id);

      // Step 2: Run 3-layer collection
      await runThreeLayerCollection(
        search.id,
        brandName,
        brandContext,
        platforms,
        geo,
        50
      );

      // Step 3: Update status to analyzing
      await admin
        .from('culture_wire_searches')
        .update({ status: 'analyzing' })
        .eq('id', search.id);

      // Step 4: Run analysis pipeline
      await runAnalysisPipeline(search.id, brandName, brandContext);
    } catch (err) {
      console.error('[culture-wire] Pipeline failed:', err);
      await admin
        .from('culture_wire_searches')
        .update({
          status: 'failed',
          result_summary: {
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        })
        .eq('id', search.id);
    }
  });

  return NextResponse.json({ search }, { status: 201 });
}
