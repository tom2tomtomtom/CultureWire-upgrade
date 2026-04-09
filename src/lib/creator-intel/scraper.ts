import type { ScrapeCreatorsResponse } from './types';

const API_BASE = 'https://api.scrapecreators.com/v1/tiktok/search/hashtag';

function getApiKey(): string {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new Error('SCRAPECREATORS_API_KEY not configured');
  return key;
}

export async function searchHashtag(
  hashtag: string,
  region: string = 'AU'
): Promise<ScrapeCreatorsResponse> {
  const url = `${API_BASE}?hashtag=${encodeURIComponent(hashtag)}&region=${encodeURIComponent(region)}&trim=true`;

  const res = await fetch(url, {
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`ScrapeCreators API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function searchMultipleHashtags(
  hashtags: string[],
  region: string = 'AU'
): Promise<ScrapeCreatorsResponse[]> {
  const results = await Promise.all(
    hashtags.map((tag) => searchHashtag(tag, region).catch(() => ({ success: false, credits_remaining: 0, aweme_list: [] })))
  );
  return results;
}
