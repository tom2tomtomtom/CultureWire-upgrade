'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchForm } from '@/components/culture-wire/search-form';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2 } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

function statusColor(status: string) {
  switch (status) {
    case 'collecting': return 'border-blue-500 text-blue-400 bg-blue-500/10';
    case 'analyzing': return 'border-amber-500 text-amber-400 bg-amber-500/10';
    case 'complete': return 'border-green-500 text-green-400 bg-green-500/10';
    case 'failed': return 'border-[#8B3F4F] text-[#8B3F4F] bg-[#8B3F4F]/10';
    default: return 'border-gray-200 text-gray-500';
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
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#8B3F4F]">//</span> Culture Wire
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Instant brand intelligence. Enter a brand name to discover cultural opportunities, tensions, and strategic insights.
        </p>
      </div>

      <SearchForm onSearchCreated={handleSearchCreated} />

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Previous Searches</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : searches.length === 0 ? (
          <p className="text-sm text-gray-500">No searches yet. Start your first brand intelligence search above.</p>
        ) : (
          <div className="grid gap-2">
            {searches.map((search) => (
              <div
                key={search.id}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-[#8B3F4F]/50 hover:shadow-md hover:bg-gray-50"
                onClick={() => router.push(`/culture-wire/${search.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wide">{search.brand_name}</span>
                  <Badge variant="outline" className={statusColor(search.status)}>
                    {search.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(search.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono">{search.geo}</span>
                  <span>{search.platforms.join(' / ')}</span>
                  {search.result_summary && (
                    <span className="text-[#A85566]">{search.result_summary.total_items} items</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
