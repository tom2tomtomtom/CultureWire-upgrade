const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1CI51tsZlmqrPAHosN8sUa8eEejPMTqPkOK5XfGG5Wvc';

export interface SheetInfluencer {
  name: string;
  handle: string;
  platform: string;
  category: string;
  profileUrl: string;
  addedBy: string;
  dateAdded: string;
  status: string;
}

// Cache for 5 minutes to avoid hammering the sheet
let cache: { data: SheetInfluencer[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetch influencers from the Google Sheet via public CSV export.
 * Sheet must be shared as "anyone with link can view".
 */
export async function getInfluencersFromSheet(): Promise<SheetInfluencer[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const text = await res.text();

  // Response is wrapped in google.visualization.Query.setResponse({...})
  const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '');
  const json = JSON.parse(jsonStr);

  const rows = json.table?.rows || [];
  const influencers: SheetInfluencer[] = [];

  for (const row of rows) {
    const cells = row.c || [];
    const name = cells[0]?.v || '';
    const handle = cells[1]?.v || '';
    const platform = cells[2]?.v || '';
    const category = cells[3]?.v || '';
    const profileUrl = cells[4]?.v || '';
    const addedBy = cells[5]?.v || '';
    const dateAdded = cells[6]?.v || '';
    const status = cells[7]?.v || '';

    if (!name || !handle) continue;

    influencers.push({
      name,
      handle,
      platform,
      category,
      profileUrl,
      addedBy,
      dateAdded,
      status,
    });
  }

  cache = { data: influencers, timestamp: Date.now() };
  return influencers;
}

/**
 * Get unique categories from the sheet data.
 */
export async function getSheetCategories(): Promise<string[]> {
  const influencers = await getInfluencersFromSheet();
  const categories = [...new Set(influencers.map((i) => i.category).filter(Boolean))];
  return categories.sort();
}
