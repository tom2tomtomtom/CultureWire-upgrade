'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/culture-wire/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfluencerCard } from '@/components/culture-wire/influencer-card';
import { Loader2, Users } from 'lucide-react';
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
        // Refresh
        setSelectedCategory((prev) => prev);
      }
    } catch {
      toast.error('Failed to add influencer');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          Influencer Hub
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover and manage influencers across categories. 3-tier system: Curated (70%) &middot; Discovered AU (20%) &middot; Global (10%)
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.slug}
              variant={selectedCategory === cat.name ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading influencers...
        </div>
      ) : influencers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No influencers found for {selectedCategory}. Run a search to discover new voices.
          </CardContent>
        </Card>
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
