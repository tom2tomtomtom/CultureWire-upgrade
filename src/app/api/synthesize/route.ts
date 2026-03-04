import { NextRequest, NextResponse, after } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { createServerClient } from '@/lib/supabase/server';
import { SynthesizeRequestSchema } from '@/lib/validators';
import {
  buildPerSourcePrompt,
  buildCrossSourcePrompt,
  buildStrategicNarrativePrompt,
  buildCreativeRoutesPrompt,
} from '@/lib/prompts/synthesizer';
import { scoreItems, toDisplayItems, buildScoredItemsSummary } from '@/lib/scoring';
import type { ResearchSpec, ScrapeResult } from '@/lib/types';

const MODELS = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];

// Fields that contain the actual content — keep these at full length
const CONTENT_FIELDS = new Set([
  'title', 'text', 'body', 'description', 'companyReply', 'caption',
]);

async function callClaude(system: string, userContent: string, maxTokens = 4096): Promise<string> {
  const anthropic = getAnthropicClient();

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
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

function buildDataSummary(platform: string, items: Record<string, unknown>[]): string {
  const count = items.length;
  const lines: string[] = [`**${platform}** — ${count} items collected`];

  // Date range
  const dateField = platform === 'tiktok' ? 'createTime' : platform === 'trustpilot' ? 'date' : platform === 'youtube' ? 'publishedAt' : platform === 'instagram' ? 'timestamp' : 'createdAt';
  const dates = items.map((i) => i[dateField]).filter(Boolean).map((d) => new Date(d as string)).filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
  if (dates.length > 1) {
    lines.push(`Date range: ${dates[0].toLocaleDateString()} — ${dates[dates.length - 1].toLocaleDateString()}`);
  }

  // Platform-specific stats
  if (platform === 'reddit') {
    const scores = items.map((i) => Number(i.score) || 0);
    const comments = items.map((i) => Number(i.numberOfComments) || 0);
    const subs: Record<string, number> = {};
    for (const i of items) { const s = String(i.communityName || ''); if (s) subs[s] = (subs[s] || 0) + 1; }
    const topSubs = Object.entries(subs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s} (${c})`).join(', ');
    lines.push(`Score: avg ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}, max ${Math.max(...scores)}`);
    lines.push(`Comments: avg ${Math.round(comments.reduce((a, b) => a + b, 0) / comments.length)}`);
    if (topSubs) lines.push(`Top subreddits: ${topSubs}`);
  } else if (platform === 'trustpilot') {
    const ratings = items.map((i) => Number(i.rating) || 0).filter(Boolean);
    const dist = [1, 2, 3, 4, 5].map((r) => `${r}★: ${ratings.filter((x) => Math.round(x) === r).length}`).join(', ');
    lines.push(`Avg rating: ${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}/5`);
    lines.push(`Distribution: ${dist}`);
    const withReply = items.filter((i) => i.companyReply).length;
    lines.push(`Company replies: ${withReply} of ${count} (${Math.round((withReply / count) * 100)}%)`);
  } else if (platform === 'youtube') {
    const views = items.map((i) => Number(i.viewCount) || 0);
    const likes = items.map((i) => Number(i.likeCount) || 0);
    lines.push(`Total views: ${views.reduce((a, b) => a + b, 0).toLocaleString()}, avg ${Math.round(views.reduce((a, b) => a + b, 0) / views.length).toLocaleString()}`);
    lines.push(`Avg likes: ${Math.round(likes.reduce((a, b) => a + b, 0) / likes.length).toLocaleString()}`);
    const channels: Record<string, number> = {};
    for (const i of items) { const c = String(i.channelTitle || ''); if (c) channels[c] = (channels[c] || 0) + 1; }
    const topChannels = Object.entries(channels).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c} (${n})`).join(', ');
    if (topChannels) lines.push(`Top channels: ${topChannels}`);
  } else if (platform === 'tiktok') {
    const plays = items.map((i) => Number(i.playCount) || 0);
    const shares = items.map((i) => Number(i.shareCount) || 0);
    lines.push(`Total plays: ${plays.reduce((a, b) => a + b, 0).toLocaleString()}, avg ${Math.round(plays.reduce((a, b) => a + b, 0) / plays.length).toLocaleString()}`);
    lines.push(`Total shares: ${shares.reduce((a, b) => a + b, 0).toLocaleString()}`);
    const hashtags = items.flatMap((i) => Array.isArray(i.hashtags) ? (i.hashtags as { name?: string }[]).map((h) => h.name || String(h)) : []);
    const tagCounts = hashtags.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `#${t} (${c})`).join(', ');
    if (topTags) lines.push(`Top hashtags: ${topTags}`);
  } else if (platform === 'instagram') {
    const likes = items.map((i) => Number(i.likesCount) || 0);
    const comments = items.map((i) => Number(i.commentsCount) || 0);
    lines.push(`Total likes: ${likes.reduce((a, b) => a + b, 0).toLocaleString()}, avg ${Math.round(likes.reduce((a, b) => a + b, 0) / likes.length).toLocaleString()}`);
    lines.push(`Total comments: ${comments.reduce((a, b) => a + b, 0).toLocaleString()}`);
    const usernames: Record<string, number> = {};
    for (const i of items) { const u = String(i.ownerUsername || ''); if (u) usernames[u] = (usernames[u] || 0) + 1; }
    const topUsers = Object.entries(usernames).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, c]) => `@${u} (${c})`).join(', ');
    if (topUsers) lines.push(`Top creators: ${topUsers}`);
    const hashtags = items.flatMap((i) => Array.isArray(i.hashtags) ? (i.hashtags as string[]).map((h) => String(h)) : []);
    const tagCounts: Record<string, number> = {};
    for (const h of hashtags) { tagCounts[h] = (tagCounts[h] || 0) + 1; }
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `#${t} (${c})`).join(', ');
    if (topTags) lines.push(`Top hashtags: ${topTags}`);
  } else if (platform === 'google_trends') {
    const keywords = items.map((i) => String(i.keyword || '')).filter(Boolean);
    if (keywords.length) lines.push(`Keywords tracked: ${keywords.join(', ')}`);
  }

  return lines.join('\n');
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Extract brand_context from the raw_llm_output JSON spec block */
function extractBrandContext(rawOutput: string | null): string {
  if (!rawOutput) return '';
  const match = rawOutput.match(/```json:research_spec\n([\s\S]*?)\n```/);
  if (!match) return '';
  try {
    const parsed = JSON.parse(match[1]);
    return parsed.brand_context || '';
  } catch {
    return '';
  }
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
      const brandContext = extractBrandContext(spec.raw_llm_output as string | null);

      // Group by platform
      const byPlatform = new Map<string, ScrapeResult[]>();
      for (const r of results as ScrapeResult[]) {
        const existing = byPlatform.get(r.source_platform) || [];
        existing.push(r);
        byPlatform.set(r.source_platform, existing);
      }

      // ===== PASS 1: Per-source analysis (with scoring) =====
      const perSourceAnalyses: { platform: string; analysis: string }[] = [];

      for (const [platform, platformResults] of byPlatform) {
        console.log(`[synthesize] Processing ${platform}...`);
        const allItems = platformResults.flatMap((r) => r.raw_data);
        const systemPrompt = buildPerSourcePrompt(platform, researchSpec);

        // Score items deterministically before sending to Claude
        const scoredItems = scoreItems(platform, allItems);
        const topItems = toDisplayItems(scoredItems);
        const scoredSummary = buildScoredItemsSummary(platform, scoredItems);

        // Keep content fields at full length, truncate metadata/nested objects
        const truncateItem = (item: Record<string, unknown>) => {
          const truncated: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item)) {
            // Skip internal scoring fields from the raw data sent to Claude
            if (key.startsWith('_')) continue;
            if (typeof value === 'string') {
              const limit = CONTENT_FIELDS.has(key) ? 1500 : 300;
              truncated[key] = value.length > limit ? value.slice(0, limit) + '...' : value;
            } else if (typeof value === 'object' && value !== null) {
              const json = JSON.stringify(value);
              truncated[key] = json.length > 500 ? json.slice(0, 500) + '...' : value;
            } else {
              truncated[key] = value;
            }
          }
          return truncated;
        };

        // Sort by score descending so Claude sees best content first
        const sortedItems = [...scoredItems].sort((a, b) => b._score - a._score);
        const trimmedItems = sortedItems.map(truncateItem);
        const capped = trimmedItems.slice(0, 300);
        const chunks = chunkArray(capped, 75);
        let analysis = '';

        const dataSummary = buildDataSummary(platform, allItems);

        if (chunks.length === 1) {
          analysis = await callClaude(
            systemPrompt,
            `DATA SUMMARY:\n${dataSummary}\n\n${scoredSummary}\n\n---\n\nHere are ${capped.length} results from ${platform} (${allItems.length} total collected), sorted by engagement score:\n\n${JSON.stringify(capped, null, 2)}`,
            8192
          );
        } else {
          const chunkSummaries: string[] = [];
          for (const chunk of chunks) {
            const summary = await callClaude(
              systemPrompt,
              `DATA SUMMARY:\n${dataSummary}\n\n${scoredSummary}\n\n---\n\nSummarize the key findings from this batch of ${chunk.length} results:\n\n${JSON.stringify(chunk, null, 2)}`
            );
            chunkSummaries.push(summary);
          }
          analysis = await callClaude(
            systemPrompt,
            `DATA SUMMARY:\n${dataSummary}\n\n${scoredSummary}\n\n---\n\nConsolidate these ${chunkSummaries.length} batch summaries into a single analysis:\n\n${chunkSummaries.join('\n\n---\n\n')}`,
            8192
          );
        }

        await bgSupabase.from('analysis_results').insert({
          project_id: projectId,
          pass_type: 'per_source',
          source_platform: platform,
          analysis_content: analysis,
          metadata: {
            item_count: allItems.length,
            top_items: topItems,
          },
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
        crossSourceInput,
        8192
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
      const perSourceSection = perSourceAnalyses
        .map((a) => {
          const trimmed = a.analysis.length > 3000 ? a.analysis.slice(0, 3000) + '\n\n[...truncated]' : a.analysis;
          return `### ${a.platform}\n\n${trimmed}`;
        })
        .join('\n\n---\n\n');

      const strategicInput = `## Cross-Source Synthesis\n\n${crossSourceAnalysis}\n\n---\n\n## Per-Source Evidence (key sections)\n\n${perSourceSection}`;

      const strategicNarrative = await callClaude(
        buildStrategicNarrativePrompt(researchSpec),
        strategicInput,
        8192
      );

      await bgSupabase.from('analysis_results').insert({
        project_id: projectId,
        pass_type: 'strategic_narrative',
        source_platform: null,
        analysis_content: strategicNarrative,
        metadata: {},
      });

      // ===== PASS 4: Creative Routes =====
      console.log('[synthesize] Generating creative routes...');
      const routesInput = `## Strategic Narrative\n\n${strategicNarrative}\n\n---\n\n## Cross-Source Synthesis\n\n${crossSourceAnalysis}`;

      const creativeRoutes = await callClaude(
        buildCreativeRoutesPrompt(researchSpec, brandContext),
        routesInput,
        8192
      );

      await bgSupabase.from('analysis_results').insert({
        project_id: projectId,
        pass_type: 'creative_routes',
        source_platform: null,
        analysis_content: creativeRoutes,
        metadata: {},
      });

      // Mark complete
      await bgSupabase
        .from('projects')
        .update({ status: 'complete' })
        .eq('id', projectId);

      console.log('[synthesize] Complete!');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      console.error('[synthesize] Fatal error:', errMsg);
      await bgSupabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId);
    }
  });

  return NextResponse.json({ status: 'started' });
}
