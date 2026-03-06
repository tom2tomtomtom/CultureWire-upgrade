'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/culture-wire/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, ArrowLeft } from 'lucide-react';
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
    // Load past category searches for this slug
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
        <p className="text-muted-foreground">Category not found.</p>
        <Button variant="outline" onClick={() => router.push('/culture-wire/categories')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to categories
        </Button>
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
        <Button variant="ghost" size="sm" onClick={() => router.push('/culture-wire/categories')} className="mb-2">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Categories
        </Button>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {category.group} &middot; {category.geo_scope.toUpperCase()} &middot; {category.keywords.length} search terms
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {category.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Run Category Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Platforms</p>
            <div className="flex gap-1">
              {PLATFORMS.map((p) => (
                <Badge
                  key={p}
                  variant={platforms.includes(p) ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => !loading && togglePlatform(p)}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSearch} disabled={loading || platforms.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Search {category.name}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {!loadingHistory && pastSearches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Previous Searches</h2>
          <div className="grid gap-2">
            {pastSearches.map((search) => (
              <Card
                key={search.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => router.push(`/culture-wire/${search.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="text-sm">
                    <p className="font-medium">{search.brand_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(search.created_at).toLocaleDateString()} &middot; {search.platforms.join(', ')}
                    </p>
                  </div>
                  <Badge variant="secondary">{search.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
