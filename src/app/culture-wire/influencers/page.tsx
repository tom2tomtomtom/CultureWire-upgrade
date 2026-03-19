'use client';

import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';

interface SheetInfluencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  category: string;
  tier: string;
  tier_display: string;
  tier_color: string;
  followers: number | null;
  engagement_rate: number | null;
  geo: string | null;
  profile_url: string;
}

function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    tiktok: '♪',
    instagram: '◻',
    youtube: '▶',
    twitter: '𝕏',
  };
  return icons[platform] || '○';
}

export default function InfluencersPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [influencers, setInfluencers] = useState<SheetInfluencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

  // Load categories on mount
  useEffect(() => {
    fetch('/api/culture-wire/influencers')
      .then((r) => r.json())
      .then((data) => {
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0]);
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCats(false));
  }, []);

  // Load influencers when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    setLoading(true);
    fetch(`/api/culture-wire/influencers?category=${encodeURIComponent(selectedCategory)}`)
      .then((r) => r.json())
      .then((data) => setInfluencers(data.influencers || []))
      .catch(() => toast.error('Failed to load influencers'))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#8B3F4F]">//</span> Influencer Hub
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Curated influencer list sourced from Google Sheets. {influencers.length > 0 && `${influencers.length} influencers in ${selectedCategory}.`}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Category</p>
        {loadingCats ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading categories...
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`border px-2.5 py-1 text-xs uppercase transition-colors rounded ${
                  selectedCategory === cat
                    ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                    : 'border-gray-200 text-gray-400 hover:text-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading influencers...
        </div>
      ) : influencers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          No influencers found for {selectedCategory}.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {influencers.map((inf) => (
            <div
              key={inf.id}
              className="group border border-gray-200 bg-white p-4 transition-all hover:border-[#8B3F4F]/50 rounded-xl shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-200 bg-gray-50 text-lg font-mono rounded-lg">
                    {platformIcon(inf.platform)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-wide text-gray-900">{inf.name}</p>
                    <p className="text-xs font-mono text-gray-500 truncate">@{inf.handle}</p>
                  </div>
                </div>
                {inf.profile_url && (
                  <a
                    href={inf.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 flex items-center justify-center border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:border-[#8B3F4F] hover:text-[#8B3F4F] rounded-lg"
                    title="View profile"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-mono uppercase">
                  <Users className="h-3 w-3" />
                  {inf.geo || 'AU'}
                </span>
                <span className="ml-auto uppercase font-bold tracking-wide text-gray-900">{inf.platform}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
