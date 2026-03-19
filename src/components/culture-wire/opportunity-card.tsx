'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SamplePostCard, type SamplePost } from '@/components/sample-post-card';
import type { ScoredOpportunity } from '@/lib/types';

const tierStyles = {
  GOLD: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  SILVER: 'border-zinc-400 text-zinc-400 bg-zinc-400/10',
  BRONZE: 'border-orange-500 text-orange-400 bg-orange-500/10',
};

const rtpStyles = {
  GREEN: 'border-green-500 text-green-400 bg-green-500/10',
  YELLOW: 'border-amber-500 text-amber-400 bg-amber-500/10',
  RED: 'border-[#8B3F4F] text-[#8B3F4F] bg-[#8B3F4F]/10',
};

interface OpportunityCardProps {
  opportunity: ScoredOpportunity;
  rank: number;
  samplePosts?: SamplePost[];
}

export function OpportunityCard({ opportunity, rank, samplePosts }: OpportunityCardProps) {
  const { title, description, tier, score, components, right_to_play, evidence, platform, layer } = opportunity;
  const [showPosts, setShowPosts] = useState(false);

  return (
    <div className="border border-gray-200 bg-white overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center bg-gray-100 text-xs font-bold font-mono text-gray-900 rounded">
              {rank}
            </span>
            <h3 className="font-bold text-sm uppercase tracking-wide text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={tierStyles[tier]}>{tier}</Badge>
            <Badge variant="outline" className={rtpStyles[right_to_play]}>{right_to_play}</Badge>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-500">{description}</p>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-mono text-lg font-bold text-gray-900">{score}</span>
          <span className="border border-gray-200 px-2 py-0.5 text-[10px] font-mono uppercase rounded">{platform}</span>
          <span className="border border-gray-200 px-2 py-0.5 text-[10px] font-mono uppercase rounded">{layer}</span>
        </div>

        <div className="space-y-1.5">
          {Object.entries(components).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-28 text-xs uppercase tracking-wide text-gray-500">
                {key.replace('_', ' ')}
              </span>
              <div className="h-1 flex-1 bg-gray-200 rounded-full">
                <div className="h-1 bg-[#A85566] rounded-full" style={{ width: `${value}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-mono text-gray-500">{value}</span>
            </div>
          ))}
        </div>

        {evidence.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Evidence</p>
            <ul className="space-y-0.5">
              {evidence.map((e, i) => (
                <li key={i} className="text-xs text-gray-400">
                  &bull; {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {samplePosts && samplePosts.length > 0 && (
          <div>
            <button
              onClick={() => setShowPosts(!showPosts)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#A85566] hover:text-[#8B3F4F] transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${showPosts ? 'rotate-180' : ''}`} />
              Sample Posts ({samplePosts.length})
            </button>
            {showPosts && (
              <div className="mt-2 space-y-2">
                {samplePosts.map((post, i) => (
                  <SamplePostCard key={i} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
