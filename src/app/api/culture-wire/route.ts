import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { CreateCultureWireSearchSchema } from '@/lib/validators';
import { generateBrandContext } from '@/lib/culture-wire/brand-context';
import { runThreeLayerCollection } from '@/lib/culture-wire/collector';
import { runAnalysisPipeline } from '@/lib/culture-wire/analyzer';

export async function GET() {
  const supabase = await createServerClient();

  const { data: searches, error } = await supabase
    .from('culture_wire_searches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ searches: searches || [] });
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
      const brandContext = await generateBrandContext(brandName);

      await admin
        .from('culture_wire_searches')
        .update({ brand_context: brandContext })
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
