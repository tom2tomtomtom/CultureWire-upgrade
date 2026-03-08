import Link from 'next/link';
import { CATEGORY_GROUPS } from '@/lib/culture-wire/categories';

const GROUP_COLORS: Record<string, string> = {
  'Consumer & Lifestyle': 'border-orange-500 text-orange-400 bg-orange-500/10',
  'Travel & Transport': 'border-blue-500 text-blue-400 bg-blue-500/10',
  'Technology & Digital': 'border-purple-500 text-purple-400 bg-purple-500/10',
  'Health & Wellbeing': 'border-green-500 text-green-400 bg-green-500/10',
  'Purpose & Sustainability': 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  'Sports & Entertainment': 'border-[#FF0000] text-[#FF0000] bg-[#FF0000]/10',
  'Business & Government': 'border-slate-400 text-slate-400 bg-slate-400/10',
  'Social & Reactive': 'border-pink-500 text-pink-400 bg-pink-500/10',
};

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          <span className="text-[#FF0000]">//</span> Category Search
        </h1>
        <p className="mt-1 text-sm text-[#888899]">
          Browse trending content by category. Each category targets Australian social media with curated search terms.
        </p>
      </div>

      {CATEGORY_GROUPS.map((group) => (
        <div key={group.name} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#888899]">{group.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/culture-wire/categories/${cat.slug}`}
                className="block border border-[#2a2a38] bg-[#111118] p-4 transition-colors hover:border-[#FF0000]/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-wide">{cat.name}</p>
                    <p className="mt-1 text-xs font-mono text-[#888899]">
                      {cat.keywords.length} search terms
                    </p>
                  </div>
                  <span className={`border px-2 py-0.5 text-[10px] font-mono uppercase ${GROUP_COLORS[group.name] || 'border-[#2a2a38] text-[#888899]'}`}>
                    {cat.geo_scope.toUpperCase()}
                  </span>
                </div>
                {cat.clients.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cat.clients.slice(0, 3).map((client) => (
                      <span key={client} className="border border-[#2a2a38] px-1.5 py-0.5 text-[10px] font-mono text-[#555566]">
                        {client}
                      </span>
                    ))}
                    {cat.clients.length > 3 && (
                      <span className="border border-[#2a2a38] px-1.5 py-0.5 text-[10px] font-mono text-[#555566]">
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
