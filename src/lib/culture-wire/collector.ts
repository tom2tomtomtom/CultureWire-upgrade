import { ACTOR_REGISTRY, type PlannerParams } from '@/lib/actor-registry';
import { startActorRun, pollRunToCompletion, getDatasetItems, scrapeRedditDirect } from '@/lib/apify';
import { createAdminClient } from '@/lib/supabase/server';
import type { BrandContext, CultureWireLayer, Platform } from '@/lib/types';

interface CollectionResult {
  platform: string;
  layer: CultureWireLayer;
  items: Record<string, unknown>[];
  itemCount: number;
}

function buildLayerParams(
  brandName: string,
  context: BrandContext,
  layer: CultureWireLayer,
  platform: Platform,
  geo: string,
  maxResults: number
): PlannerParams {
  const keywords = layer === 'brand'
    ? context.keywords.brand
    : layer === 'category'
      ? context.keywords.category
      : context.keywords.trending;

  return {
    keywords,
    brands: layer === 'brand' ? [brandName, ...context.competitors.slice(0, 2)] : [],
    subreddits: [],
    hashtags: keywords.slice(0, 3),
    urls: [],
    geo,
    timeRange: 'month',
    maxResults,
  };
}

async function collectFromPlatform(
  platform: Platform,
  layer: CultureWireLayer,
  params: PlannerParams
): Promise<Record<string, unknown>[]> {
  const registry = ACTOR_REGISTRY[platform];
  if (!registry) throw new Error(`Unknown platform: ${platform}`);

  const input = registry.buildInput(params);

  if (platform === 'reddit') {
    return scrapeRedditDirect(input);
  }

  const { runId } = await startActorRun(registry.id, input);
  const run = await pollRunToCompletion(runId, 300_000);
  return getDatasetItems(run.defaultDatasetId, params.maxResults);
}

export async function runThreeLayerCollection(
  searchId: string,
  brandName: string,
  context: BrandContext,
  platforms: string[],
  geo: string,
  maxResultsPerLayer: number = 50
): Promise<CollectionResult[]> {
  const supabase = createAdminClient();
  const layers: CultureWireLayer[] = ['brand', 'category', 'trending'];
  const validPlatforms = platforms.filter((p) => p in ACTOR_REGISTRY) as Platform[];

  // Build all collection tasks
  const tasks: { platform: Platform; layer: CultureWireLayer; params: PlannerParams }[] = [];
  for (const platform of validPlatforms) {
    for (const layer of layers) {
      // Skip google_trends for brand layer (not useful)
      if (platform === 'google_trends' && layer === 'brand') continue;
      // Skip trustpilot for trending layer (not relevant)
      if (platform === 'trustpilot' && layer === 'trending') continue;

      const params = buildLayerParams(brandName, context, layer, platform, geo, maxResultsPerLayer);
      tasks.push({ platform, layer, params });
    }
  }

  // Run all tasks in parallel (with concurrency limit)
  const CONCURRENCY = 4;
  const results: CollectionResult[] = [];

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const items = await collectFromPlatform(task.platform, task.layer, task.params);

          // Save to DB
          await supabase.from('culture_wire_results').insert({
            search_id: searchId,
            source_platform: task.platform,
            layer: task.layer,
            raw_data: items,
            item_count: items.length,
          });

          return {
            platform: task.platform,
            layer: task.layer,
            items,
            itemCount: items.length,
          };
        } catch (error) {
          console.error(`[culture-wire] ${task.platform}/${task.layer} failed:`, error);
          // Save empty result to track the failure
          await supabase.from('culture_wire_results').insert({
            search_id: searchId,
            source_platform: task.platform,
            layer: task.layer,
            raw_data: [],
            item_count: 0,
          });

          return {
            platform: task.platform,
            layer: task.layer,
            items: [],
            itemCount: 0,
          };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}
