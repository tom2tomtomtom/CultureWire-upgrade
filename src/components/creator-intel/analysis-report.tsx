'use client';

import { ExternalLink, Hash, Globe } from 'lucide-react';
import type { PostAnalysisResult, TopicAnalysisResult, CreatorIntelAnalysis } from '@/lib/creator-intel/types';
import { PostMetrics } from './post-metrics';
import { CreatorOverview } from './creator-overview';
import { CreatorCard } from './creator-card';
import { ThemeTags } from './theme-tags';
import { SimilarResults } from './similar-results';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const REGION_FLAGS: Record<string, string> = {
  AU: '\u{1F1E6}\u{1F1FA}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  NZ: '\u{1F1F3}\u{1F1FF}',
  CA: '\u{1F1E8}\u{1F1E6}',
};

interface AnalysisReportProps {
  analysis: CreatorIntelAnalysis;
  onAnalyzeCreator: (username: string) => void;
}

export function AnalysisReport({ analysis, onAnalyzeCreator }: AnalysisReportProps) {
  const results = analysis.results;
  if (!results) return null;

  if (results.kind === 'post') {
    return <PostReport analysis={analysis} results={results} onAnalyzeCreator={onAnalyzeCreator} />;
  }

  return <TopicReport analysis={analysis} results={results} onAnalyzeCreator={onAnalyzeCreator} />;
}

function PostReport({
  analysis,
  results,
  onAnalyzeCreator,
}: {
  analysis: CreatorIntelAnalysis;
  results: PostAnalysisResult;
  onAnalyzeCreator: (username: string) => void;
}) {
  const { post, creator } = results;

  return (
    <div className="space-y-6">
      {/* Post Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Post Summary</h2>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-[#8B3F4F] hover:underline"
          >
            Open in TikTok <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="mb-3 text-sm text-gray-700">{post.description}</p>
        <div className="flex items-center gap-3">
          {post.region && post.region !== 'unknown' && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              {REGION_FLAGS[post.region] || ''} {post.region}
            </span>
          )}
          {post.hashtags.length > 0 && <ThemeTags themes={post.hashtags} max={8} />}
        </div>
      </div>

      {/* Post Metrics */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Post Metrics</h2>
        <PostMetrics stats={post.stats} />
      </div>

      {/* Creator Overview */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Creator Overview</h2>
        <CreatorOverview creator={creator} />
      </div>

      {/* Find Similar */}
      <SimilarResults analysisId={analysis.id} onAnalyzeCreator={onAnalyzeCreator} />
    </div>
  );
}

function TopicReport({
  analysis,
  results,
  onAnalyzeCreator,
}: {
  analysis: CreatorIntelAnalysis;
  results: TopicAnalysisResult;
  onAnalyzeCreator: (username: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Topic Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Topic: {results.topic}</h2>
        <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
          <span>{results.total_posts} posts found</span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {results.region}
          </span>
          <span>{results.hashtags_searched.length} hashtags searched</span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="h-4 w-4 text-gray-400" />
          <ThemeTags themes={results.hashtags_searched} max={10} />
        </div>
      </div>

      {/* Top Creators */}
      {results.top_creators.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Top Creators</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.top_creators.map((creator) => (
              <CreatorCard
                key={creator.username}
                creator={creator}
                onAnalyze={onAnalyzeCreator}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending Posts */}
      {results.trending_posts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Trending Posts</h2>
          <div className="space-y-2">
            {results.trending_posts.slice(0, 10).map((post) => (
              <a
                key={post.aweme_id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-[#8B3F4F]/50 hover:shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>@{post.username}</span>
                  {post.region !== 'unknown' && (
                    <span>{REGION_FLAGS[post.region] || post.region}</span>
                  )}
                </div>
                <p className="mb-2 text-sm text-gray-700 line-clamp-2">{post.description}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{formatNumber(post.stats.views)} views</span>
                  <span>{formatNumber(post.stats.likes)} likes</span>
                  <span>{formatNumber(post.stats.shares)} shares</span>
                  <span>{post.stats.engagement_rate}% eng</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Theme Breakdown */}
      {results.theme_breakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Theme Breakdown</h2>
          <div className="space-y-2">
            {results.theme_breakdown.slice(0, 10).map((theme) => (
              <div key={theme.theme} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-900">#{theme.theme}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{theme.post_count} posts</span>
                  <span>{theme.avg_engagement_rate}% avg eng</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Find Similar */}
      <SimilarResults analysisId={analysis.id} onAnalyzeCreator={onAnalyzeCreator} />
    </div>
  );
}
