import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  // Verify caller is admin
  const session = await getSession();

  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { requestId, action } = await request.json();

  if (!requestId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the signup request
  const { data: signupReq, error: fetchError } = await supabase
    .from('signup_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !signupReq) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (action === 'reject') {
    await supabase
      .from('signup_requests')
      .update({
        status: 'rejected',
        reviewed_by: session.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return NextResponse.json({ success: true, action: 'rejected' });
  }

  // Approve: create user in auth.users, then update signup_requests
  const { error: createError } = await supabase.auth.admin.createUser({
    email: signupReq.email,
    email_confirm: true,
    user_metadata: {
      full_name: signupReq.full_name,
      company: signupReq.company,
    },
  });

  if (createError) {
    // User might already exist in auth
    if (createError.message?.includes('already been registered')) {
      // Just approve the request
    } else {
      console.error('[admin/approve] Create user error:', createError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
  }

  await supabase
    .from('signup_requests')
    .update({
      status: 'approved',
      reviewed_by: session.email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  return NextResponse.json({ success: true, action: 'approved' });
}
