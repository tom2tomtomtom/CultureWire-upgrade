'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

const PLATFORMS = ['reddit', 'tiktok', 'youtube', 'instagram', 'twitter', 'linkedin', 'facebook', 'news'] as const;
const GEOS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'NZ', label: 'New Zealand' },
];

interface SimilarReport {
  id: string;
  brand_name: string;
  geo: string;
  created_at: string;
  user_id: string;
  is_own: boolean;
  platforms: string[];
}

interface SearchFormProps {
  onSearchCreated: (search: CultureWireSearch) => void;
}

export function SearchForm({ onSearchCreated }: SearchFormProps) {
  const [brandName, setBrandName] = useState('');
  const [geo, setGeo] = useState('AU');
  const [platforms, setPlatforms] = useState<string[]>([...PLATFORMS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarReports, setSimilarReports] = useState<SimilarReport[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const checkSimilar = useCallback(async (name: string, geoCode: string) => {
    if (!name || name.trim().length < 2) {
      setSimilarReports([]);
      return;
    }

    setChecking(true);
    try {
      const params = new URLSearchParams({ brandName: name.trim() });
      if (geoCode) params.set('geo', geoCode);
      const res = await fetch(`/api/culture-wire/check-similar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSimilarReports(data.similar || []);
        setDismissed(false);
      }
    } catch {
      // Silently fail - this is a convenience check
    } finally {
      setChecking(false);
    }
  }, []);

  const debouncedCheck = useCallback(
    (name: string, geoCode: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => checkSimilar(name, geoCode), 500);
    },
    [checkSimilar]
  );

  // Re-check when geo changes (if brand name is already entered)
  useEffect(() => {
    if (brandName.trim().length >= 2) {
      debouncedCheck(brandName, geo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
    <div className="border border-[#2a2a38] bg-[#111118]">
      <div className="border-b border-[#2a2a38] px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#888899]">
          New Brand Search
        </h3>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter brand name (e.g., Nike, Oatly, Patagonia)"
            value={brandName}
            onChange={(e) => {
              setBrandName(e.target.value);
              debouncedCheck(e.target.value, geo);
            }}
            onBlur={() => {
              if (brandName.trim().length >= 2) {
                checkSimilar(brandName, geo);
              }
            }}
            required
            disabled={loading}
            className="w-full border border-[#2a2a38] bg-[#0a0a0f] px-4 py-3 text-white placeholder-[#555566] focus:border-[#FF0000] focus:outline-none disabled:opacity-50"
          />

          {checking && (
            <div className="flex items-center gap-2 text-xs text-[#888899]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking for similar reports...
            </div>
          )}

          {!dismissed && similarReports.length > 0 && (
            <div className="border border-amber-500 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Similar {similarReports.length === 1 ? 'report' : 'reports'} found
                </div>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="text-amber-400 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {similarReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between border border-amber-500/30 bg-[#0a0a0f] px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-semibold text-amber-300 uppercase">{report.brand_name}</span>
                    <span className="text-[#888899] mx-2 font-mono text-xs">{report.geo}</span>
                    <span className="text-[#555566] text-xs">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                    {report.is_own && (
                      <span className="ml-2 text-xs text-[#888899]">(your report)</span>
                    )}
                  </div>
                  <a
                    href={`/culture-wire/${report.id}`}
                    className="border border-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-xs text-[#888899] hover:text-white transition-colors uppercase tracking-widest"
              >
                Continue anyway
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#888899]">Region</p>
              <div className="flex gap-1">
                {GEOS.map((g) => (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => setGeo(g.code)}
                    disabled={loading}
                    className={`border px-3 py-1.5 text-xs font-mono uppercase transition-colors ${
                      geo === g.code
                        ? 'border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]'
                        : 'border-[#2a2a38] text-[#888899] hover:border-[#555566] hover:text-white'
                    }`}
                  >
                    {g.code}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#888899]">Platforms</p>
              <div className="flex flex-wrap gap-1">
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
          </div>

          {error && <p className="text-sm text-[#FF0000]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !brandName.trim() || platforms.length === 0}
            className="border-2 border-[#FF0000] bg-[#FF0000] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#FF0000]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
