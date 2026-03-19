'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
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
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/culture-wire" className="flex items-center gap-2">
            <Image src="/images/cw-logo-black.svg" alt="Culture Wire" width={120} height={32} priority />
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
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                pathname === '/culture-wire' || pathname === '/'
                  ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Brand
            </Link>
            <Link
              href="/culture-wire/categories"
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                pathname.startsWith('/culture-wire/categories')
                  ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Categories
            </Link>
            <Link
              href="/project"
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                pathname.startsWith('/project')
                  ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Research
            </Link>
            <Link
              href="/culture-wire/influencers"
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                pathname.startsWith('/culture-wire/influencers')
                  ? 'border-[#8B3F4F] bg-[#8B3F4F]/10 text-[#8B3F4F]'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
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
