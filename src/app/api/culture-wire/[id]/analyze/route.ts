import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { runAnalysisPipeline } from '@/lib/culture-wire/analyzer';
import type { BrandContext } from '@/lib/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = await createServerClient();

  const { data: search, error } = await supabase
    .from('culture_wire_searches')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.sub)
    .single();

  if (error || !search) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 });
  }

  if (!search.brand_context) {
    return NextResponse.json({ error: 'Brand context not generated yet' }, { status: 400 });
  }

  // Update status
  const admin = createAdminClient();
  await admin
    .from('culture_wire_searches')
    .update({ status: 'analyzing' })
    .eq('id', id);

  // Run analysis in background
  after(async () => {
    try {
      await runAnalysisPipeline(
        id,
        search.brand_name,
        search.brand_context as BrandContext
      );
    } catch (err) {
      console.error('[culture-wire] Analysis failed:', err);
      await admin
        .from('culture_wire_searches')
        .update({ status: 'failed' })
        .eq('id', id);
    }
  });

  return NextResponse.json({ status: 'analyzing' });
}
