import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/lib/integrations/slack';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const installation = await exchangeCodeForToken(code);
    const supabase = createAdminClient();

    // Upsert slack installation
    await supabase.from('slack_installations').upsert({
      team_id: installation.team_id,
      team_name: installation.team_name,
      access_token: installation.access_token,
      channel_id: installation.channel_id,
      channel_name: installation.channel_name,
      installed_at: new Date().toISOString(),
    }, { onConflict: 'team_id' });

    // Redirect to success page
    return NextResponse.redirect(new URL('/admin?slack=installed', request.url));
  } catch (error) {
    console.error('[slack] OAuth callback failed:', error);
    return NextResponse.redirect(new URL('/admin?slack=error', request.url));
  }
}
