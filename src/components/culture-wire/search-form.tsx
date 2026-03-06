'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

const PLATFORMS = ['reddit', 'tiktok', 'youtube', 'instagram', 'twitter', 'linkedin', 'facebook', 'news'] as const;
const GEOS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'NZ', label: 'New Zealand' },
];

interface SearchFormProps {
  onSearchCreated: (search: CultureWireSearch) => void;
}

export function SearchForm({ onSearchCreated }: SearchFormProps) {
  const [brandName, setBrandName] = useState('');
  const [geo, setGeo] = useState('AU');
  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim() || platforms.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/culture-wire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: brandName.trim(), geo, platforms }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create search');
        return;
      }

      onSearchCreated(data.search);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          New Brand Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Enter brand name (e.g., Nike, Oatly, Patagonia)"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Region</p>
              <div className="flex gap-1">
                {GEOS.map((g) => (
                  <Button
                    key={g.code}
                    type="button"
                    variant={geo === g.code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGeo(g.code)}
                    disabled={loading}
                  >
                    {g.code}
                  </Button>
                ))}
              </div>
            </div>

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
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading || !brandName.trim() || platforms.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting search...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
