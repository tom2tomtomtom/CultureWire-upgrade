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
      return await buildCultureWireExport(supabase, reportId, session.sub);
    } else {
      return await buildResearchExport(supabase, reportId, session.sub);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildCultureWireExport(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reportId: string,
  userId: string
) {
  const { data: search, error: searchError } = await supabase
    .from('culture_wire_searches')
    .select('id, user_id, brand_name, platforms, geo, status, created_at')
    .eq('id', reportId)
    .single();

  if (searchError || !search) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if ((search as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all analyses and raw results
  const [{ data: analyses }, { data: results }] = await Promise.all([
    supabase
      .from('culture_wire_analyses')
      .select('analysis_type, content')
      .eq('search_id', reportId),
    supabase
      .from('culture_wire_results')
      .select('source_platform, layer, item_count, raw_data')
      .eq('search_id', reportId),
  ]);

  const opportunities =
    (analyses?.find((a) => a.analysis_type === 'opportunities')?.content as {
      opportunities?: Array<{
        title: string;
        description: string;
        tier: string;
        score: number;
        platform: string;
        right_to_play: string;
        evidence: string[];
        dimensions?: Record<string, number>;
      }>;
    })?.opportunities || [];

  const tensions =
    (analyses?.find((a) => a.analysis_type === 'tensions')?.content as {
      tensions?: Array<{
        name: string;
        description: string;
        severity: number;
        platforms: string[];
        brand_implication: string;
        evidence: string[];
      }>;
    })?.tensions || [];

  const brief =
    (analyses?.find((a) => a.analysis_type === 'strategic_brief')?.content as {
      brief?: string;
    })?.brief || '';

  const rtp = analyses?.find((a) => a.analysis_type === 'right_to_play')?.content;

  const brandName = (search as { brand_name: string }).brand_name;
  const platforms = (search as { platforms: string[] }).platforms;
  const geo = (search as { geo: string }).geo;

  let markdown = `# CultureWire Report: ${brandName}\n\n`;
  markdown += `**Platforms**: ${platforms.join(', ')} | **Geo**: ${geo} | **Date**: ${new Date((search as { created_at: string }).created_at).toLocaleDateString()}\n\n`;

  // Strategic Brief (full)
  if (brief) {
    markdown += `## Strategic Brief\n\n${brief}\n\n`;
  }

  // Right to Play
  if (rtp) {
    markdown += `## Right to Play Assessment\n\n`;
    const rtpContent = rtp as Record<string, unknown>;
    if (rtpContent.classification) markdown += `**Classification**: ${rtpContent.classification}\n`;
    if (rtpContent.score) markdown += `**Score**: ${rtpContent.score}/100\n`;
    if (rtpContent.rationale) markdown += `\n${rtpContent.rationale}\n`;
    markdown += '\n';
  }

  // All opportunities
  if (opportunities.length > 0) {
    markdown += `## Opportunities (${opportunities.length})\n\n`;
    for (const opp of opportunities.sort((a, b) => b.score - a.score)) {
      markdown += `### [${opp.tier}] ${opp.title} (Score: ${opp.score}/100)\n`;
      markdown += `**Platform**: ${opp.platform} | **Right to Play**: ${opp.right_to_play}\n\n`;
      markdown += `${opp.description}\n\n`;
      if (opp.dimensions) {
        markdown += `**Dimensions**: ${Object.entries(opp.dimensions).map(([k, v]) => `${k}: ${v}`).join(', ')}\n\n`;
      }
      if (opp.evidence?.length > 0) {
        markdown += `**Evidence**:\n`;
        for (const e of opp.evidence) {
          markdown += `- ${e}\n`;
        }
        markdown += '\n';
      }
    }
  }

  // All tensions
  if (tensions.length > 0) {
    markdown += `## Cultural Tensions (${tensions.length})\n\n`;
    for (const t of tensions.sort((a, b) => b.severity - a.severity)) {
      markdown += `### ${t.name} (Severity: ${t.severity}/10)\n`;
      markdown += `**Platforms**: ${t.platforms.join(', ')}\n\n`;
      markdown += `${t.description}\n\n`;
      markdown += `**Brand Implication**: ${t.brand_implication}\n\n`;
      if (t.evidence?.length > 0) {
        markdown += `**Evidence**:\n`;
        for (const e of t.evidence) {
          markdown += `- ${e}\n`;
        }
        markdown += '\n';
      }
    }
  }

  // Collection data summary
  if (results && results.length > 0) {
    markdown += `## Collection Data\n\n`;
    markdown += `| Platform | Layer | Items |\n|----------|-------|-------|\n`;
    for (const r of results) {
      markdown += `| ${r.source_platform} | ${r.layer} | ${r.item_count} |\n`;
    }
    markdown += '\n';

    // Include top raw posts per platform
    for (const r of results) {
      if (!r.raw_data?.length) continue;
      const items = r.raw_data as Record<string, unknown>[];
      const top = items.slice(0, 10);
      markdown += `### ${r.source_platform} — ${r.layer} (top ${top.length} of ${r.item_count})\n\n`;
      for (const item of top) {
        const title = item.title || item.caption || item.text || '';
        const body = item.body || item.description || item.content || '';
        const url = item.url || item.webVideoUrl || '';
        const engagement = item.score || item.likesCount || item.viewCount || item.diggCount || item.likes || '';
        if (title) markdown += `**${title}**\n`;
        if (body) {
          const bodyStr = String(body);
          markdown += `${bodyStr.length > 300 ? bodyStr.slice(0, 300) + '...' : bodyStr}\n`;
        }
        if (engagement) markdown += `Engagement: ${engagement}`;
        if (url) markdown += ` | [Link](${url})`;
        if (engagement || url) markdown += '\n';
        markdown += '\n';
      }
    }
  }

  return NextResponse.json({ markdown });
}

async function buildResearchExport(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reportId: string,
  userId: string
) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, title, description, objectives, created_at')
    .eq('id', reportId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if ((project as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all analyses
  const { data: analyses } = await supabase
    .from('analysis_results')
    .select('pass_type, analysis_content')
    .eq('project_id', reportId)
    .order('created_at', { ascending: true });

  const title = (project as { title: string }).title;
  const description = (project as { description: string | null }).description;
  const objectives = (project as { objectives: string | null }).objectives;

  let markdown = `# Research Report: ${title}\n\n`;

  if (description) {
    markdown += `${description}\n\n`;
  }
  if (objectives) {
    markdown += `**Objectives**: ${objectives}\n\n`;
  }

  // Include all analysis passes in full
  if (analyses && analyses.length > 0) {
    for (const analysis of analyses) {
      const label = analysis.pass_type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
      markdown += `## ${label}\n\n`;
      markdown += `${analysis.analysis_content}\n\n`;
    }
  }

  return NextResponse.json({ markdown });
}
