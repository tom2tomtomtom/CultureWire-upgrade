'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AnalysisReport } from '@/components/creator-intel/analysis-report';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

export default function CreatorIntelReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CreatorIntelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/creator-intel/${id}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to load analysis');
          setLoading(false);
          return;
        }
        setAnalysis(data.analysis);

        // Poll if still analyzing
        if (data.analysis.status === 'analyzing' || data.analysis.status === 'pending') {
          if (!interval) {
            interval = setInterval(fetchAnalysis, 2000);
          }
        } else if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        toast.error('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  function handleAnalyzeCreator(username: string) {
    const url = `https://www.tiktok.com/@${username}`;
    router.push(`/creator-intel?analyze=${encodeURIComponent(url)}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B3F4F]" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <p className="text-gray-500">Analysis not found.</p>
        <Link href="/creator-intel" className="mt-4 inline-block text-sm text-[#8B3F4F] hover:underline">
          Back to Creator Intel
        </Link>
      </div>
    );
  }

  const isProcessing = analysis.status === 'pending' || analysis.status === 'analyzing';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/creator-intel" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {analysis.type === 'post' ? 'Post Analysis' : 'Topic Search'}
          </h1>
          <p className="text-sm text-gray-500">{analysis.input}</p>
        </div>
      </div>

      {isProcessing && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">
            Analyzing... This usually takes 10-30 seconds.
          </span>
        </div>
      )}

      {analysis.status === 'failed' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            Analysis failed. This can happen if the TikTok URL is not accessible or the API is temporarily unavailable.
          </p>
          <Link href="/creator-intel" className="mt-2 inline-block text-sm font-medium text-red-700 hover:underline">
            Try again
          </Link>
        </div>
      )}

      {analysis.status === 'complete' && analysis.results && (
        <AnalysisReport analysis={analysis} onAnalyzeCreator={handleAnalyzeCreator} />
      )}
    </div>
  );
}
