'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OpportunityCard } from './opportunity-card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {
  CultureWireSearch,
  CultureWireResult,
  CultureWireAnalysis,
  ScoredOpportunity,
  CulturalTension,
} from '@/lib/types';

interface ResultsViewProps {
  search: CultureWireSearch;
  results: CultureWireResult[];
  analyses: CultureWireAnalysis[];
}

export function ResultsView({ search, results, analyses }: ResultsViewProps) {
  const opportunities = useMemo(() => {
    const analysis = analyses.find((a) => a.analysis_type === 'opportunities');
    if (!analysis) return [];
    const content = analysis.content as { opportunities?: ScoredOpportunity[] };
    return content.opportunities || [];
  }, [analyses]);

  const tensions = useMemo(() => {
    const analysis = analyses.find((a) => a.analysis_type === 'tensions');
    if (!analysis) return [];
    const content = analysis.content as { tensions?: CulturalTension[] };
    return content.tensions || [];
  }, [analyses]);

  const strategicBrief = useMemo(() => {
    const analysis = analyses.find((a) => a.analysis_type === 'strategic_brief');
    if (!analysis) return null;
    const content = analysis.content as { brief?: string };
    return content.brief || null;
  }, [analyses]);

  const totalItems = results.reduce((sum, r) => sum + r.item_count, 0);
  const goldCount = opportunities.filter((o) => o.tier === 'GOLD').length;
  const silverCount = opportunities.filter((o) => o.tier === 'SILVER').length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Items Collected" value={totalItems} />
        <StatCard label="Platforms" value={search.platforms.length} />
        <StatCard label="Opportunities" value={opportunities.length} />
        <StatCard label="GOLD" value={goldCount} className="text-yellow-600" />
        <StatCard label="Tensions" value={tensions.length} />
      </div>

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="tensions">
            Tensions ({tensions.length})
          </TabsTrigger>
          <TabsTrigger value="brief">Strategic Brief</TabsTrigger>
          <TabsTrigger value="data">Collection Data</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4 space-y-3">
          {opportunities.length === 0 ? (
            <p className="text-muted-foreground">No opportunities identified yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {opportunities
                .sort((a, b) => b.score - a.score)
                .map((opp, i) => (
                  <OpportunityCard key={i} opportunity={opp} rank={i + 1} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tensions" className="mt-4 space-y-3">
          {tensions.length === 0 ? (
            <p className="text-muted-foreground">No tensions identified yet.</p>
          ) : (
            tensions
              .sort((a, b) => b.severity - a.severity)
              .map((tension, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tension.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          tension.severity >= 7
                            ? 'bg-red-500/10 text-red-500'
                            : tension.severity >= 4
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-blue-500/10 text-blue-500'
                        }
                      >
                        Severity: {tension.severity}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{tension.description}</p>
                    <div className="flex gap-1">
                      {tension.platforms.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium">Brand Implication</p>
                      <p className="text-sm text-muted-foreground">{tension.brand_implication}</p>
                    </div>
                    {tension.evidence.length > 0 && (
                      <ul className="space-y-0.5">
                        {tension.evidence.map((e, j) => (
                          <li key={j} className="text-xs text-muted-foreground">&bull; {e}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="brief" className="mt-4">
          {strategicBrief ? (
            <Card>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none pt-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{strategicBrief}</ReactMarkdown>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">Strategic brief not yet generated.</p>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-muted-foreground">No data collected yet.</p>
          ) : (
            results.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm capitalize">
                      {r.source_platform} — {r.layer}
                    </CardTitle>
                    <Badge variant="secondary">{r.item_count} items</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Collected {new Date(r.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className={`text-2xl font-bold ${className || ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
