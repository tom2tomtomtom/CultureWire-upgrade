import { NextRequest, NextResponse, after } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { AnalyzeRequestSchema, parseTikTokUrl } from '@/lib/creator-intel/validators';
import { analyzePost, analyzeTopic } from '@/lib/creator-intel/analyzer';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { type, input, region } = parsed.data;

  if (type === 'url' && !parseTikTokUrl(input)) {
    return NextResponse.json(
      { error: 'Invalid TikTok URL. Expected format: https://www.tiktok.com/@username/video/1234567890' },
      { status: 400 }
    );
  }

  const analysisType = type === 'url' ? 'post' : 'topic';

  const supabase = await createServerClient();
  const { data: analysis, error } = await supabase
    .from('creator_intel_analyses')
    .insert({
      user_id: session.sub,
      type: analysisType,
      input,
      status: 'analyzing',
    })
    .select()
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: error?.message || 'Failed to create analysis' }, { status: 500 });
  }

  after(async () => {
    const admin = createAdminClient();
    try {
      const results = analysisType === 'post'
        ? await analyzePost(input, region)
        : await analyzeTopic(input, region);

      await admin
        .from('creator_intel_analyses')
        .update({ status: 'complete', results })
        .eq('id', analysis.id);
    } catch (err) {
      console.error('Creator Intel analysis failed:', err);
      await admin
        .from('creator_intel_analyses')
        .update({ status: 'failed' })
        .eq('id', analysis.id);
    }
  });

  return NextResponse.json({ analysis }, { status: 201 });
}
