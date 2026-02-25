import { NextRequest, NextResponse, after } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@/lib/supabase/server';
import { SynthesizeRequestSchema } from '@/lib/validators';
import {
  buildPerSourcePrompt,
  buildCrossSourcePrompt,
  buildStrategicNarrativePrompt,
} from '@/lib/prompts/synthesizer';
import type { ResearchSpec, ScrapeResult } from '@/lib/types';

const MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];

async function callClaude(system: string, userContent: string): Promise<string> {
  const anthropic = getAnthropicClient();

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: userContent }],
      });

      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isOverloaded = msg.includes('overloaded') || msg.includes('529') || msg.includes('rate');

      if (isOverloaded && i < MODELS.length - 1) {
        console.log(`[synthesize] ${model} overloaded, falling back to ${MODELS[i + 1]}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unreachable');
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

  // Validate spec and results exist before committing
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

  const { data: results } = await supabase
    .from('scrape_results')
    .select('*')
    .eq('project_id', projectId);

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'No scrape results found' }, { status: 404 });
  }

  // Set project status and clean up previous results
  await supabase
    .from('projects')
    .update({ status: 'synthesizing' })
    .eq('id', projectId);

  await supabase
    .from('analysis_results')
    .delete()
    .eq('project_id', projectId);

  // Return immediately — synthesis runs in the background
  after(async () => {
    const bgSupabase = createServerClient();

    try {
      const researchSpec = spec as ResearchSpec;

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
        console.log(`[synthesize] Processing ${platform}...`);
        const allItems = platformResults.flatMap((r) => r.raw_data);
        const systemPrompt = buildPerSourcePrompt(platform, researchSpec);

        const truncateItem = (item: Record<string, unknown>) => {
          const truncated: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item)) {
            if (typeof value === 'string' && value.length > 500) {
              truncated[key] = value.slice(0, 500) + '...';
            } else if (typeof value === 'object' && value !== null) {
              const json = JSON.stringify(value);
              if (json.length > 1000) {
                truncated[key] = json.slice(0, 1000) + '...';
              } else {
                truncated[key] = value;
              }
            } else {
              truncated[key] = value;
            }
          }
          return truncated;
        };

        const trimmedItems = allItems.map(truncateItem);
        const capped = trimmedItems.slice(0, 100);
        const chunks = chunkArray(capped, 50);
        let analysis = '';

        if (chunks.length === 1) {
          analysis = await callClaude(
            systemPrompt,
            `Here are ${capped.length} results from ${platform} (${allItems.length} total collected):\n\n${JSON.stringify(capped, null, 2)}`
          );
        } else {
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
            `Consolidate these ${chunkSummaries.length} batch summaries into a single analysis:\n\n${chunkSummaries.join('\n\n---\n\n')}`
          );
        }

        await bgSupabase.from('analysis_results').insert({
          project_id: projectId,
          pass_type: 'per_source',
          source_platform: platform,
          analysis_content: analysis,
          metadata: { item_count: allItems.length },
        });

        console.log(`[synthesize] ${platform} done.`);
        perSourceAnalyses.push({ platform, analysis });
      }

      // ===== PASS 2: Cross-source synthesis =====
      console.log('[synthesize] Starting cross-source synthesis...');
      const crossSourceInput = perSourceAnalyses
        .map((a) => `## ${a.platform}\n\n${a.analysis}`)
        .join('\n\n---\n\n');

      const crossSourceAnalysis = await callClaude(
        buildCrossSourcePrompt(researchSpec),
        crossSourceInput
      );

      await bgSupabase.from('analysis_results').insert({
        project_id: projectId,
        pass_type: 'cross_source',
        source_platform: null,
        analysis_content: crossSourceAnalysis,
        metadata: { sources: perSourceAnalyses.map((a) => a.platform) },
      });

      // ===== PASS 3: Strategic narrative =====
      console.log('[synthesize] Starting strategic narrative...');
      const strategicNarrative = await callClaude(
        buildStrategicNarrativePrompt(researchSpec),
        crossSourceAnalysis
      );

      await bgSupabase.from('analysis_results').insert({
        project_id: projectId,
        pass_type: 'strategic_narrative',
        source_platform: null,
        analysis_content: strategicNarrative,
        metadata: {},
      });

      // Mark complete
      await bgSupabase
        .from('projects')
        .update({ status: 'complete' })
        .eq('id', projectId);

      console.log('[synthesize] Complete!');
    } catch (err: unknown) {
      console.error('[synthesize] Fatal error:', err);
      await bgSupabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId);
    }
  });

  return NextResponse.json({ status: 'started' });
}
