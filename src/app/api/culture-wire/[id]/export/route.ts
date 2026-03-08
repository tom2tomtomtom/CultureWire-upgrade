import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import type { CultureWireAnalysis, ScoredOpportunity, CulturalTension } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get('format') || 'json';

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();
  const { data: search } = await supabase
    .from('culture_wire_searches')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.sub)
    .single();

  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: analyses } = await supabase
    .from('culture_wire_analyses')
    .select('*')
    .eq('search_id', id);

  const opportunities = (analyses || []).find((a: CultureWireAnalysis) => a.analysis_type === 'opportunities');
  const tensions = (analyses || []).find((a: CultureWireAnalysis) => a.analysis_type === 'tensions');
  const brief = (analyses || []).find((a: CultureWireAnalysis) => a.analysis_type === 'strategic_brief');

  const opps = (opportunities?.content as { opportunities?: ScoredOpportunity[] })?.opportunities || [];
  const tens = (tensions?.content as { tensions?: CulturalTension[] })?.tensions || [];
  const briefText = (brief?.content as { brief?: string })?.brief || '';

  if (opps.length === 0 && tens.length === 0 && !briefText) {
    return NextResponse.json(
      { error: 'No analysis data available. The search may still be processing or may have failed.' },
      { status: 400 }
    );
  }

  if (format === 'csv') {
    const rows = [
      ['Title', 'Score', 'Tier', 'Platform', 'Layer', 'Right to Play', 'Description'].join(','),
      ...opps.map((o: ScoredOpportunity) =>
        [
          `"${(o.title || '').replace(/"/g, '""')}"`,
          o.score,
          o.tier,
          o.platform,
          o.layer,
          o.right_to_play,
          `"${(o.description || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="culturewire-${search.brand_name}-${id.slice(0, 8)}.csv"`,
      },
    });
  }

  if (format === 'markdown') {
    const md = [
      `# CultureWire Report: ${search.brand_name}`,
      `**Date**: ${new Date(search.created_at).toLocaleDateString()}`,
      `**Region**: ${search.geo}`,
      `**Platforms**: ${search.platforms.join(', ')}`,
      '',
      '## Strategic Brief',
      briefText,
      '',
      '## Top Opportunities',
      ...opps.map((o: ScoredOpportunity, i: number) =>
        `### ${i + 1}. ${o.title} (${o.tier} — ${o.score}/100)\n${o.description}\n- Platform: ${o.platform}\n- Right to Play: ${o.right_to_play}\n`
      ),
      '',
      '## Cultural Tensions',
      ...tens.map((t: CulturalTension, i: number) =>
        `### ${i + 1}. ${t.name} (Severity: ${t.severity})\n${t.description}\n- Brand Implication: ${t.brand_implication}\n`
      ),
    ].join('\n');

    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="culturewire-${search.brand_name}-${id.slice(0, 8)}.md"`,
      },
    });
  }

  // Default: JSON
  return NextResponse.json({
    search: {
      brand_name: search.brand_name,
      geo: search.geo,
      platforms: search.platforms,
      created_at: search.created_at,
      status: search.status,
    },
    opportunities: opps,
    tensions: tens,
    strategic_brief: briefText,
  });
}
