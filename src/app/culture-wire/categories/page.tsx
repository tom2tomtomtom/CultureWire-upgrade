import Link from 'next/link';
import { CATEGORY_GROUPS } from '@/lib/culture-wire/categories';

const GROUP_COLORS: Record<string, string> = {
  'Consumer & Lifestyle': 'border-orange-500 text-orange-400 bg-orange-500/10',
  'Travel & Transport': 'border-blue-500 text-blue-400 bg-blue-500/10',
  'Technology & Digital': 'border-purple-500 text-purple-400 bg-purple-500/10',
  'Health & Wellbeing': 'border-green-500 text-green-400 bg-green-500/10',
  'Purpose & Sustainability': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'Sports & Entertainment': 'border-[#8B3F4F] text-[#8B3F4F] bg-[#8B3F4F]/10',
  'Business & Government': 'border-slate-400 text-slate-400 bg-slate-400/10',
  'Social & Reactive': 'border-pink-500 text-pink-400 bg-pink-500/10',
};

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#8B3F4F]">//</span> Category Search
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse trending content by category. Each category targets Australian social media with curated search terms.
        </p>
      </div>

      {CATEGORY_GROUPS.map((group) => (
        <div key={group.name} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{group.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/culture-wire/categories/${cat.slug}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#8B3F4F]/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-wide">{cat.name}</p>
                    <p className="mt-1 text-xs font-mono text-gray-500">
                      {cat.keywords.length} search terms
                    </p>
                  </div>
                  <span className={`border px-2 py-0.5 text-[10px] font-mono uppercase ${GROUP_COLORS[group.name] || 'border-gray-200 text-gray-500'}`}>
                    {cat.geo_scope.toUpperCase()}
                  </span>
                </div>
                {cat.clients.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cat.clients.slice(0, 3).map((client) => (
                      <span key={client} className="border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                        {client}
                      </span>
                    ))}
                    {cat.clients.length > 3 && (
                      <span className="border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                        +{cat.clients.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
