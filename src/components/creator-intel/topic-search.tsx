'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

const REGIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'CA', label: 'Canada' },
];

interface TopicSearchProps {
  onSubmit: (topic: string, region: string) => void;
  loading: boolean;
}

export function TopicSearch({ onSubmit, loading }: TopicSearchProps) {
  const [topic, setTopic] = useState('');
  const [region, setRegion] = useState('AU');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    onSubmit(topic.trim(), region);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Search a topic (e.g. color grading, sustainable fashion)"
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      />
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      >
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!topic.trim() || loading}
        className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Search
      </button>
    </form>
  );
}
