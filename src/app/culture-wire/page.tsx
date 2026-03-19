'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchForm } from '@/components/culture-wire/search-form';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, ArrowRight } from 'lucide-react';
import type { CultureWireSearch } from '@/lib/types';

function statusColor(status: string) {
  switch (status) {
    case 'collecting': return 'border-blue-500 text-blue-400 bg-blue-500/10';
    case 'analyzing': return 'border-amber-500 text-amber-400 bg-amber-500/10';
    case 'complete': return 'border-green-500 text-green-400 bg-green-500/10';
    case 'failed': return 'border-[#8B3F4F] text-[#8B3F4F] bg-[#8B3F4F]/10';
    default: return 'border-gray-200 text-gray-500';
  }
}

type SearchMode = 'brand' | 'category' | 'influencer';

export default function CultureWirePage() {
  const [searches, setSearches] = useState<CultureWireSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/culture-wire')
      .then((r) => r.json())
      .then((data) => setSearches(data.searches || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSearchCreated(search: CultureWireSearch) {
    router.push(`/culture-wire/${search.id}`);
  }

  function handleCardClick(mode: SearchMode) {
    if (mode === 'category') {
      router.push('/culture-wire/categories');
      return;
    }
    if (mode === 'influencer') {
      router.push('/culture-wire/influencers');
      return;
    }
    setSearchMode(mode);
    setTimeout(() => {
      document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  return (
    <div className="-mx-4 -mt-6">
      {/* Hero Section */}
      <section
        className="relative flex min-h-[80vh] items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/home_hero_user_hires_v2.png')" }}
      >
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <p className="text-sm uppercase tracking-[0.2em] font-semibold text-white mb-8"
             style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Alternative Thinking, Shifting Behaviour
          </p>
          <Image
            src="/images/cw-logo-white.svg"
            alt="Culture Wire"
            width={300}
            height={80}
            className="mb-6"
            priority
          />
          <p className="text-2xl font-medium text-white"
             style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Ai-Powered brand intelligence.
          </p>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold text-center mb-4">What do you want to search today?</h2>
          <p className="text-lg text-gray-500 text-center max-w-xl mx-auto mb-12">
            Choose your search type to discover cultural opportunities and brand insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {/* Brand Search Card */}
            <div
              className={`group cursor-pointer rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
                searchMode === 'brand' ? 'border-[#8B3F4F] shadow-lg' : 'border-gray-200 shadow-sm'
              }`}
              onClick={() => handleCardClick('brand')}
            >
              <h3 className="text-2xl font-semibold mb-2">Brand Search</h3>
              <p className="text-gray-500 mb-4">
                Analyse brand-specific conversations and discover strategic opportunities.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
              <div className="rounded-xl overflow-hidden">
                <Image
                  src="/images/brand-search.png"
                  alt="Brand Search"
                  width={400}
                  height={250}
                  className="w-full object-cover"
                />
              </div>
            </div>

            {/* Category Search Card */}
            <div
              className="group cursor-pointer rounded-2xl border border-gray-200 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              onClick={() => handleCardClick('category')}
            >
              <h3 className="text-2xl font-semibold mb-2">Category Search</h3>
              <p className="text-gray-500 mb-4">
                Explore trending cultural themes and category-level insights.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
              <div className="rounded-xl overflow-hidden">
                <Image
                  src="/images/category-search.png"
                  alt="Category Search"
                  width={400}
                  height={250}
                  className="w-full object-cover"
                />
              </div>
            </div>

            {/* Research Agent Card */}
            <div
              className="group cursor-pointer rounded-2xl border border-gray-200 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              onClick={() => router.push('/research')}
            >
              <h3 className="text-2xl font-semibold mb-2">Research Agent</h3>
              <p className="text-gray-500 mb-4">
                Brief the AI to run deep research across platforms and deliver strategic reports.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
              <div className="rounded-xl overflow-hidden">
                <Image
                  src="/images/research-agent.png"
                  alt="Research Agent"
                  width={400}
                  height={250}
                  className="w-full object-cover"
                />
              </div>
            </div>

            {/* Influencer Hub Card */}
            <div
              className="group cursor-pointer rounded-2xl border border-gray-200 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              onClick={() => handleCardClick('influencer')}
            >
              <h3 className="text-2xl font-semibold mb-2">Influencer Hub</h3>
              <p className="text-gray-500 mb-4">
                Browse lead influencers by category and discover partnership opportunities.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-6">
                Learn More <ArrowRight className="h-4 w-4" />
              </span>
              <div className="rounded-xl overflow-hidden">
                <Image
                  src="/images/influencer-hub.png"
                  alt="Influencer Hub"
                  width={400}
                  height={250}
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div id="search-section" className={searchMode === 'brand' ? '' : 'hidden'}>
            <SearchForm onSearchCreated={handleSearchCreated} />
          </div>

          {/* Previous Searches */}
          <div className="mt-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Previous Searches</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : searches.length === 0 ? (
              <p className="text-sm text-gray-500">No searches yet. Start your first brand intelligence search above.</p>
            ) : (
              <div className="grid gap-2">
                {searches.map((search) => (
                  <div
                    key={search.id}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#8B3F4F]/50 hover:shadow-md"
                    onClick={() => router.push(`/culture-wire/${search.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{search.brand_name}</span>
                      <Badge variant="outline" className={statusColor(search.status)}>
                        {search.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(search.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-mono">{search.geo}</span>
                      <span>{search.platforms.join(' / ')}</span>
                      {search.result_summary && (
                        <span className="text-[#A85566]">{search.result_summary.total_items} items</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-900 text-white py-12 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="max-w-md">
            <Image
              src="/images/cw-logo-white.svg"
              alt="Culture Wire"
              width={200}
              height={50}
              className="mb-4"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Culture Wire delivers AI-powered brand intelligence, helping you discover cultural opportunities and strategic insights in real-time.
            </p>
          </div>
          <nav className="flex gap-8 text-sm">
            <a href="/culture-wire" className="text-gray-400 hover:text-white transition-colors">Search History</a>
            <a href="/culture-wire/influencers" className="text-gray-400 hover:text-white transition-colors">Influencer Hub</a>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 flex justify-between text-xs text-gray-500">
          <span>&copy; 2025 Culture Wire. All rights reserved.</span>
          <span>Powered by alt/shift/</span>
        </div>
      </footer>
    </div>
  );
}
