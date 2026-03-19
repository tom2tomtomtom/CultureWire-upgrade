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
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <p className="text-gray-500">Category not found.</p>
        <button
          onClick={() => router.push('/culture-wire/categories')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 hover:border-[#8B3F4F] hover:text-[#8B3F4F]"
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
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <button
          onClick={() => router.push('/culture-wire/categories')}
          className="mb-2 flex items-center gap-1 text-xs text-gray-500 hover:text-[#8B3F4F] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Categories
        </button>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#8B3F4F]">//</span> {category.name}
        </h1>
        <p className="mt-1 text-sm font-mono text-gray-500">
          {category.group} &middot; {category.geo_scope.toUpperCase()} &middot; {category.keywords.length} search terms
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Search Terms</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {category.keywords.map((kw) => (
              <span key={kw} className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-500">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Run Category Search</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Platforms</p>
            <div className="flex gap-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => !loading && togglePlatform(p)}
                  className={`border px-2.5 py-1 text-xs uppercase transition-colors ${
                    platforms.includes(p)
                      ? 'border-[#A85566]/50 bg-[#A85566]/10 text-[#A85566]'
                      : 'border-gray-200 text-gray-400 hover:text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[#8B3F4F]">{error}</p>}

          <button
            onClick={handleSearch}
            disabled={loading || platforms.length === 0}
            className="rounded-xl border-2 border-[#8B3F4F] bg-[#8B3F4F] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#8B3F4F]/90 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Previous Searches</h2>
          <div className="grid gap-2">
            {pastSearches.map((search) => (
              <div
                key={search.id}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#8B3F4F]/50 hover:shadow-md"
                onClick={() => router.push(`/culture-wire/${search.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-bold uppercase tracking-wide">{search.brand_name}</p>
                    <p className="mt-1 text-xs font-mono text-gray-500">
                      {new Date(search.created_at).toLocaleDateString()} &middot; {search.platforms.join(' / ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-gray-200 text-gray-500">{search.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
