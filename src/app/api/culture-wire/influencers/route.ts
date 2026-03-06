import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getInfluencerFeed, addToCurated } from '@/lib/culture-wire/influencers';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const category = request.nextUrl.searchParams.get('category') || '';
  if (!category) return NextResponse.json({ error: 'Category required' }, { status: 400 });

  const influencers = await getInfluencerFeed(category);
  return NextResponse.json({ influencers });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const result = await addToCurated({
    ...body,
    added_by: session.email,
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to add influencer' }, { status: 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
