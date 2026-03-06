import { NextResponse } from 'next/server';
import { getSlackInstallUrl } from '@/lib/integrations/slack';

export async function GET() {
  const url = getSlackInstallUrl();
  return NextResponse.redirect(url);
}
