import { getAnthropicClient } from '@/lib/anthropic';
import { scoreItems, normalizeItems, buildScoredItemsSummary } from '@/lib/scoring';
import { createAdminClient } from '@/lib/supabase/server';
import { buildOpportunityAnalysisPrompt, buildTensionDetectionPrompt, buildStrategicBriefPrompt } from './prompts';
import { enrichTopResults } from './perplexity';
import { getGeoBoost } from './geo-config';
import { buildRTPAnalysisPrompt } from './right-to-play';
import type { BrandContext, CultureWireResult, ScoredOpportunity, CulturalTension } from '@/lib/types';

const MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];

async function callClaude(system: string, userContent: string, maxTokens = 8192): Promise<string> {
  const anthropic = getAnthropicClient();

  for (let i = 0; i < MODELS.length; i++) {
    try {
      const response = await anthropic.messages.create({
        model: MODELS[i],
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userContent }],
      });

      return response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((msg.includes('overloaded') || msg.includes('529')) && i < MODELS.length - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new Error('All models failed');
}

function buildDataPayload(results: CultureWireResult[], applyGeoBoost: boolean = false): string {
  const sections: string[] = [];

  const byPlatform = new Map<string, CultureWireResult[]>();
  for (const r of results) {
    const existing = byPlatform.get(r.source_platform) || [];
    existing.push(r);
    byPlatform.set(r.source_platform, existing);
  }

  for (const [platform, platformResults] of byPlatform) {
    const allItems = platformResults.flatMap((r) => r.raw_data);
    const normalized = normalizeItems(platform, allItems);
    let scored = scoreItems(platform, normalized);

    // Apply geo boost if enabled (Phase 6)
    if (applyGeoBoost) {
      scored = scored.map((item) => {
        const content = String(item._title || '') + ' ' + String(item.text || item.body || item.caption || '');
        const url = String(item._url || item.url || '');
        const boost = getGeoBoost(content, url);
        if (boost > 1.0) {
          const boostedScore = Math.min(100, Math.round(item._score * boost));
          return { ...item, _score: boostedScore, _tier: tierLabel(boostedScore), _geo_boosted: true };
        }
        return item;
      });
    }

    const summary = buildScoredItemsSummary(platform, scored);

    const byLayer = new Map<string, CultureWireResult[]>();
    for (const r of platformResults) {
      const existing = byLayer.get(r.layer) || [];
      existing.push(r);
      byLayer.set(r.layer, existing);
    }

    const layerBreakdown = Array.from(byLayer.entries())
      .map(([layer, layerResults]) => {
        const count = layerResults.reduce((sum, r) => sum + r.item_count, 0);
        return `  ${layer}: ${count} items`;
      })
      .join('\n');

    sections.push(`## ${platform} (${allItems.length} total items)\n${layerBreakdown}\n${summary}`);

    const topItems = scored
      .sort((a, b) => b._score - a._score)
      .slice(0, 50)
      .map((item) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item)) {
          if (typeof v === 'string' && v.length > 500) {
            clean[k] = v.slice(0, 500) + '...';
          } else if (typeof v === 'object' && v !== null && !k.startsWith('_')) {
            const json = JSON.stringify(v);
            clean[k] = json.length > 300 ? json.slice(0, 300) + '...' : v;
          } else {
            clean[k] = v;
          }
        }
        return clean;
      });

    sections.push(`### Top ${topItems.length} items:\n${JSON.stringify(topItems, null, 2)}`);
  }

  return sections.join('\n\n---\n\n');
}

function tierLabel(score: number): string {
  if (score >= 80) return 'STRIKE ZONE';
  if (score >= 65) return 'OPPORTUNITY';
  if (score >= 50) return 'MONITOR';
  return 'SKIP';
}

function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    throw new Error(`Failed to parse JSON: ${text.slice(0, 200)}`);
  }
}

