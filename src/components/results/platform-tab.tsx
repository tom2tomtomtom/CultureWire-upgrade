'use client';

import { DataTable } from './data-table';
import { AnalysisSection } from './analysis-section';
import { ACTOR_REGISTRY } from '@/lib/actor-registry';
import type { AnalysisResult, Platform, ScrapeResult } from '@/lib/types';

interface PlatformTabProps {
  platform: string;
  scrapeResults: ScrapeResult[];
  analysis?: AnalysisResult;
}

export function PlatformTab({ platform, scrapeResults, analysis }: PlatformTabProps) {
  const entry = ACTOR_REGISTRY[platform as Platform];
  const headers = entry?.extractFields || [];
  const allItems = scrapeResults.flatMap((r) => r.raw_data);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{allItems.length} results collected</span>
      </div>

      {analysis && (
        <AnalysisSection
          title={`${entry?.displayName || platform} Analysis`}
          content={analysis.analysis_content}
          defaultOpen
        />
      )}

      <div className="rounded-lg border">
        <div className="border-b p-3">
          <h4 className="text-sm font-medium">Raw Data</h4>
        </div>
        <DataTable headers={headers} rows={allItems} />
      </div>
    </div>
  );
}
