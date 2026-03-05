import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

  return NextResponse.json({
    search: searchResult.data,
    results: resultsResult.data || [],
    analyses: analysesResult.data || [],
  });
}
