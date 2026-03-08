'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { OpportunityCard } from './opportunity-card';
import { ExportMenu } from './export-menu';
import { SamplePostCard, extractSamplePosts, findMatchingPosts, type SamplePost } from '@/components/sample-post-card';
import { ChevronDown, Loader2, Microscope } from 'lucide-react';
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
          className="flex items-center gap-2 border border-[#2a2a38] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#888899] transition-colors hover:border-[#FF4400] hover:text-[#FF4400] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deepDiveLoading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Starting...</>
          ) : (
            <><Microscope className="h-3.5 w-3.5" />Deep Dive</>
          )}
        </button>
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
        <TabsList className="border border-[#2a2a38] bg-[#0a0a0f] p-0.5">
          <TabsTrigger value="opportunities" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#FF0000]/10 data-[state=active]:text-[#FF0000]">
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="tensions" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#FF0000]/10 data-[state=active]:text-[#FF0000]">
            Tensions ({tensions.length})
          </TabsTrigger>
          <TabsTrigger value="brief" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#FF0000]/10 data-[state=active]:text-[#FF0000]">
            Strategic Brief
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#FF0000]/10 data-[state=active]:text-[#FF0000]">
            Collection Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4 space-y-3">
          {opportunities.length === 0 ? (
            <p className="text-[#888899]">No opportunities identified yet.</p>
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
            <p className="text-[#888899]">No tensions identified yet.</p>
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
            <div className="border border-[#2a2a38] bg-[#111118] p-6 prose prose-sm prose-invert max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-white prose-p:text-[#888899] prose-strong:text-white prose-li:text-[#888899]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{strategicBrief}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-[#888899]">Strategic brief not yet generated.</p>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-[#888899]">No data collected yet.</p>
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
    <div className="border border-[#2a2a38] bg-[#111118] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-wide">{tension.name}</h3>
        <Badge
          variant="outline"
          className={
            tension.severity >= 7
              ? 'border-[#FF0000] text-[#FF0000] bg-[#FF0000]/10'
              : tension.severity >= 4
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-blue-500 text-blue-400 bg-blue-500/10'
          }
        >
          Severity: {tension.severity}/10
        </Badge>
      </div>
      <p className="text-sm text-[#888899]">{tension.description}</p>
      <div className="flex gap-1">
        {tension.platforms.map((p) => (
          <span key={p} className="border border-[#2a2a38] px-2 py-0.5 text-[10px] font-mono uppercase text-[#888899]">{p}</span>
        ))}
      </div>
      <div className="border border-[#2a2a38] bg-[#0a0a0f] p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Brand Implication</p>
        <p className="mt-1 text-sm text-[#e8e8e8]">{tension.brand_implication}</p>
      </div>
      {tension.evidence.length > 0 && (
        <ul className="space-y-0.5">
          {tension.evidence.map((e, j) => (
            <li key={j} className="text-xs text-[#888899]">&bull; {e}</li>
          ))}
        </ul>
      )}
      {samplePosts && samplePosts.length > 0 && (
        <div>
          <button
            onClick={() => setShowPosts(!showPosts)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#FF4400] hover:text-[#FF6633] transition-colors"
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
    <div className="border border-[#2a2a38] bg-[#111118]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#15151f] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wide">
            {result.source_platform} — {result.layer}
          </span>
          <span className="border border-[#FF4400]/50 bg-[#FF4400]/10 px-2 py-0.5 text-xs font-mono text-[#FF4400]">
            {result.item_count} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#888899]">
            {new Date(result.created_at).toLocaleString()}
          </p>
          <ChevronDown className={`h-4 w-4 text-[#555566] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && topPosts.length > 0 && (
        <div className="border-t border-[#2a2a38] p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Top Posts by Engagement</p>
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
    <div className="border border-[#2a2a38] bg-[#111118] p-4 text-center">
      <p className={`text-2xl font-bold font-mono ${accent ? 'text-[#FF4400]' : 'text-white'}`}>{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">{label}</p>
    </div>
  );
}
