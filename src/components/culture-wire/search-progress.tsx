'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { CultureWireSearch, CultureWireResult } from '@/lib/types';

interface SearchProgressProps {
  search: CultureWireSearch;
  results: CultureWireResult[];
}

export function SearchProgress({ search, results }: SearchProgressProps) {
  const isCollecting = search.status === 'collecting';
  const isAnalyzing = search.status === 'analyzing';

  const byPlatform = useMemo(() => {
    const map = new Map<string, CultureWireResult[]>();
    for (const r of results) {
      const existing = map.get(r.source_platform) || [];
      existing.push(r);
      map.set(r.source_platform, existing);
    }
    return map;
  }, [results]);

  const totalExpected = search.platforms.length * 3;
  const totalCollected = results.length;
  const collectionProgress = Math.round((totalCollected / totalExpected) * 100);

  return (
    <div className="border border-gray-200 bg-white rounded-xl shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8B3F4F]" />
          {isCollecting ? 'Collecting Data' : 'Analyzing Results'}
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {isCollecting && (
          <>
            <div className="h-1 w-full bg-gray-200 rounded-full">
              <div
                className="h-1 bg-[#8B3F4F] transition-all duration-500 rounded-full"
                style={{ width: `${collectionProgress}%` }}
              />
            </div>
            <p className="text-sm font-mono text-gray-500">
              {totalCollected} of ~{totalExpected} collection tasks complete
              {search.result_summary && 'last_update' in search.result_summary && (
                <span className="ml-2 text-gray-400">
                  (updated {new Date(String(search.result_summary.last_update)).toLocaleTimeString()})
                </span>
              )}
            </p>
          </>
        )}

        {isAnalyzing && (
          <>
            <div className="h-1 w-full bg-gray-200 rounded-full">
              <div className="h-1 w-3/4 bg-[#A85566] transition-all duration-500 rounded-full" />
            </div>
            <p className="text-sm font-mono text-gray-500">
              {(() => {
                const phase = (search.result_summary as Record<string, unknown> | null)?.phase as string | undefined;
                switch (phase) {
                  case 'context_complete': return 'Brand context generated. Collecting data...';
                  case 'analyzing_opportunities': return 'Analyzing opportunities and tensions...';
                  case 'generating_brief': return 'Generating strategic brief...';
                  default: return `Running AI analysis on ${results.reduce((sum, r) => sum + r.item_count, 0)} collected items...`;
                }
              })()}
            </p>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {search.platforms.map((platform) => {
            const platformResults = byPlatform.get(platform) || [];
            const items = platformResults.reduce((sum, r) => sum + r.item_count, 0);
            const layers = platformResults.map((r) => r.layer);

            return (
              <div key={platform} className="border border-gray-200 p-3 rounded-lg">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-900">{platform}</p>
                <p className="text-xs font-mono text-gray-500">
                  {items} items
                </p>
                <div className="mt-1 flex gap-1">
                  {(['brand', 'category', 'trending'] as const).map((layer) => (
                    <span
                      key={layer}
                      className={`px-1.5 py-0.5 text-[10px] font-mono uppercase rounded ${
                        layers.includes(layer)
                          ? 'border border-[#A85566]/50 bg-[#A85566]/10 text-[#A85566]'
                          : 'border border-gray-200 text-gray-400'
                      }`}
                    >
                      {layer}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {(() => {
          const warnings = (search.result_summary as Record<string, unknown> | null)?.warnings as string[] | undefined;
          if (!warnings || warnings.length === 0) return null;
          return (
            <div className="border border-amber-500/30 bg-amber-500/5 p-3 space-y-1 rounded-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Warnings</p>
              {warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs font-mono text-amber-400/80">{w}</p>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
