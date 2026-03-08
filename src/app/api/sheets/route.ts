import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { createProjectSheet } from '@/lib/sheets';
import type { ScrapeResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await request.json();

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Load project (scoped to user)
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .eq('user_id', session.sub)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Load scrape results
  const { data: results } = await supabase
    .from('scrape_results')
    .select('*')
    .eq('project_id', projectId);

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'No results to export' }, { status: 404 });
  }

  try {
    const sheetUrl = await createProjectSheet(
      project.title,
      results as ScrapeResult[]
    );

    // Save URL to project
    await supabase
      .from('projects')
      .update({ sheets_url: sheetUrl })
      .eq('id', projectId);

    return NextResponse.json({ url: sheetUrl });
  } catch (error) {
    return NextResponse.json(
      { error: `Sheet export failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
