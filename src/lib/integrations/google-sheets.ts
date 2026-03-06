import { google } from 'googleapis';

function getAuth() {
  const credPath = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  if (!credPath) throw new Error('GOOGLE_SHEETS_CREDENTIALS_JSON not configured');

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

export async function getSheetData(): Promise<Record<string, string>[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Influencers!A:F',
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

export async function appendToSheet(
  rows: string[][]
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Influencers!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

export async function syncInfluencersToSheet(
  influencers: { name: string; handle: string; platform: string; category: string; added_by: string }[]
): Promise<number> {
  const rows = influencers.map((inf) => [
    inf.name,
    inf.handle,
    inf.platform,
    inf.category,
    inf.added_by || '',
    new Date().toISOString().split('T')[0],
  ]);

  await appendToSheet(rows);
  return rows.length;
}
