'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StrategicSummary } from './strategic-summary';
import { AnalysisSection } from './analysis-section';
import { PlatformTab } from './platform-tab';
import { toast } from 'sonner';
import type { AnalysisResult, ScrapeResult } from '@/lib/types';

interface ResultsDashboardProps {
  projectId: string;
  sheetsUrl?: string | null;
}

export function ResultsDashboard({ projectId, sheetsUrl }: ResultsDashboardProps) {
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [sheetLink, setSheetLink] = useState(sheetsUrl);

  useEffect(() => {
    async function loadData() {
      try {
        const [resultsRes, analysesRes] = await Promise.all([
          fetch(`/api/results?projectId=${projectId}`),
          fetch(`/api/analyses?projectId=${projectId}`),
        ]);
        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setResults(data.results || []);
        }
        if (analysesRes.ok) {
          const data = await analysesRes.json();
          setAnalyses(data.analyses || []);
        }
      } catch {
        // Show empty state on error
      }
    }
    loadData();
  }, [projectId]);

  const platforms = [...new Set(results.map((r) => r.source_platform))];
  const strategicNarrative = analyses.find((a) => a.pass_type === 'strategic_narrative');
  const crossSource = analyses.find((a) => a.pass_type === 'cross_source');
  const perSourceAnalyses = analyses.filter((a) => a.pass_type === 'per_source');

  const handleExportSheets = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      setSheetLink(data.url);
      toast.success('Exported to Google Sheets');
    } catch {
      toast.error('Failed to export to Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {platforms.map((p) => (
            <TabsTrigger key={p} value={p}>
              {p}
            </TabsTrigger>
          ))}
          <TabsTrigger value="cross-source">Cross-Source</TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          {sheetLink ? (
            <Button variant="outline" size="sm" asChild>
              <a href={sheetLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3 w-3" />
                Google Sheet
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSheets}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-3 w-3" />
              )}
              Export to Sheets
            </Button>
          )}
        </div>
      </div>

      <TabsContent value="overview">
        {strategicNarrative ? (
          <StrategicSummary content={strategicNarrative.analysis_content} />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No analysis available yet. Run synthesis after data collection.
          </p>
        )}
      </TabsContent>

      {platforms.map((platform) => (
        <TabsContent key={platform} value={platform}>
          <PlatformTab
            platform={platform}
            scrapeResults={results.filter((r) => r.source_platform === platform)}
            analysis={perSourceAnalyses.find((a) => a.source_platform === platform)}
          />
        </TabsContent>
      ))}

      <TabsContent value="cross-source">
        {crossSource ? (
          <AnalysisSection
            title="Cross-Source Analysis"
            content={crossSource.analysis_content}
            defaultOpen
          />
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            Cross-source analysis not available yet.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
