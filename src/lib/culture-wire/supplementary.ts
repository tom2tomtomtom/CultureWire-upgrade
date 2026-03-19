import { ACTOR_REGISTRY, type PlannerParams } from '@/lib/actor-registry';
import { startActorRun, pollRunToCompletion, getDatasetItems, scrapeRedditDirect } from '@/lib/apify';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeData } from '@/lib/utils';

interface SupplementaryResult {
  scan_type: 'reddit_threads' | 'google_trends' | 'news';
  items: Record<string, unknown>[];
  item_count: number;
}

/**
 * Run supplementary scan for deeper insights on top opportunities.
 * Adds Reddit thread deep dives, Google Trends data, and News articles.
 */
async function runSupplementaryScanInternal(
  searchId: string,
  keywords: string[],
  geo: string = 'AU'
): Promise<SupplementaryResult[]> {
  const supabase = createAdminClient();
  const results: SupplementaryResult[] = [];

  // 1. Reddit thread deep dive
  try {
    const redditParams: PlannerParams = {
      keywords: keywords.slice(0, 5),
      brands: [],
      subreddits: [],
      hashtags: [],
      urls: [],
      geo,
      timeRange: 'week',
      maxResults: 100,
    };

    const registry = ACTOR_REGISTRY['reddit'];
    const input = registry.buildInput(redditParams);
    const items = await scrapeRedditDirect(input);

    await supabase.from('culture_wire_supplementary').insert({
      search_id: searchId,
      scan_type: 'reddit_threads',
      raw_data: sanitizeData(items),
      item_count: items.length,
    });

    results.push({ scan_type: 'reddit_threads', items, item_count: items.length });
  } catch (error) {
    console.error('[supplementary] Reddit threads failed:', error);
    results.push({ scan_type: 'reddit_threads', items: [], item_count: 0 });
  }

  // 2. Google Trends
  try {
    const trendsRegistry = ACTOR_REGISTRY['google_trends'];
    const trendsInput = trendsRegistry.buildInput({
      keywords: keywords.slice(0, 5),
      brands: [],
      subreddits: [],
      hashtags: [],
      urls: [],
      geo,
      timeRange: 'today 3-m',
      maxResults: 5,
    });

    const { runId } = await startActorRun(trendsRegistry.id, trendsInput);
    const run = await pollRunToCompletion(runId, 120_000);
    const items = await getDatasetItems(run.defaultDatasetId, 10);

    await supabase.from('culture_wire_supplementary').insert({
      search_id: searchId,
      scan_type: 'google_trends',
      raw_data: sanitizeData(items),
      item_count: items.length,
    });

    results.push({ scan_type: 'google_trends', items, item_count: items.length });
  } catch (error) {
    console.error('[supplementary] Google Trends failed:', error);
    results.push({ scan_type: 'google_trends', items: [], item_count: 0 });
  }

  // 3. News via NewsAPI
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
      const query = keywords.slice(0, 3).join(' OR ');
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${newsApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const articles = data.articles || [];

      await supabase.from('culture_wire_supplementary').insert({
        search_id: searchId,
        scan_type: 'news',
        raw_data: sanitizeData(articles),
        item_count: articles.length,
      });

      results.push({ scan_type: 'news', items: articles, item_count: articles.length });
    }
  } catch (error) {
    console.error('[supplementary] News failed:', error);
    results.push({ scan_type: 'news', items: [], item_count: 0 });
  }

  return results;
}

export async function runSupplementaryScan(
  searchId: string,
  keywords: string[],
  geo: string = 'AU'
): Promise<SupplementaryResult[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supplementary scan timed out after 5 minutes')), 5 * 60 * 1000)
  );
  try {
    return await Promise.race([runSupplementaryScanInternal(searchId, keywords, geo), timeout]);
  } catch (err) {
    console.error('[supplementary] Scan timed out or failed:', err);
    return [];
  }
}
