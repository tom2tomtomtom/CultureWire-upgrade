'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchForm } from '@/components/culture-wire/search-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Loader2 } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

function statusColor(status: string) {
  switch (status) {
    case 'collecting': return 'bg-blue-500/10 text-blue-500';
    case 'analyzing': return 'bg-amber-500/10 text-amber-500';
    case 'complete': return 'bg-green-500/10 text-green-500';
    case 'failed': return 'bg-red-500/10 text-red-500';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function CultureWirePage() {
  const [searches, setSearches] = useState<CultureWireSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/culture-wire')
      .then((r) => r.json())
      .then((data) => setSearches(data.searches || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSearchCreated(search: CultureWireSearch) {
    router.push(`/culture-wire/${search.id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Zap className="h-6 w-6" />
          Culture Wire
        </h1>
        <p className="mt-1 text-muted-foreground">
          Instant brand intelligence. Enter a brand name to discover cultural opportunities, tensions, and strategic insights.
        </p>
      </div>

      <SearchForm onSearchCreated={handleSearchCreated} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Previous Searches</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : searches.length === 0 ? (
          <p className="text-muted-foreground">No searches yet. Start your first brand intelligence search above.</p>
        ) : (
          <div className="grid gap-3">
            {searches.map((search) => (
              <Card
                key={search.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/culture-wire/${search.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{search.brand_name}</CardTitle>
                    <Badge variant="secondary" className={statusColor(search.status)}>
                      {search.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(search.created_at).toLocaleDateString()}
                    </span>
                    <span>{search.geo}</span>
                    <span>{search.platforms.join(', ')}</span>
                    {search.result_summary && (
                      <span>{search.result_summary.total_items} items</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
