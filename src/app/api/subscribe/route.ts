import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, company } = await request.json();

    if (!email || !company) {
      return NextResponse.json({ error: 'Email and company required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Store application (upsert by email to avoid duplicates)
    await (supabase as any)
      .from('subscription_applications')
      .upsert(
        { email: email.toLowerCase().trim(), company: company.trim(), status: 'pending' },
        { onConflict: 'email' }
      );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
