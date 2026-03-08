'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Grid3X3, Users, MessageSquare } from 'lucide-react';
import { UserMenu } from '@/components/auth/user-menu';
import { ApifyCreditBadge } from '@/components/layout/apify-credit-badge';
import { cn } from '@/lib/utils';

export function NavHeader({ email }: { email: string | null }) {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'degraded' | 'unhealthy'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    fetch('/api/health', { signal: controller.signal })
      .then(res => res.json())
      .then(data => setHealthStatus(data.status || 'unhealthy'))
      .catch(() => setHealthStatus('unhealthy'))
      .finally(() => clearTimeout(timeoutId));
    return () => { controller.abort(); clearTimeout(timeoutId); };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#FF0000] bg-[#0a0a0f]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/culture-wire" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white uppercase">
              AIDEN
            </span>
            <span className="text-lg font-light tracking-tight text-[#888899] uppercase">
              // Listen
            </span>
            <span className={cn('ml-2 inline-block h-2 w-2 rounded-full', {
              'bg-gray-500': healthStatus === 'loading',
              'bg-green-500': healthStatus === 'healthy',
              'bg-amber-500': healthStatus === 'degraded',
              'bg-red-500': healthStatus === 'unhealthy',
            })} title={`System: ${healthStatus}`} />
          </Link>
          <nav className="flex items-center gap-0.5">
            <Link
              href="/culture-wire"
              className={cn(
                'flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                pathname === '/culture-wire' || pathname === '/'
                  ? 'border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]'
                  : 'border-transparent text-[#888899] hover:text-white hover:border-[#2a2a38]'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </Link>
            <Link
              href="/culture-wire/categories"
              className={cn(
                'flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                pathname.startsWith('/culture-wire/categories')
                  ? 'border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]'
                  : 'border-transparent text-[#888899] hover:text-white hover:border-[#2a2a38]'
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Categories
            </Link>
            <Link
              href="/project/new"
              className={cn(
                'flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                pathname.startsWith('/project')
                  ? 'border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]'
                  : 'border-transparent text-[#888899] hover:text-white hover:border-[#2a2a38]'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Research
            </Link>
            <Link
              href="/culture-wire/influencers"
              className={cn(
                'flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                pathname.startsWith('/culture-wire/influencers')
                  ? 'border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]'
                  : 'border-transparent text-[#888899] hover:text-white hover:border-[#2a2a38]'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Influencers
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ApifyCreditBadge />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
