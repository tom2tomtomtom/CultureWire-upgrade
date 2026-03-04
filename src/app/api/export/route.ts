import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ACTOR_REGISTRY } from '@/lib/actor-registry';
import { buildHtmlDashboard } from '@/lib/dashboard';
import type { Platform, ScrapeResult, AnalysisResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const format = searchParams.get('format') || 'csv';

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const [projectRes, resultsRes, analysesRes] = await Promise.all([
    supabase.from('projects').select('title').eq('id', projectId).single(),
    supabase.from('scrape_results').select('*').eq('project_id', projectId),
    supabase.from('analysis_results').select('*').eq('project_id', projectId),
  ]);

  if (!projectRes.data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const title = projectRes.data.title;
  const results = (resultsRes.data || []) as ScrapeResult[];
  const analyses = (analysesRes.data || []) as AnalysisResult[];

  if (format === 'csv') {
    return buildCsvResponse(title, results);
  } else if (format === 'dashboard') {
    return buildDashboardResponse(title, results, analyses);
  } else {
    return buildMarkdownResponse(title, results, analyses);
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvResponse(title: string, results: ScrapeResult[]): NextResponse {
  const sections: string[] = [];

  for (const result of results) {
    const platform = result.source_platform as Platform;
    const entry = ACTOR_REGISTRY[platform];
    if (!entry) continue;

    const headers = entry.extractFields;
    const headerRow = headers.map(escapeCsv).join(',');

    const dataRows = result.raw_data.map((item) =>
      headers.map((field) => {
        const value = item[field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return escapeCsv(JSON.stringify(value));
        return escapeCsv(String(value));
      }).join(',')
    );

    sections.push(`\n--- ${entry.displayName} (${result.item_count} items) ---\n`);
    sections.push(headerRow);
    sections.push(...dataRows);
  }

  const csv = sections.join('\n');
  const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeTitle} - Data.csv"`,
    },
  });
}

function buildMarkdownResponse(
  title: string,
  results: ScrapeResult[],
  analyses: AnalysisResult[]
): NextResponse {
  const sections: string[] = [];

  sections.push(`# ${title}\n`);
  sections.push(`*Exported ${new Date().toLocaleDateString()}*\n`);

  // Strategic narrative first
  const narrative = analyses.find((a) => a.pass_type === 'strategic_narrative');
  if (narrative) {
    sections.push('\n---\n');
    sections.push(narrative.analysis_content);
  }

  // Cross-source analysis
  const crossSource = analyses.find((a) => a.pass_type === 'cross_source');
  if (crossSource) {
    sections.push('\n---\n');
    sections.push('# Cross-Source Analysis\n');
    sections.push(crossSource.analysis_content);
  }

  // Per-source analyses
  const perSource = analyses.filter((a) => a.pass_type === 'per_source');
  for (const analysis of perSource) {
    sections.push('\n---\n');
    sections.push(`# ${analysis.source_platform} Analysis\n`);
    sections.push(analysis.analysis_content);
  }

  // Raw data summary
  sections.push('\n---\n');
  sections.push('# Raw Data Summary\n');
  for (const result of results) {
    const platform = result.source_platform as Platform;
    const entry = ACTOR_REGISTRY[platform];
    if (!entry) continue;

    sections.push(`\n## ${entry.displayName} (${result.item_count} items)\n`);

    const headers = entry.extractFields;
    // Build markdown table for first 20 items
    const displayFields = headers.slice(0, 5); // Limit columns for readability
    sections.push('| ' + displayFields.join(' | ') + ' |');
    sections.push('| ' + displayFields.map(() => '---').join(' | ') + ' |');

    const rows = result.raw_data.slice(0, 20);
    for (const item of rows) {
      const cells = displayFields.map((field) => {
        const value = item[field];
        if (value === null || value === undefined) return '';
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return str.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 80);
      });
      sections.push('| ' + cells.join(' | ') + ' |');
    }

    if (result.raw_data.length > 20) {
      sections.push(`\n*...and ${result.raw_data.length - 20} more items (use CSV export for full data)*\n`);
    }
  }

  const markdown = sections.join('\n');
  const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50);

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeTitle} - Report.md"`,
    },
  });
}

function buildDashboardResponse(
  title: string,
  results: ScrapeResult[],
  analyses: AnalysisResult[]
): NextResponse {
  const html = buildHtmlDashboard(title, results, analyses);
  const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeTitle} - Dashboard.html"`,
    },
  });
}
