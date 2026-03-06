import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { runSupplementaryScan } from '@/lib/culture-wire/supplementary';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();
  // Fetch the search to get keywords
  const { data: search } = await supabase
    .from('culture_wire_searches')
    .select('*')
    .eq('id', id)
    .single();

  if (!search) return NextResponse.json({ error: 'Search not found' }, { status: 404 });

  const brandContext = search.brand_context as { keywords?: { brand?: string[]; category?: string[]; trending?: string[] } } | null;
  const keywords = [
    ...(brandContext?.keywords?.brand || []),
    ...(brandContext?.keywords?.category || []),
  ].slice(0, 10);

  if (keywords.length === 0) {
    return NextResponse.json({ error: 'No keywords for supplementary scan' }, { status: 400 });
  }

  // Run in background
  after(async () => {
    try {
      await runSupplementaryScan(id, keywords, search.geo || 'AU');
    } catch (err) {
      console.error('[supplementary] Scan failed:', err);
    }
  });

  return NextResponse.json({ success: true, message: 'Supplementary scan started' });
}
