'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/culture-wire/categories';
import { InfluencerCard } from '@/components/culture-wire/influencer-card';
import { Loader2 } from 'lucide-react';
import type { InfluencerFeedItem } from '@/lib/culture-wire/influencers';
import { toast } from 'sonner';

export default function InfluencersPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]?.name || '');
  const [influencers, setInfluencers] = useState<InfluencerFeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCategory) return;
    setLoading(true);
    fetch(`/api/culture-wire/influencers?category=${encodeURIComponent(selectedCategory)}`)
      .then((r) => r.json())
      .then((data) => setInfluencers(data.influencers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  async function handleAddToCurated(influencer: InfluencerFeedItem) {
    try {
      const res = await fetch('/api/culture-wire/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: influencer.name,
          handle: influencer.handle,
          platform: influencer.platform,
          category: influencer.category,
          followers: influencer.followers,
          engagement_rate: influencer.engagement_rate,
          geo: influencer.geo,
        }),
      });
      if (res.ok) {
        toast.success(`Added ${influencer.name} to curated list`);
        setSelectedCategory((prev) => prev);
      }
    } catch {
      toast.error('Failed to add influencer');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#8B3F4F]">//</span> Influencer Hub
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover and manage influencers across categories. 3-tier system: Curated (70%) / Discovered AU (20%) / Global (10%)
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.name)}
              className={`border px-2.5 py-1 text-xs uppercase transition-colors ${
                selectedCategory === cat.name
                  ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                  : 'border-gray-200 text-gray-400 hover:text-gray-500'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading influencers...
        </div>
      ) : influencers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
          No influencers found for {selectedCategory}. Run a search to discover new voices.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {influencers.map((inf) => (
            <InfluencerCard
              key={inf.id}
              influencer={inf}
              onAddToCurated={handleAddToCurated}
              showAddButton
            />
          ))}
        </div>
      )}
    </div>
  );
}
