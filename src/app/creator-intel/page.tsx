'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { UrlInput } from '@/components/creator-intel/url-input';
import { TopicSearch } from '@/components/creator-intel/topic-search';
import { HistoryGrid } from '@/components/creator-intel/history-grid';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

type Tab = 'url' | 'topic';

export default function CreatorIntelPage() {
  const [tab, setTab] = useState<Tab>('url');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Pick<CreatorIntelAnalysis, 'id' | 'type' | 'input' | 'status' | 'created_at'>[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/creator-intel/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.analyses || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  // Handle ?analyze= query param for creator drill-down
  useEffect(() => {
    const analyzeUrl = searchParams.get('analyze');
    if (analyzeUrl && !loading) {
      handleAnalyze('url', analyzeUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnalyze(type: 'url' | 'topic', input: string, region: string = 'AU') {
    setLoading(true);
    try {
      const res = await fetch('/api/creator-intel/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, input, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Analysis failed');
        return;
      }
      router.push(`/creator-intel/${data.analysis.id}`);
    } catch (err) {
      toast.error('Failed to start analysis');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Creator Intel</h1>

      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab('url')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'url'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Analyze URL
        </button>
        <button
          onClick={() => setTab('topic')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'topic'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Search Topic
        </button>
      </div>

      {/* Input area */}
      <div className="mb-8">
        {tab === 'url' ? (
          <UrlInput onSubmit={(url) => handleAnalyze('url', url)} loading={loading} />
        ) : (
          <TopicSearch onSubmit={(topic, region) => handleAnalyze('topic', topic, region)} loading={loading} />
        )}
      </div>

      {/* History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Analyses</h2>
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <HistoryGrid analyses={history} />
        )}
      </div>
    </div>
  );
}
