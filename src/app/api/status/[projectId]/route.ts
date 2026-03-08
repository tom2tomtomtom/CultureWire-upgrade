import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const supabase = await createServerClient();

  const [projectResult, jobsResult, analysisResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).eq('user_id', session.sub).single(),
    supabase
      .from('scrape_jobs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at'),
    supabase
      .from('analysis_results')
      .select('id, pass_type, source_platform, created_at')
      .eq('project_id', projectId)
      .order('created_at'),
  ]);

  if (projectResult.error) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const jobs = jobsResult.data || [];
  const completedCount = jobs.filter((j) => j.status === 'succeeded').length;
  const failedCount = jobs.filter((j) => j.status === 'failed' || j.status === 'timeout').length;

  return NextResponse.json({
    project: projectResult.data,
    jobs,
    completedCount,
    totalCount: jobs.length,
    failedCount,
    analysis_results: analysisResult.data || [],
  });
}
