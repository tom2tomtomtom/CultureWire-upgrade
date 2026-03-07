'use client';

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

  const byPlatform = new Map<string, CultureWireResult[]>();
  for (const r of results) {
    const existing = byPlatform.get(r.source_platform) || [];
    existing.push(r);
    byPlatform.set(r.source_platform, existing);
  }

  const totalExpected = search.platforms.length * 3;
  const totalCollected = results.length;
  const collectionProgress = Math.round((totalCollected / totalExpected) * 100);

  return (
    <div className="border border-[#2a2a38] bg-[#111118]">
      <div className="border-b border-[#2a2a38] px-4 py-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#888899]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF0000]" />
          {isCollecting ? 'Collecting Data' : 'Analyzing Results'}
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {isCollecting && (
          <>
            <div className="h-1 w-full bg-[#2a2a38]">
              <div
                className="h-1 bg-[#FF0000] transition-all duration-500"
                style={{ width: `${collectionProgress}%` }}
              />
            </div>
            <p className="text-sm font-mono text-[#888899]">
              {totalCollected} of ~{totalExpected} collection tasks complete
              {search.result_summary && 'last_update' in search.result_summary && (
                <span className="ml-2 text-[#555566]">
                  (updated {new Date(String(search.result_summary.last_update)).toLocaleTimeString()})
                </span>
              )}
            </p>
          </>
        )}

        {isAnalyzing && (
          <>
            <div className="h-1 w-full bg-[#2a2a38]">
              <div className="h-1 w-3/4 bg-[#FF4400] transition-all duration-500" />
            </div>
            <p className="text-sm font-mono text-[#888899]">
              Running AI analysis on {results.reduce((sum, r) => sum + r.item_count, 0)} collected items...
            </p>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {search.platforms.map((platform) => {
            const platformResults = byPlatform.get(platform) || [];
            const items = platformResults.reduce((sum, r) => sum + r.item_count, 0);
            const layers = platformResults.map((r) => r.layer);

            return (
              <div key={platform} className="border border-[#2a2a38] p-3">
                <p className="text-sm font-bold uppercase tracking-wide">{platform}</p>
                <p className="text-xs font-mono text-[#888899]">
                  {items} items
                </p>
                <div className="mt-1 flex gap-1">
                  {(['brand', 'category', 'trending'] as const).map((layer) => (
                    <span
                      key={layer}
                      className={`px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                        layers.includes(layer)
                          ? 'border border-[#FF4400]/50 bg-[#FF4400]/10 text-[#FF4400]'
                          : 'border border-[#2a2a38] text-[#555566]'
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
      </div>
    </div>
  );
}
