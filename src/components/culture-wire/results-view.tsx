'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { OpportunityCard } from './opportunity-card';
import { ExportMenu } from './export-menu';
import { SamplePostCard, extractSamplePosts, findMatchingPosts, type SamplePost } from '@/components/sample-post-card';
import { ChevronDown, Loader2, Microscope, Share2 } from 'lucide-react';
import { ShareDialog } from '@/components/share-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
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
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleDeepDive() {
    setDeepDiveLoading(true);
    try {
      const res = await fetch(`/api/culture-wire/${search.id}/supplementary`, { method: 'POST' });
      if (res.ok) {
        toast.success('Deep dive scan started. Results will appear shortly.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to start deep dive');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeepDiveLoading(false);
    }
  }

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

  // Build a map of platform -> all raw data items for matching
  const rawDataByPlatform = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};
    for (const r of results) {
      if (!map[r.source_platform]) map[r.source_platform] = [];
      map[r.source_platform].push(...r.raw_data);
    }
    return map;
  }, [results]);

  // Pre-compute sample posts for each opportunity
  const opportunitySamplePosts = useMemo(() => {
    const map = new Map<number, SamplePost[]>();
    opportunities.forEach((opp, idx) => {
      const platformData = rawDataByPlatform[opp.platform] || [];
      if (platformData.length === 0) return;
      const matched = findMatchingPosts(platformData, opp.platform, opp.evidence, 2);
      if (matched.length > 0) {
        map.set(idx, matched);
      } else {
        // Fall back to top posts from this platform
        const top = extractSamplePosts(platformData, opp.platform, 2);
        if (top.length > 0) map.set(idx, top);
      }
    });
    return map;
  }, [opportunities, rawDataByPlatform]);

  // Pre-compute sample posts for each tension
  const tensionSamplePosts = useMemo(() => {
    const map = new Map<number, SamplePost[]>();
    tensions.forEach((tension, idx) => {
      const allPosts: SamplePost[] = [];
      for (const platform of tension.platforms) {
        const platformData = rawDataByPlatform[platform] || [];
        if (platformData.length === 0) continue;
        const matched = findMatchingPosts(platformData, platform, tension.evidence, 2);
        allPosts.push(...matched);
      }
      if (allPosts.length > 0) {
        map.set(idx, allPosts.slice(0, 3));
      }
    });
    return map;
  }, [tensions, rawDataByPlatform]);

  const totalItems = results.reduce((sum, r) => sum + r.item_count, 0);
  const goldCount = opportunities.filter((o) => o.tier === 'GOLD').length;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <ExportMenu searchId={search.id} />
        <button
          onClick={handleDeepDive}
          disabled={deepDiveLoading || search.status !== 'complete'}
          className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
        >
          {deepDiveLoading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Starting...</>
          ) : (
            <><Microscope className="h-3.5 w-3.5" />Deep Dive</>
          )}
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-[#8B3F4F] hover:text-[#8B3F4F] rounded-lg"
        >
          <Share2 className="h-3.5 w-3.5" />Share
        </button>
        <ShareDialog
          reportType="culture_wire"
          reportId={search.id}
          reportTitle={search.brand_name}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Items Collected" value={totalItems} />
        <StatCard label="Platforms" value={search.platforms.length} />
        <StatCard label="Opportunities" value={opportunities.length} />
        <StatCard label="GOLD" value={goldCount} accent />
        <StatCard label="Tensions" value={tensions.length} />
      </div>

      <Tabs defaultValue="opportunities">
        <TabsList className="border border-gray-200 bg-white p-0.5 rounded-xl">
          <TabsTrigger value="opportunities" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#8B3F4F]/10 data-[state=active]:text-[#8B3F4F]">
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="tensions" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#8B3F4F]/10 data-[state=active]:text-[#8B3F4F]">
            Tensions ({tensions.length})
          </TabsTrigger>
          <TabsTrigger value="brief" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#8B3F4F]/10 data-[state=active]:text-[#8B3F4F]">
            Strategic Brief
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#8B3F4F]/10 data-[state=active]:text-[#8B3F4F]">
            Collection Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4 space-y-3">
          {opportunities.length === 0 ? (
            <p className="text-gray-500">No opportunities identified yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {opportunities
                .sort((a, b) => b.score - a.score)
                .map((opp, i) => (
                  <OpportunityCard
                    key={i}
                    opportunity={opp}
                    rank={i + 1}
                    samplePosts={opportunitySamplePosts.get(i)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tensions" className="mt-4 space-y-3">
          {tensions.length === 0 ? (
            <p className="text-gray-500">No tensions identified yet.</p>
          ) : (
            tensions
              .sort((a, b) => b.severity - a.severity)
              .map((tension, i) => (
                <TensionCard key={i} tension={tension} samplePosts={tensionSamplePosts.get(i)} />
              ))
          )}
        </TabsContent>

        <TabsContent value="brief" className="mt-4">
          {strategicBrief ? (
            <div className="space-y-6">
              <div className="border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="prose prose-sm max-w-none p-6 md:p-8
                  prose-h2:text-xs prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-[0.2em] prose-h2:text-[#8B3F4F] prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8 first:prose-h2:mt-0
                  prose-h3:text-sm prose-h3:font-semibold prose-h3:text-gray-900 prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-3
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-li:text-gray-600 prose-li:leading-relaxed
                  prose-ul:space-y-2 prose-ol:space-y-2
                  [&>h2:first-child]:mt-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{strategicBrief}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Strategic brief not yet generated.</p>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-gray-500">No data collected yet.</p>
          ) : (
            results.map((r) => (
              <CollectionDataCard key={r.id} result={r} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-components ---

function TensionCard({ tension, samplePosts }: { tension: CulturalTension; samplePosts?: SamplePost[] }) {
  const [showPosts, setShowPosts] = useState(false);

  return (
    <div className="border border-gray-200 bg-white p-4 space-y-3 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-wide text-gray-900">{tension.name}</h3>
        <Badge
          variant="outline"
          className={
            tension.severity >= 7
              ? 'border-[#8B3F4F] text-[#8B3F4F] bg-[#8B3F4F]/10'
              : tension.severity >= 4
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-blue-500 text-blue-400 bg-blue-500/10'
          }
        >
          Severity: {tension.severity}/10
        </Badge>
      </div>
      <p className="text-sm text-gray-500">{tension.description}</p>
      <div className="flex gap-1">
        {tension.platforms.map((p) => (
          <span key={p} className="border border-gray-200 px-2 py-0.5 text-[10px] font-mono uppercase text-gray-500 rounded">{p}</span>
        ))}
      </div>
      <div className="border border-gray-200 bg-gray-50 p-3 rounded-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Brand Implication</p>
        <p className="mt-1 text-sm text-gray-900">{tension.brand_implication}</p>
      </div>
      {tension.evidence.length > 0 && (
        <ul className="space-y-0.5">
          {tension.evidence.map((e, j) => (
            <li key={j} className="text-xs text-gray-500">&bull; {e}</li>
          ))}
        </ul>
      )}
      {samplePosts && samplePosts.length > 0 && (
        <div>
          <button
            onClick={() => setShowPosts(!showPosts)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#A85566] hover:text-[#8B3F4F] transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showPosts ? 'rotate-180' : ''}`} />
            Sample Posts ({samplePosts.length})
          </button>
          {showPosts && (
            <div className="mt-2 space-y-2">
              {samplePosts.map((post, i) => (
                <SamplePostCard key={i} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionDataCard({ result }: { result: CultureWireResult }) {
  const [expanded, setExpanded] = useState(false);

  const topPosts = useMemo(() => {
    if (!expanded || !result.raw_data?.length) return [];
    return extractSamplePosts(result.raw_data, result.source_platform, 5);
  }, [expanded, result]);

  return (
    <div className="border border-gray-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wide text-gray-900">
            {result.source_platform} — {result.layer}
          </span>
          <span className="border border-[#A85566]/50 bg-[#A85566]/10 px-2 py-0.5 text-xs font-mono text-[#A85566] rounded">
            {result.item_count} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            {new Date(result.created_at).toLocaleString()}
          </p>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && topPosts.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Top Posts by Engagement</p>
          {topPosts.map((post, i) => (
            <SamplePostCard key={i} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border border-gray-200 bg-white p-4 text-center rounded-xl shadow-sm">
      <p className={`text-2xl font-bold font-mono ${accent ? 'text-[#A85566]' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
    </div>
  );
}
