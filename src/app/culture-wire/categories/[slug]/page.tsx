'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/culture-wire/categories';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

const PLATFORMS = ['reddit', 'tiktok', 'youtube', 'instagram'] as const;

export default function CategoryResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const category = getCategoryBySlug(slug);

  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastSearches, setPastSearches] = useState<CultureWireSearch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch('/api/culture-wire')
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.searches || []).filter(
          (s: CultureWireSearch) => s.search_type === 'category' && s.category_slug === slug
        );
        setPastSearches(filtered);
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [slug]);

  if (!category) {
    return (
      <div className="space-y-4">
        <p className="text-[#888899]">Category not found.</p>
        <button
          onClick={() => router.push('/culture-wire/categories')}
          className="flex items-center gap-2 border border-[#2a2a38] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#888899] hover:border-[#FF0000] hover:text-[#FF0000]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to categories
        </button>
      </div>
    );
  }

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  async function handleSearch() {
    if (platforms.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/culture-wire/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorySlug: slug, platforms }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start search');
        return;
      }

      router.push(`/culture-wire/${data.search.id}`);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/culture-wire/categories')}
          className="mb-2 flex items-center gap-1 text-xs text-[#888899] hover:text-[#FF0000] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Categories
        </button>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#FF0000]">//</span> {category.name}
        </h1>
        <p className="mt-1 text-sm font-mono text-[#888899]">
          {category.group} &middot; {category.geo_scope.toUpperCase()} &middot; {category.keywords.length} search terms
        </p>
      </div>

      <div className="border border-[#2a2a38] bg-[#111118]">
        <div className="border-b border-[#2a2a38] px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#888899]">Search Terms</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {category.keywords.map((kw) => (
              <span key={kw} className="border border-[#2a2a38] bg-[#0a0a0f] px-2 py-0.5 text-xs font-mono text-[#888899]">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[#2a2a38] bg-[#111118]">
        <div className="border-b border-[#2a2a38] px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#888899]">Run Category Search</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#888899]">Platforms</p>
            <div className="flex gap-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => !loading && togglePlatform(p)}
                  className={`border px-2.5 py-1 text-xs uppercase transition-colors ${
                    platforms.includes(p)
                      ? 'border-[#FF4400]/50 bg-[#FF4400]/10 text-[#FF4400]'
                      : 'border-[#2a2a38] text-[#555566] hover:text-[#888899]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[#FF0000]">{error}</p>}

          <button
            onClick={handleSearch}
            disabled={loading || platforms.length === 0}
            className="border-2 border-[#FF0000] bg-[#FF0000] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#FF0000]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting...
              </span>
            ) : (
              `Search ${category.name}`
            )}
          </button>
        </div>
      </div>

      {!loadingHistory && pastSearches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#888899]">Previous Searches</h2>
          <div className="grid gap-2">
            {pastSearches.map((search) => (
              <div
                key={search.id}
                className="cursor-pointer border border-[#2a2a38] bg-[#111118] p-4 transition-colors hover:border-[#FF0000]/50"
                onClick={() => router.push(`/culture-wire/${search.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-bold uppercase tracking-wide">{search.brand_name}</p>
                    <p className="mt-1 text-xs font-mono text-[#888899]">
                      {new Date(search.created_at).toLocaleDateString()} &middot; {search.platforms.join(' / ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-[#2a2a38] text-[#888899]">{search.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
