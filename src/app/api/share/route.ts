import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { reportType, reportId, emails } = body as {
    reportType: 'culture_wire' | 'research';
    reportId: string;
    emails: string[];
  };

  if (!reportType || !reportId || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'reportType, reportId, and emails[] are required' }, { status: 400 });
  }

  if (!['culture_wire', 'research'].includes(reportType)) {
    return NextResponse.json({ error: 'reportType must be culture_wire or research' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Verify ownership
  const table = reportType === 'culture_wire' ? 'culture_wire_searches' : 'projects';
  const { data: report, error: reportError } = await supabase
    .from(table)
    .select('id, user_id')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if ((report as { user_id: string }).user_id !== session.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update visibility to 'shared'
  await supabase
    .from(table)
    .update({ visibility: 'shared' } as never)
    .eq('id', reportId);

  // Upsert shares
  const rows = emails.map((email: string) => ({
    report_type: reportType,
    report_id: reportId,
    shared_by: session.sub,
    shared_with: email,
  }));

  const { error: shareError } = await (supabase as any)
    .from('report_shares')
    .upsert(rows, { onConflict: 'report_type,report_id,shared_with', ignoreDuplicates: true });

  if (shareError) {
    return NextResponse.json({ error: shareError.message }, { status: 500 });
  }

  return NextResponse.json({ shared: true, count: emails.length });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('reportType');
  const reportId = searchParams.get('reportId');

  if (!reportType || !reportId) {
    return NextResponse.json({ error: 'reportType and reportId are required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Verify ownership
  const table = reportType === 'culture_wire' ? 'culture_wire_searches' : 'projects';
  const { data: report, error: reportError } = await supabase
    .from(table)
    .select('id, user_id')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if ((report as { user_id: string }).user_id !== session.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: shares, error: sharesError } = await (supabase as any)
    .from('report_shares')
    .select('*')
    .eq('report_type', reportType)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (sharesError) {
    return NextResponse.json({ error: sharesError.message }, { status: 500 });
  }

  return NextResponse.json({ shares: shares || [] });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('reportType');
  const reportId = searchParams.get('reportId');
  const email = searchParams.get('email');

  if (!reportType || !reportId || !email) {
    return NextResponse.json({ error: 'reportType, reportId, and email are required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Verify ownership
  const table = reportType === 'culture_wire' ? 'culture_wire_searches' : 'projects';
  const { data: report, error: reportError } = await supabase
    .from(table)
    .select('id, user_id')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if ((report as { user_id: string }).user_id !== session.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete the share
  const { error: deleteError } = await (supabase as any)
    .from('report_shares')
    .delete()
    .eq('report_type', reportType)
    .eq('report_id', reportId)
    .eq('shared_with', email);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Check if any shares remain
  const { data: remaining } = await (supabase as any)
    .from('report_shares')
    .select('id')
    .eq('report_type', reportType)
    .eq('report_id', reportId)
    .limit(1);

  // If no shares remain, set visibility back to private
  if (!remaining || remaining.length === 0) {
    await supabase
      .from(table)
      .update({ visibility: 'private' } as never)
      .eq('id', reportId);
  }

  return NextResponse.json({ removed: true });
}
