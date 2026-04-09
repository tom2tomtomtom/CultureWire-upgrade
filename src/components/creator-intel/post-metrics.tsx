import { Eye, Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import type { PostStats } from '@/lib/creator-intel/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface PostMetricsProps {
  stats: PostStats;
}

export function PostMetrics({ stats }: PostMetricsProps) {
  const metrics = [
    { icon: Eye, label: 'Views', value: formatNumber(stats.views) },
    { icon: Heart, label: 'Likes', value: formatNumber(stats.likes) },
    { icon: MessageCircle, label: 'Comments', value: formatNumber(stats.comments) },
    { icon: Share2, label: 'Shares', value: formatNumber(stats.shares) },
    { icon: TrendingUp, label: 'Engagement', value: `${stats.engagement_rate}%` },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <m.icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
          <div className="text-lg font-semibold text-gray-900">{m.value}</div>
          <div className="text-xs text-gray-500">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
