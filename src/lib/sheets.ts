import { google } from 'googleapis';
import { ACTOR_REGISTRY } from './actor-registry';
import type { Platform, ScrapeResult } from './types';

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function createProjectSheet(
  projectTitle: string,
  results: ScrapeResult[]
): Promise<string> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Create spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `Research Agent: ${projectTitle}` },
      sheets: results.map((result) => ({
        properties: { title: result.source_platform },
      })),
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Populate each sheet
  for (const result of results) {
    const platform = result.source_platform as Platform;
    const entry = ACTOR_REGISTRY[platform];
    if (!entry) continue;

    const headers = entry.extractFields;
    const rows = result.raw_data.map((item) =>
      headers.map((field) => {
        const value = item[field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      })
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${result.source_platform}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows],
      },
    });
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
