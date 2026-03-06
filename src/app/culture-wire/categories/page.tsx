'use client';

import { useRouter } from 'next/navigation';
import { CATEGORY_GROUPS } from '@/lib/culture-wire/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3X3 } from 'lucide-react';

const GROUP_COLORS: Record<string, string> = {
  'Consumer & Lifestyle': 'bg-orange-500/10 text-orange-600',
  'Travel & Transport': 'bg-blue-500/10 text-blue-600',
  'Technology & Digital': 'bg-purple-500/10 text-purple-600',
  'Health & Wellbeing': 'bg-green-500/10 text-green-600',
  'Purpose & Sustainability': 'bg-emerald-500/10 text-emerald-600',
  'Sports & Entertainment': 'bg-red-500/10 text-red-600',
  'Business & Government': 'bg-slate-500/10 text-slate-600',
  'Social & Reactive': 'bg-pink-500/10 text-pink-600',
};

export default function CategoriesPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Grid3X3 className="h-6 w-6" />
          Category Search
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse trending content by category. Each category targets Australian social media with curated search terms.
        </p>
      </div>

      {CATEGORY_GROUPS.map((group) => (
        <div key={group.name} className="space-y-3">
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.categories.map((cat) => (
              <Card
                key={cat.slug}
                className="cursor-pointer transition-all hover:shadow-md hover:bg-accent/50"
                onClick={() => router.push(`/culture-wire/categories/${cat.slug}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cat.keywords.length} search terms
                      </p>
                    </div>
                    <Badge variant="secondary" className={GROUP_COLORS[group.name] || ''}>
                      {cat.geo_scope.toUpperCase()}
                    </Badge>
                  </div>
                  {cat.clients.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cat.clients.slice(0, 3).map((client) => (
                        <Badge key={client} variant="outline" className="text-[10px]">
                          {client}
                        </Badge>
                      ))}
                      {cat.clients.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{cat.clients.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
