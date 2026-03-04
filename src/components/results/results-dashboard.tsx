'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Globe, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StrategicSummary } from './strategic-summary';
import { AnalysisSection } from './analysis-section';
import { PlatformTab } from './platform-tab';
import { toast } from 'sonner';
import { ACTOR_REGISTRY } from '@/lib/actor-registry';
import type { AnalysisResult, Platform, ScrapeResult } from '@/lib/types';

interface ResultsDashboardProps {
  projectId: string;
  sheetsUrl?: string | null;
}

function platformDisplayName(key: string): string {
  const entry = ACTOR_REGISTRY[key as Platform];
  return entry?.displayName || key;
}

export function ResultsDashboard({ projectId }: ResultsDashboardProps) {
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isExporting, setIsExporting] = useState<string | null>(null);

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

  const handleExport = async (format: 'csv' | 'report' | 'dashboard') => {
    setIsExporting(format);
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${format}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const ext = format === 'csv' ? 'csv' : format === 'dashboard' ? 'html' : 'md';
      const filename = match?.[1] || `export.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${format === 'csv' ? 'CSV' : 'Report'} downloaded`);
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {platforms.map((p) => (
            <TabsTrigger key={p} value={p}>
              {platformDisplayName(p)}
            </TabsTrigger>
          ))}
          <TabsTrigger value="cross-source">Cross-Source</TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
          >
            {isExporting === 'csv' ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Download className="mr-2 h-3 w-3" />
            )}
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('report')}
            disabled={isExporting !== null}
          >
            {isExporting === 'report' ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <FileText className="mr-2 h-3 w-3" />
            )}
            Report
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleExport('dashboard')}
            disabled={isExporting !== null}
          >
            {isExporting === 'dashboard' ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Globe className="mr-2 h-3 w-3" />
            )}
            Dashboard
          </Button>
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
            variant="cards"
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
