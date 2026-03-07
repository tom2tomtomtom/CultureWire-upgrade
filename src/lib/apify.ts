const APIFY_BASE = 'https://api.apify.com/v2';

// ============================================
// CREDIT BALANCE CHECK
// ============================================

export interface ApifyCreditInfo {
  remaining: number;
  total: number;
  percentUsed: number;
}

export async function getApifyCreditBalance(): Promise<ApifyCreditInfo | null> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) return null;

  try {
    const [userRes, usageRes] = await Promise.all([
      fetch(`${APIFY_BASE}/users/me?token=${apiKey}`),
      fetch(`${APIFY_BASE}/users/me/usage/monthly?token=${apiKey}`),
    ]);
    if (!userRes.ok) return null;

    const userData = await userRes.json();
    const total = userData.data?.plan?.monthlyUsageCreditsUsd || 0;

    let used = 0;
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      const services = usageData.data?.monthlyServiceUsage || {};
      for (const val of Object.values(services)) {
        used += (val as Record<string, number>)?.amountAfterVolumeDiscountUsd || 0;
      }
    }

    return {
      remaining: total - used,
      total,
      percentUsed: total ? Math.round((used / total) * 100) : 0,
    };
  } catch {
    return null;
  }
}

// ============================================
// DIRECT REDDIT API (no Apify needed)
// ============================================

async function getRedditAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.REDDIT_USER_AGENT || 'CultureWire/1.0',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function scrapeRedditDirect(
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const token = await getRedditAccessToken();
  const ua = process.env.REDDIT_USER_AGENT || 'CultureWire/1.0';
  const searches = (input.searches as string[]) || [];
  const subreddit = input.searchCommunityName as string | undefined;
  const maxItems = (input.maxItems as number) || 100;
  const sort = (input.sort as string) || 'top';
  const time = (input.time as string) || 'month';

  const allResults: Record<string, unknown>[] = [];

  for (const query of searches) {
    const endpoint = subreddit
      ? `https://oauth.reddit.com/r/${subreddit}/search`
      : 'https://oauth.reddit.com/search';

    const params = new URLSearchParams({
      q: query,
      sort,
      t: time,
      limit: String(Math.min(maxItems, 100)),
      restrict_sr: subreddit ? 'true' : 'false',
    });

    const res = await fetch(`${endpoint}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': ua,
      },
    });

    if (!res.ok) {
      console.error(`Reddit search failed for "${query}": ${res.status}`);
      continue;
    }

    const data = await res.json();
    const posts = data?.data?.children || [];

    for (const post of posts) {
      const d = post.data;
      allResults.push({
        title: d.title,
        body: d.selftext,
        url: `https://reddit.com${d.permalink}`,
        score: d.score,
        numberOfComments: d.num_comments,
        communityName: d.subreddit,
        createdAt: new Date(d.created_utc * 1000).toISOString(),
        author: d.author,
      });
    }

    if (allResults.length >= maxItems) break;
  }

  return allResults.slice(0, maxItems);
}

// ============================================
// NEWS API COLLECTION (no Apify needed)
// ============================================

export async function collectNewsArticles(
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn('[news] NEWS_API_KEY not configured, skipping');
    return [];
  }

  const keywords = (input.keywords as string[]) || [];
  const pageSize = (input.pageSize as number) || 20;
  const query = keywords.slice(0, 3).join(' OR ');

  const res = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${apiKey}`
  );

  if (!res.ok) {
    console.error(`[news] NewsAPI failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.articles || []).map((article: Record<string, unknown>) => ({
    title: article.title,
    description: article.description,
    content: article.content,
    author: article.author,
    source: (article.source as Record<string, unknown>)?.name || '',
    publishedAt: article.publishedAt,
    url: article.url,
    urlToImage: article.urlToImage,
  }));
}

interface ApifyRunResult {
  id: string;
  status: string;
  defaultDatasetId: string;
}

export async function startActorRun(
  actorId: string,
  input: Record<string, unknown>
): Promise<{ runId: string }> {
  const encodedActorId = actorId.replace('/', '~');
  const response = await fetch(
    `${APIFY_BASE}/acts/${encodedActorId}/runs?token=${process.env.APIFY_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify start failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return { runId: data.data.id };
}

export async function getRunStatus(runId: string): Promise<ApifyRunResult> {
  const response = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}?token=${process.env.APIFY_API_KEY}`
  );
  if (!response.ok) throw new Error(`Apify status failed: ${response.status}`);
  const data = await response.json();
  return data.data;
}

export async function getDatasetItems(
  datasetId: string,
  limit: number = 1000
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${process.env.APIFY_API_KEY}&limit=${limit}`
  );
  if (!response.ok) throw new Error(`Apify dataset failed: ${response.status}`);
  return response.json();
}

export async function pollRunToCompletion(
  runId: string,
  timeoutMs: number = 300_000,
  intervalMs: number = 5_000
): Promise<ApifyRunResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await getRunStatus(runId);
    if (run.status === 'SUCCEEDED') return run;
    if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
      throw new Error(`Apify run ${runId} ${run.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Apify run ${runId} timed out after ${timeoutMs}ms`);
}
