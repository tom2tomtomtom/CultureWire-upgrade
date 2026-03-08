import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { CreateProjectSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    // Single project: allow if owned or shared with user
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
    }

    // Check ownership or shared access
    if ((project as { user_id: string }).user_id !== session.sub) {
      const { data: shareRecord } = await (supabase as any)
        .from('report_shares')
        .select('id')
        .eq('report_type', 'research')
        .eq('report_id', id)
        .eq('shared_with', session.sub)
        .limit(1);

      if (!shareRecord || shareRecord.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ project });
  }

  // 1. Own projects
  const { data: ownProjects, error: ownError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', session.sub)
    .order('updated_at', { ascending: false });

  if (ownError) return NextResponse.json({ error: ownError.message }, { status: 500 });

  // 2. Projects shared with this user
  const { data: sharedRecords } = await (supabase as any)
    .from('report_shares')
    .select('report_id')
    .eq('report_type', 'research')
    .eq('shared_with', session.sub);

  const sharedIds = (sharedRecords || []).map((r: { report_id: string }) => r.report_id);

  let sharedProjects: typeof ownProjects = [];
  if (sharedIds.length > 0) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .in('id', sharedIds)
      .order('updated_at', { ascending: false });
    sharedProjects = data || [];
  }

  // Merge and dedupe by id, sort by updated_at desc
  const mergedMap = new Map<string, (typeof ownProjects)[number]>();
  for (const p of [...(ownProjects || []), ...(sharedProjects || [])]) {
    if (!mergedMap.has(p.id)) mergedMap.set(p.id, p);
  }
  const projects = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      user_id: session.sub,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