export async function runAnalysisPipeline(
  searchId: string,
  brandName: string,
  context: BrandContext
): Promise<void> {
  const supabase = createAdminClient();

  // Load collected results
  const { data: results, error } = await supabase
    .from('culture_wire_results')
    .select('*')
    .eq('search_id', searchId);

  if (error || !results || results.length === 0) {
    throw new Error('No results found for analysis');
  }

  // Apply geo boost for AU searches
  const dataPayload = buildDataPayload(results as CultureWireResult[], true);

  // Perplexity enrichment: enrich top opportunities before Claude analysis
  let perplexityContext = '';
  try {
    if (process.env.PERPLEXITY_API_KEY) {
      // Extract top trending items for enrichment
      const topItems = (results as CultureWireResult[])
        .flatMap((r) => {
          const items = r.raw_data as Record<string, unknown>[];
          return items.map((item) => ({
            title: String(item.title || item.text || item.caption || '').slice(0, 200),
            description: String(item.body || item.description || '').slice(0, 300),
            platform: r.source_platform,
          }));
        })
        .filter((item) => item.title.length > 10)
        .slice(0, 5);

      if (topItems.length > 0) {
        const enrichments = await enrichTopResults(topItems, 3);
        if (enrichments.size > 0) {
          perplexityContext = '\n\n## REAL-TIME CONTEXT (Perplexity Enrichment)\n';
          for (const [title, enrichment] of enrichments) {
            perplexityContext += `\n### ${title}\n${enrichment.context}\nSources: ${enrichment.sources.join(', ')}\n`;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[analyzer] Perplexity enrichment failed (non-fatal):', err);
  }

  const enrichedPayload = dataPayload + perplexityContext;

  // Run opportunity scoring and tension detection in parallel
  const [opportunitiesRaw, tensionsRaw] = await Promise.all([
    callClaude(
      buildOpportunityAnalysisPrompt(brandName, context),
      enrichedPayload
    ),
    callClaude(
      buildTensionDetectionPrompt(brandName, context),
      enrichedPayload
    ),
  ]);

  const opportunities = parseJSON<ScoredOpportunity[]>(opportunitiesRaw);
  const tensions = parseJSON<CulturalTension[]>(tensionsRaw);

  // Save opportunities and tensions
  await Promise.all([
    supabase.from('culture_wire_analyses').insert({
      search_id: searchId,
      analysis_type: 'opportunities',
      content: { opportunities },
    }),
    supabase.from('culture_wire_analyses').insert({
      search_id: searchId,
      analysis_type: 'tensions',
      content: { tensions },
    }),
  ]);

  // Run Right to Play analysis (Phase 6)
  try {
    const rtpPrompt = buildRTPAnalysisPrompt(brandName, {
      category: context.category,
      brand_values: context.brand_values,
      tone: context.tone,
    });
    const rtpInput = `Brand: ${brandName}\n\nOpportunities to assess:\n${JSON.stringify(opportunities.slice(0, 10), null, 2)}`;
    const rtpRaw = await callClaude(rtpPrompt, rtpInput);
    const rtpAssessments = parseJSON<Record<string, unknown>[]>(rtpRaw);

    await supabase.from('culture_wire_analyses').insert({
      search_id: searchId,
      analysis_type: 'right_to_play',
      content: { assessments: rtpAssessments },
    });
  } catch (err) {
    console.warn('[analyzer] RTP analysis failed (non-fatal):', err);
  }

  // Run strategic brief (depends on opportunities + tensions)
  const briefInput = `${enrichedPayload}\n\n---\n\n## IDENTIFIED OPPORTUNITIES\n${JSON.stringify(opportunities, null, 2)}\n\n## IDENTIFIED TENSIONS\n${JSON.stringify(tensions, null, 2)}`;

  const strategicBrief = await callClaude(
    buildStrategicBriefPrompt(brandName, context),
    briefInput
  );

  await supabase.from('culture_wire_analyses').insert({
    search_id: searchId,
    analysis_type: 'strategic_brief',
    content: { brief: strategicBrief },
  });

  // Update search status
  const totalItems = (results as CultureWireResult[]).reduce((sum, r) => sum + r.item_count, 0);
  const goldCount = opportunities.filter((o) => o.tier === 'GOLD').length;

  await supabase
    .from('culture_wire_searches')
    .update({
      status: 'complete',
      completed_at: new Date().toISOString(),
      result_summary: {
        total_items: totalItems,
        by_platform: (results as CultureWireResult[]).reduce((acc, r) => {
          acc[r.source_platform] = (acc[r.source_platform] || 0) + r.item_count;
          return acc;
        }, {} as Record<string, number>),
        by_layer: (results as CultureWireResult[]).reduce((acc, r) => {
          acc[r.layer] = (acc[r.layer] || 0) + r.item_count;
          return acc;
        }, {} as Record<string, number>),
        top_opportunities: goldCount,
        analysis_complete: true,
      },
    })
    .eq('id', searchId);
}
