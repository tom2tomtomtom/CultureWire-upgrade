import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, company } = await request.json();

    if (!email || !company) {
      return NextResponse.json({ error: 'Email and company required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const normalizedEmail = email.toLowerCase().trim();
    const autoApprove = normalizedEmail.endsWith('@altshift.com.au');

    // Store application (upsert by email to avoid duplicates)
    // Auto-approve altshift.com.au emails
    await (supabase as any)
      .from('subscription_applications')
      .upsert(
        { email: normalizedEmail, company: company.trim(), status: autoApprove ? 'approved' : 'pending' },
        { onConflict: 'email' }
      );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
