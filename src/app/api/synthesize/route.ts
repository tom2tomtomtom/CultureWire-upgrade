import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@/lib/supabase/server';
import { SynthesizeRequestSchema } from '@/lib/validators';
import {
  buildPerSourcePrompt,
  buildCrossSourcePrompt,
  buildStrategicNarrativePrompt,
} from '@/lib/prompts/synthesizer';
import type { ResearchSpec, ScrapeResult } from '@/lib/types';

async function callClaude(system: string, userContent: string): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = SynthesizeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId } = parsed.data;
  const supabase = createServerClient();

  // Update project status
  await supabase
    .from('projects')
    .update({ status: 'synthesizing' })
    .eq('id', projectId);

  // Load research spec
  const { data: spec } = await supabase
    .from('research_specs')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (!spec) {
    return NextResponse.json({ error: 'No research spec found' }, { status: 404 });
  }

  const researchSpec = spec as ResearchSpec;

  // Load all scrape results
  const { data: results } = await supabase
    .from('scrape_results')
    .select('*')
    .eq('project_id', projectId);

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'No scrape results found' }, { status: 404 });
  }

  // Group by platform
  const byPlatform = new Map<string, ScrapeResult[]>();
  for (const r of results as ScrapeResult[]) {
    const existing = byPlatform.get(r.source_platform) || [];
    existing.push(r);
    byPlatform.set(r.source_platform, existing);
  }

  // ===== PASS 1: Per-source analysis =====
  const perSourceAnalyses: { platform: string; analysis: string }[] = [];

  for (const [platform, platformResults] of byPlatform) {
    const allItems = platformResults.flatMap((r) => r.raw_data);
    const systemPrompt = buildPerSourcePrompt(platform, researchSpec);

    // Chunk if too many items
    const chunks = chunkArray(allItems, 50);
    let analysis = '';

    if (chunks.length === 1) {
      analysis = await callClaude(
        systemPrompt,
        `Here are ${allItems.length} results from ${platform}:\n\n${JSON.stringify(allItems.slice(0, 50), null, 2)}`
      );
    } else {
      // Summarize chunks then consolidate
      const chunkSummaries: string[] = [];
      for (const chunk of chunks) {
        const summary = await callClaude(
          systemPrompt,
          `Summarize the key findings from this batch of ${chunk.length} results:\n\n${JSON.stringify(chunk, null, 2)}`
        );
        chunkSummaries.push(summary);
      }
      analysis = await callClaude(
        systemPrompt,
        `Consolidate these batch summaries into a single analysis:\n\n${chunkSummaries.join('\n\n---\n\n')}`
      );
    }

    await supabase.from('analysis_results').insert({
      project_id: projectId,
      pass_type: 'per_source',
      source_platform: platform,
      analysis_content: analysis,
      metadata: { item_count: allItems.length },
    });

    perSourceAnalyses.push({ platform, analysis });
  }

  // ===== PASS 2: Cross-source synthesis =====
  const crossSourceInput = perSourceAnalyses
    .map((a) => `## ${a.platform}\n\n${a.analysis}`)
    .join('\n\n---\n\n');

  const crossSourceAnalysis = await callClaude(
    buildCrossSourcePrompt(researchSpec),
    crossSourceInput
  );

  await supabase.from('analysis_results').insert({
    project_id: projectId,
    pass_type: 'cross_source',
    source_platform: null,
    analysis_content: crossSourceAnalysis,
    metadata: { sources: perSourceAnalyses.map((a) => a.platform) },
  });

  // ===== PASS 3: Strategic narrative =====
  const strategicNarrative = await callClaude(
    buildStrategicNarrativePrompt(researchSpec),
    crossSourceAnalysis
  );

  await supabase.from('analysis_results').insert({
    project_id: projectId,
    pass_type: 'strategic_narrative',
    source_platform: null,
    analysis_content: strategicNarrative,
    metadata: {},
  });

  // Update project status
  await supabase
    .from('projects')
    .update({ status: 'complete' })
    .eq('id', projectId);

  return NextResponse.json({
    perSourceAnalyses,
    crossSourceAnalysis,
    strategicNarrative,
  });
}
