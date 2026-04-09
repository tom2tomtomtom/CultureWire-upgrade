'use client';

import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import type { CreatorSummary } from '@/lib/creator-intel/types';
import { CreatorCard } from './creator-card';

interface SimilarResultsProps {
  analysisId: string;
  onAnalyzeCreator: (username: string) => void;
}

export function SimilarResults({ analysisId, onAnalyzeCreator }: SimilarResultsProps) {
  const [results, setResults] = useState<CreatorSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');

  async function handleSearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator-intel/${analysisId}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depth }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.similar);
      }
    } catch (err) {
      console.error('Find similar failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="h-5 w-5" />
          Find Similar Creators
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as 'quick' | 'deep')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-[#8B3F4F] focus:outline-none"
            disabled={loading}
          >
            <option value="quick">Quick (5-10 credits)</option>
            <option value="deep">Deep (15-25 credits)</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Searching...' : 'Find Similar'}
          </button>
        </div>
      </div>

      {results && results.length === 0 && (
        <p className="text-sm text-gray-500">No similar creators found. Try the Deep search for broader results.</p>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((creator) => (
            <CreatorCard
              key={creator.username}
              creator={creator}
              onAnalyze={onAnalyzeCreator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
