import { ACTOR_REGISTRY, type PlannerParams } from '@/lib/actor-registry';
import { startActorRun, pollRunToCompletion, getDatasetItems, scrapeRedditDirect, collectNewsArticles, getApifyCreditBalance } from '@/lib/apify';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeData } from '@/lib/utils';
import type { BrandContext, CultureWireLayer, Platform } from '@/lib/types';
import type { CategoryConfig } from './categories';

/**
 * Generate platform-appropriate hashtags from category keywords.
 * Produces clean single-word or compound tags that work on Instagram/TikTok.
 */
function buildCategoryHashtags(category: CategoryConfig): string[] {
  const tags = new Set<string>();

  // Common filler words to skip
  const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'what', 'how', 'day', 'new', 'you', 'your', 'its', 'get', 'try', 'easy', 'best', 'top', 'real', 'honest']);

  // Category name as a hashtag (e.g., "Food & Beverage" → "foodbeverage")
  const catWords = category.name.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (catWords.length > 0) tags.add(catWords.join(''));

  // Extract meaningful hashtags from keywords
  for (const kw of category.keywords) {
    const words = kw.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    // Full compound (up to 3 words) — these are often real hashtags
    if (words.length >= 2) {
      tags.add(words.slice(0, 3).join(''));
    }
    // Individual meaningful words (4+ chars, not stop words)
    for (const w of words) {
      if (w.length >= 5) tags.add(w);
    }
  }

  // Add well-known platform hashtags based on group
  const groupTags: Record<string, string[]> = {
    'Consumer & Lifestyle': ['trending', 'viral', 'australia', 'fyp'],
    'Travel & Transport': ['travel', 'adventure', 'explore', 'wanderlust'],
    'Technology & Digital': ['tech', 'digital', 'innovation', 'gadgets'],
    'Health & Wellbeing': ['wellness', 'health', 'selfcare', 'motivation'],
    'Purpose & Sustainability': ['sustainable', 'ecofriendly', 'green', 'zerowaste'],
    'Sports & Entertainment': ['sports', 'entertainment', 'aussie', 'highlights'],
    'Business & Government': ['business', 'finance', 'money', 'investing'],
    'Social & Reactive': ['trending', 'viral', 'fyp', 'memes'],
  };
  for (const gt of groupTags[category.group] || []) tags.add(gt);

  return [...tags].slice(0, 12);
}

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
): Promise<{ items: Record<string, unknown>[]; runId?: string }> {
  const registry = ACTOR_REGISTRY[platform];
  if (!registry) throw new Error(`Unknown platform: ${platform}`);

  const input = registry.buildInput(params);

  if (platform === 'reddit') {
    return { items: await scrapeRedditDirect(input) };
  }

  if (platform === ('news' as Platform)) {
    return { items: await collectNewsArticles(input) };
  }

  const { runId } = await startActorRun(registry.id, input);
  const run = await pollRunToCompletion(runId, 300_000);
  const items = await getDatasetItems(run.defaultDatasetId, params.maxResults);
  return { items, runId };
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
  let validPlatforms = platforms.filter((p) => p in ACTOR_REGISTRY) as Platform[];

  // Cost optimization: check credit balance and adjust if low
  const credits = await getApifyCreditBalance();
  if (credits) {
    console.log(`[cost] Apify credits: $${credits.remaining.toFixed(2)} remaining (${credits.percentUsed}% used)`);
    if (credits.remaining < 1) {
      // Critical: only use free platforms
      console.warn('[cost] Credits critically low, restricting to free platforms only');
      validPlatforms = validPlatforms.filter((p) => {
        const reg = ACTOR_REGISTRY[p];
        return reg?.costProfile.model === 'free';
      });
    } else if (credits.remaining < 5) {
      // Low: reduce max results and skip most expensive actors
      console.warn('[cost] Credits low, reducing collection scope');
      maxResultsPerLayer = Math.min(maxResultsPerLayer, 25);
      validPlatforms = validPlatforms.filter((p) => {
        const reg = ACTOR_REGISTRY[p];
        return (reg?.costProfile.estimatedCostPer100 || 0) < 100;
      });
    }
  }

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
  const warnings: string[] = [];
  const activeRunIds: string[] = [];

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const batchRunIds: string[] = [];
    const batchResults = await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const { items, runId } = await collectFromPlatform(task.platform, task.layer, task.params);
          if (runId) batchRunIds.push(runId);
          const cleanItems = sanitizeData(items);

          // Save to DB
          await supabase.from('culture_wire_results').insert({
            search_id: searchId,
            source_platform: task.platform,
            layer: task.layer,
            raw_data: cleanItems,
            item_count: cleanItems.length,
          });

          return {
            platform: task.platform,
            layer: task.layer,
            items,
            itemCount: items.length,
          };
        } catch (error) {
          console.error(`[culture-wire] ${task.platform}/${task.layer} failed:`, error);
          warnings.push(`${task.platform}/${task.layer}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Track active runs from this batch
    activeRunIds.push(...batchRunIds);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    // Update progress on the search record so the UI can show batch progress
    const completedCount = results.length;
    const totalItems = results.reduce((sum, r) => sum + r.itemCount, 0);
    await supabase
      .from('culture_wire_searches')
      .update({
        result_summary: {
          collection_progress: `${completedCount}/${tasks.length}`,
          total_items: totalItems,
          last_update: new Date().toISOString(),
          warnings: warnings.length > 0 ? warnings : undefined,
          active_runs: activeRunIds,
        },
      })
      .eq('id', searchId);
  }

  return results;
}

/**
 * Run collection using category keywords instead of brand context.
 * Uses the category's keyword list split across layers.
 */
export async function runCategoryCollection(
  searchId: string,
  category: CategoryConfig,
  platforms: string[],
  maxResultsPerLayer: number = 50
): Promise<CollectionResult[]> {
  const supabase = createAdminClient();
  const geo = category.geo_scope === 'au' ? 'AU' : 'US';
  const validPlatforms = platforms.filter((p) => p in ACTOR_REGISTRY) as Platform[];

  // Split keywords across layers
  const third = Math.ceil(category.keywords.length / 3);
  const keywordSets: Record<CultureWireLayer, string[]> = {
    brand: category.keywords.slice(0, third),
    category: category.keywords.slice(third, third * 2),
    trending: category.keywords.slice(third * 2),
  };

  // Build platform-appropriate hashtags from category data
  const categoryHashtags = buildCategoryHashtags(category);
  console.log(`[category] Hashtags for ${category.name}:`, categoryHashtags);

  const tasks: { platform: Platform; layer: CultureWireLayer; params: PlannerParams }[] = [];
  const layers: CultureWireLayer[] = ['brand', 'category', 'trending'];

  for (const platform of validPlatforms) {
    for (const layer of layers) {
      if (platform === 'google_trends' && layer === 'brand') continue;
      if (platform === 'trustpilot') continue; // Trustpilot not useful for categories

      const keywords = keywordSets[layer];
      if (keywords.length === 0) continue;

      // Use category-derived hashtags instead of raw keywords for hashtag-based platforms
      const layerIdx = layers.indexOf(layer);
      const hashtagSlice = categoryHashtags.slice(layerIdx * 3, (layerIdx + 1) * 3);
      const hashtags = hashtagSlice.length > 0 ? hashtagSlice : categoryHashtags.slice(0, 3);

      tasks.push({
        platform,
        layer,
        params: {
          keywords,
          brands: [],
          subreddits: [],
          hashtags,
          urls: [],
          geo,
          timeRange: 'month',
          maxResults: maxResultsPerLayer,
        },
      });
    }
  }

  const CONCURRENCY = 4;
  const results: CollectionResult[] = [];

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const { items } = await collectFromPlatform(task.platform, task.layer, task.params);
          const cleanItems = sanitizeData(items);

          await supabase.from('culture_wire_results').insert({
            search_id: searchId,
            source_platform: task.platform,
            layer: task.layer,
            raw_data: cleanItems,
            item_count: cleanItems.length,
          });

          return { platform: task.platform, layer: task.layer, items, itemCount: items.length };
        } catch (error) {
          console.error(`[category] ${task.platform}/${task.layer} failed:`, error);
          await supabase.from('culture_wire_results').insert({
            search_id: searchId,
            source_platform: task.platform,
            layer: task.layer,
            raw_data: [],
            item_count: 0,
          });
          return { platform: task.platform, layer: task.layer, items: [], itemCount: 0 };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') results.push(result.value);
    }
  }

  return results;
}
