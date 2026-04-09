'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export function UrlInput({ onSubmit, loading }: UrlInputProps) {
  const [url, setUrl] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a TikTok URL (e.g. https://www.tiktok.com/@creator/video/123)"
        className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#8B3F4F] focus:outline-none focus:ring-1 focus:ring-[#8B3F4F]"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!url.trim() || loading}
        className="flex items-center gap-2 rounded-lg bg-[#8B3F4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6B2937] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Analyze
      </button>
    </form>
  );
}
