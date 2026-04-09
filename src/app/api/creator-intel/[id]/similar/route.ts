import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { SimilarRequestSchema } from '@/lib/creator-intel/validators';
import { findSimilar } from '@/lib/creator-intel/analyzer';
import type { PostAnalysisResult, CreatorAnalysisResult, TopicAnalysisResult } from '@/lib/creator-intel/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = SimilarRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: analysis, error } = await supabase
    .from('creator_intel_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  if (analysis.status !== 'complete' || !analysis.results) {
    return NextResponse.json({ error: 'Analysis not yet complete' }, { status: 400 });
  }

  const results = analysis.results as PostAnalysisResult | CreatorAnalysisResult | TopicAnalysisResult;
  const region = results.kind === 'topic' ? results.region : 'AU';

  const similar = await findSimilar(results, parsed.data.depth, region);

  return NextResponse.json({ similar });
}
