'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SearchProgress } from '@/components/culture-wire/search-progress';
import { ResultsView } from '@/components/culture-wire/results-view';
import { Badge } from '@/components/ui/badge';
import { Loader2, XCircle } from 'lucide-react';
import type { CultureWireSearch, CultureWireResult, CultureWireAnalysis } from '@/lib/types';

function statusColor(status: string) {
  switch (status) {
    case 'collecting': return 'border-blue-500 text-blue-400 bg-blue-500/10';
    case 'analyzing': return 'border-amber-500 text-amber-400 bg-amber-500/10';
    case 'complete': return 'border-green-500 text-green-400 bg-green-500/10';
    case 'failed': return 'border-[#FF0000] text-[#FF0000] bg-[#FF0000]/10';
    default: return 'border-[#2a2a38] text-[#888899]';
  }
}

export default function CultureWireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState<CultureWireSearch | null>(null);
  const [results, setResults] = useState<CultureWireResult[]>([]);
  const [analyses, setAnalyses] = useState<CultureWireAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/culture-wire/${id}`);
      const data = await res.json();
      setSearch(data.search);
      setResults(data.results || []);
      setAnalyses(data.analyses || []);
    } catch (err) {
      console.error('Failed to fetch search:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/culture-wire/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) {
        console.error('Cancel failed:', await res.text());
      }
      await fetchData();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!search || search.status === 'complete' || search.status === 'failed') return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [search, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#888899]" />
      </div>
    );
  }

  if (!search) {
    return <p className="py-10 text-center text-[#888899]">Search not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            <span className="text-[#FF0000]">//</span> {search.brand_name}
          </h1>
          <p className="mt-1 text-sm font-mono text-[#888899]">
            {search.geo} &middot; {search.platforms.join(' / ')} &middot;{' '}
            {new Date(search.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(search.status === 'collecting' || search.status === 'analyzing') && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 border border-[#FF0000]/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#FF0000] transition-colors hover:bg-[#FF0000]/10 disabled:opacity-40"
            >
              {cancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              Stop
            </button>
          )}
          <Badge variant="outline" className={statusColor(search.status)}>
            {search.status}
          </Badge>
        </div>
      </div>

      {search.brand_context && (
        <div className="border border-[#2a2a38] bg-[#111118] p-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Category</p>
              <p className="mt-1 text-white">{search.brand_context.category}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Tone</p>
              <p className="mt-1 text-white">{search.brand_context.tone}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Values</p>
              <p className="mt-1 text-white">{search.brand_context.brand_values.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#888899]">Competitors</p>
              <p className="mt-1 text-white">{search.brand_context.competitors.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {(search.status === 'collecting' || search.status === 'analyzing') && (
        <SearchProgress search={search} results={results} />
      )}

      {/* Show results as soon as any data exists, not just when complete */}
      {(search.status === 'complete' || results.length > 0 || analyses.length > 0) && (
        <ResultsView search={search} results={results} analyses={analyses} />
      )}

      {search.status === 'failed' && (
        <div className="border border-[#FF0000]/30 bg-[#FF0000]/5 p-8 text-center">
          <p className="text-[#FF0000] font-bold uppercase tracking-widest">Search failed. Please try again.</p>
          {search.result_summary && 'error' in search.result_summary && (
            <p className="mt-2 text-sm text-[#888899]">
              {String(search.result_summary.error)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
