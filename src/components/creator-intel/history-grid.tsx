'use client';

import { Clock, Search, Link as LinkIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import type { CreatorIntelAnalysis } from '@/lib/creator-intel/types';

function statusColor(status: string) {
  switch (status) {
    case 'analyzing': return 'border-blue-500 text-blue-600 bg-blue-50';
    case 'complete': return 'border-green-500 text-green-600 bg-green-50';
    case 'failed': return 'border-red-500 text-red-600 bg-red-50';
    default: return 'border-gray-300 text-gray-500 bg-gray-50';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'post': return LinkIcon;
    case 'topic': return Search;
    default: return MessageSquare;
  }
}

interface HistoryGridProps {
  analyses: Pick<CreatorIntelAnalysis, 'id' | 'type' | 'input' | 'status' | 'created_at'>[];
}

export function HistoryGrid({ analyses }: HistoryGridProps) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No analyses yet. Paste a URL or search a topic to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {analyses.map((a) => {
        const Icon = typeIcon(a.type);
        const date = new Date(a.created_at);

        return (
          <Link
            key={a.id}
            href={`/creator-intel/${a.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-[#8B3F4F]/50 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium uppercase text-gray-500">{a.type}</span>
              <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor(a.status)}`}>
                {a.status}
              </span>
            </div>
            <p className="mb-2 truncate text-sm font-medium text-gray-900">{a.input}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
