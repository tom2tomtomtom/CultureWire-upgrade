'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  // Group results by platform and layer
  const byPlatform = new Map<string, CultureWireResult[]>();
  for (const r of results) {
    const existing = byPlatform.get(r.source_platform) || [];
    existing.push(r);
    byPlatform.set(r.source_platform, existing);
  }

  const totalExpected = search.platforms.length * 3; // 3 layers per platform
  const totalCollected = results.length;
  const collectionProgress = Math.round((totalCollected / totalExpected) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isCollecting ? 'Collecting Data' : 'Analyzing Results'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCollecting && (
          <>
            <Progress value={collectionProgress} />
            <p className="text-sm text-muted-foreground">
              {totalCollected} of ~{totalExpected} collection tasks complete
            </p>
          </>
        )}

        {isAnalyzing && (
          <>
            <Progress value={75} />
            <p className="text-sm text-muted-foreground">
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
              <div key={platform} className="rounded-lg border p-3">
                <p className="text-sm font-medium capitalize">{platform}</p>
                <p className="text-xs text-muted-foreground">
                  {items} items
                </p>
                <div className="mt-1 flex gap-1">
                  {(['brand', 'category', 'trending'] as const).map((layer) => (
                    <Badge
                      key={layer}
                      variant={layers.includes(layer) ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {layer}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
