import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { reportType, reportId } = body as {
    reportType: 'culture_wire' | 'research';
    reportId: string;
  };

  if (!reportType || !reportId) {
    return NextResponse.json(
      { error: 'reportType and reportId are required' },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  try {
    if (reportType === 'culture_wire') {
      return await buildCultureWireSummary(supabase, reportId, session.sub);
    } else {
      return await buildResearchSummary(supabase, reportId, session.sub);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildCultureWireSummary(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reportId: string,
  userId: string
) {
  // Verify ownership
  const { data: search, error: searchError } = await supabase
    .from('culture_wire_searches')
    .select('id, user_id, brand_name, platforms, geo, status')
    .eq('id', reportId)
    .single();

  if (searchError || !search) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if ((search as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch analyses
  const { data: analyses } = await supabase
    .from('culture_wire_analyses')
    .select('analysis_type, content')
    .eq('search_id', reportId);

  const opportunities =
    (analyses?.find((a) => a.analysis_type === 'opportunities')?.content as {
      opportunities?: Array<{
        title: string;
        description: string;
        tier: string;
        score: number;
        platform: string;
        right_to_play: string;
      }>;
    })?.opportunities || [];

  const tensions =
    (analyses?.find((a) => a.analysis_type === 'tensions')?.content as {
      tensions?: Array<{
        name: string;
        description: string;
        severity: number;
        brand_implication: string;
      }>;
    })?.tensions || [];

  const brief =
    (analyses?.find((a) => a.analysis_type === 'strategic_brief')?.content as {
      brief?: string;
    })?.brief || '';

  const brandName = (search as { brand_name: string }).brand_name;

  // Build concise markdown
  const topOpps = opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const topTensions = tensions
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 2);

  let markdown = `# CultureWire Report: ${brandName}\n\n`;

  // Executive summary from strategic brief (first paragraph or first 300 chars)
  if (brief) {
    const firstParagraph = brief.split('\n\n')[0] || brief;
    const excerpt =
      firstParagraph.length > 400
        ? firstParagraph.slice(0, 400) + '...'
        : firstParagraph;
    markdown += `## Executive Summary\n${excerpt}\n\n`;
  }

  // Top opportunities
  if (topOpps.length > 0) {
    markdown += `## Top Opportunities\n`;
    for (const opp of topOpps) {
      markdown += `- **[${opp.tier}] ${opp.title}** (score: ${opp.score}, ${opp.platform}) - ${opp.description}\n`;
    }
    markdown += '\n';
  }

  // Top tensions
  if (topTensions.length > 0) {
    markdown += `## Key Tensions\n`;
    for (const t of topTensions) {
      markdown += `- **${t.name}** (severity: ${t.severity}/10) - ${t.description}. *Implication: ${t.brand_implication}*\n`;
    }
    markdown += '\n';
  }

  return NextResponse.json({ markdown });
}

async function buildResearchSummary(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reportId: string,
  userId: string
) {
  // Verify ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, title, description')
    .eq('id', reportId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if ((project as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch analyses
  const { data: analyses } = await supabase
    .from('analysis_results')
    .select('pass_type, analysis_content')
    .eq('project_id', reportId);

  const strategicNarrative = analyses?.find(
    (a) => a.pass_type === 'strategic_narrative'
  );
  const crossSource = analyses?.find((a) => a.pass_type === 'cross_source');

  const title = (project as { title: string }).title;
  const description = (project as { description: string | null }).description;

  let markdown = `# Research Report: ${title}\n\n`;

  if (description) {
    markdown += `${description}\n\n`;
  }

  if (strategicNarrative) {
    const content = strategicNarrative.analysis_content;
    const excerpt =
      content.length > 600 ? content.slice(0, 600) + '...' : content;
    markdown += `## Strategic Narrative\n${excerpt}\n\n`;
  }

  if (crossSource) {
    const content = crossSource.analysis_content;
    const excerpt =
      content.length > 400 ? content.slice(0, 400) + '...' : content;
    markdown += `## Cross-Source Analysis\n${excerpt}\n\n`;
  }

  return NextResponse.json({ markdown });
}
