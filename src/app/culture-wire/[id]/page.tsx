'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SearchProgress } from '@/components/culture-wire/search-progress';
import { ResultsView } from '@/components/culture-wire/results-view';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap } from 'lucide-react';
import type { CultureWireSearch, CultureWireResult, CultureWireAnalysis } from '@/lib/types';

export default function CultureWireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState<CultureWireSearch | null>(null);
  const [results, setResults] = useState<CultureWireResult[]>([]);
  const [analyses, setAnalyses] = useState<CultureWireAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while in-progress
  useEffect(() => {
    if (!search || search.status === 'complete' || search.status === 'failed') return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [search, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!search) {
    return <p className="py-10 text-center text-muted-foreground">Search not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="h-6 w-6" />
            {search.brand_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {search.geo} &middot; {search.platforms.join(', ')} &middot;{' '}
            {new Date(search.created_at).toLocaleString()}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={
            search.status === 'complete'
              ? 'bg-green-500/10 text-green-500'
              : search.status === 'failed'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-blue-500/10 text-blue-500'
          }
        >
          {search.status}
        </Badge>
      </div>

      {search.brand_context && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="font-medium">Category</p>
                <p className="text-muted-foreground">{search.brand_context.category}</p>
              </div>
              <div>
                <p className="font-medium">Tone</p>
                <p className="text-muted-foreground">{search.brand_context.tone}</p>
              </div>
              <div>
                <p className="font-medium">Values</p>
                <p className="text-muted-foreground">{search.brand_context.brand_values.join(', ')}</p>
              </div>
              <div>
                <p className="font-medium">Competitors</p>
                <p className="text-muted-foreground">{search.brand_context.competitors.join(', ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(search.status === 'collecting' || search.status === 'analyzing') && (
        <SearchProgress search={search} results={results} />
      )}

      {(search.status === 'complete' || analyses.length > 0) && (
        <ResultsView search={search} results={results} analyses={analyses} />
      )}

      {search.status === 'failed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Search failed. Please try again.</p>
            {search.result_summary && 'error' in search.result_summary && (
              <p className="mt-2 text-sm text-muted-foreground">
                {String(search.result_summary.error)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
